-- Migration 012: Pending Payouts (Grace Period)
-- When a user wins the jackpot but hasn't set up payout info,
-- their prize is held for 14 days before expiring.

CREATE TABLE IF NOT EXISTS pending_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_id TEXT NOT NULL,
    amount INT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'ready', 'expired', 'paid')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast user lookups
CREATE INDEX idx_pending_payouts_user_id ON pending_payouts(user_id);
CREATE INDEX idx_pending_payouts_status ON pending_payouts(status);

-- RLS
ALTER TABLE pending_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pending payouts"
    ON pending_payouts FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- RPC: Promote all pending payouts to 'ready' when user sets up payout method
CREATE OR REPLACE FUNCTION promote_pending_payouts(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_count INT;
BEGIN
    UPDATE pending_payouts
    SET status = 'ready'
    WHERE user_id = p_user_id
      AND status = 'pending'
      AND expires_at > now();

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$;

-- RPC: Expire overdue pending payouts (call from cron or admin)
CREATE OR REPLACE FUNCTION expire_overdue_payouts()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expired_count INT;
BEGIN
    UPDATE pending_payouts
    SET status = 'expired'
    WHERE status = 'pending'
      AND expires_at <= now();

    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$;
