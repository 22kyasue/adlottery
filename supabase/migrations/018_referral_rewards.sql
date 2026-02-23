-- Migration 018: Referral reward system
-- Referrer: 1 week booster extension + 50 chips
-- Referee:  50 chips on first login after signup
-- Each user can only be referred once (UNIQUE on referee_id)

CREATE TABLE IF NOT EXISTS referral_rewards (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID        NOT NULL REFERENCES users(id),
    referee_id  UUID        NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (referee_id)  -- one referral per new user, ever
);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON referral_rewards(referrer_id);

ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

-- Users can see referrals they made (for future "my referrals" feature)
CREATE POLICY "Users can view own referrals"
    ON referral_rewards FOR SELECT
    TO authenticated
    USING (auth.uid() = referrer_id);

-- ─── RPC: process_referral ────────────────────────────────────────────────────
-- Called once per new user after their first login.
-- p_referral_code = first 8 chars of referrer UUID (uppercase)
-- Returns success or a descriptive error (already_processed, invalid_code, self_referral)

CREATE OR REPLACE FUNCTION process_referral(
    p_referee_id   UUID,
    p_referral_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_referrer_id      UUID;
    v_booster_expires  TIMESTAMPTZ;
BEGIN
    -- Already processed for this user?
    IF EXISTS (SELECT 1 FROM referral_rewards WHERE referee_id = p_referee_id) THEN
        RETURN jsonb_build_object('error', 'already_processed');
    END IF;

    -- Find referrer by code (first 8 chars of UUID, case-insensitive)
    SELECT id INTO v_referrer_id
    FROM users
    WHERE upper(left(id::text, 8)) = upper(p_referral_code)
    LIMIT 1;

    IF v_referrer_id IS NULL THEN
        RETURN jsonb_build_object('error', 'invalid_code');
    END IF;

    -- Prevent self-referral
    IF v_referrer_id = p_referee_id THEN
        RETURN jsonb_build_object('error', 'self_referral');
    END IF;

    -- Award referee: 50 chips
    UPDATE users
    SET vibe_chips = vibe_chips + 50,
        updated_at = now()
    WHERE id = p_referee_id;

    -- Calculate referrer booster expiry:
    -- Extend existing active booster OR start fresh from now — whichever is later + 7 days
    SELECT GREATEST(COALESCE(booster_expires_at, now()), now()) + INTERVAL '7 days'
    INTO v_booster_expires
    FROM users
    WHERE id = v_referrer_id;

    -- Award referrer: 50 chips + 1 week booster
    UPDATE users
    SET vibe_chips        = vibe_chips + 50,
        is_booster_active = true,
        booster_expires_at = v_booster_expires,
        updated_at        = now()
    WHERE id = v_referrer_id;

    -- Record so it can never be processed again
    INSERT INTO referral_rewards (referrer_id, referee_id)
    VALUES (v_referrer_id, p_referee_id);

    RETURN jsonb_build_object(
        'success',        true,
        'referrer_id',    v_referrer_id,
        'referee_chips',  50,
        'referrer_chips', 50,
        'booster_days',   7
    );
END;
$$;
