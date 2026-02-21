-- 009_offer_wall.sql
-- Offer Wall: click tracking, completion tracking, and atomic award RPC

-- ─── offer_clicks: tracks user clicking GET (powers "Pending" UI state) ─────
CREATE TABLE IF NOT EXISTS offer_clicks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  offer_id TEXT NOT NULL,
  clicked_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_offer_clicks_user_offer
  ON offer_clicks (user_id, offer_id);

ALTER TABLE offer_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own offer clicks"
  ON offer_clicks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own offer clicks"
  ON offer_clicks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ─── offer_completions: webhook-confirmed completions (source of truth) ──────
CREATE TABLE IF NOT EXISTS offer_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  offer_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_transaction_id TEXT NOT NULL,
  reward_type TEXT NOT NULL DEFAULT 'tickets',
  reward_amount INT NOT NULL,
  awarded_at TIMESTAMPTZ DEFAULT now(),
  raw_params JSONB DEFAULT '{}'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_offer_completions_txn
  ON offer_completions (provider_transaction_id);

CREATE INDEX IF NOT EXISTS idx_offer_completions_user
  ON offer_completions (user_id);

ALTER TABLE offer_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own offer completions"
  ON offer_completions FOR SELECT
  USING (auth.uid() = user_id);

-- ─── award_offer_completion RPC ─────────────────────────────────────────────
-- Atomic: dedup check → award → cleanup click
CREATE OR REPLACE FUNCTION award_offer_completion(
  p_user_id UUID,
  p_offer_id TEXT,
  p_provider TEXT,
  p_provider_transaction_id TEXT,
  p_reward_type TEXT DEFAULT 'tickets',
  p_reward_amount INT DEFAULT 0,
  p_raw_params JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inserted BOOLEAN;
  v_week_id TEXT;
BEGIN
  -- Attempt insert (dedup on provider_transaction_id)
  INSERT INTO offer_completions (user_id, offer_id, provider, provider_transaction_id, reward_type, reward_amount, raw_params)
  VALUES (p_user_id, p_offer_id, p_provider, p_provider_transaction_id, p_reward_type, p_reward_amount, p_raw_params)
  ON CONFLICT (provider_transaction_id) DO NOTHING;

  -- Check if the row was actually inserted
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF NOT v_inserted THEN
    RETURN jsonb_build_object('success', true, 'already_awarded', true);
  END IF;

  -- Award based on reward type
  IF p_reward_type = 'tickets' THEN
    v_week_id := to_char(now() AT TIME ZONE 'UTC', 'IYYY"-W"IW');
    INSERT INTO weekly_tickets (user_id, week_id, organic_tickets, converted_tickets)
    VALUES (p_user_id, v_week_id, p_reward_amount, 0)
    ON CONFLICT (user_id, week_id)
    DO UPDATE SET organic_tickets = weekly_tickets.organic_tickets + p_reward_amount;
  ELSIF p_reward_type = 'chips' THEN
    UPDATE users SET vibe_chips = vibe_chips + p_reward_amount WHERE id = p_user_id;
  END IF;

  -- Cleanup the pending click state
  DELETE FROM offer_clicks WHERE user_id = p_user_id AND offer_id = p_offer_id;

  RETURN jsonb_build_object('success', true, 'already_awarded', false);
END;
$$;
