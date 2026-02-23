-- Migration 014: Payment History
-- Adds payment metadata columns to pending_payouts and an RPC to mark payouts as paid.

ALTER TABLE pending_payouts ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE pending_payouts ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE pending_payouts ADD COLUMN IF NOT EXISTS transaction_id TEXT;

-- RPC: Mark a payout as paid (only ready → paid transition allowed)
CREATE OR REPLACE FUNCTION mark_payout_paid(
    p_payout_id UUID,
    p_payment_method TEXT DEFAULT NULL,
    p_transaction_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_status TEXT;
BEGIN
    -- Lock the row
    SELECT status INTO v_current_status
    FROM pending_payouts
    WHERE id = p_payout_id
    FOR UPDATE;

    IF v_current_status IS NULL THEN
        RETURN jsonb_build_object('error', 'Payout not found');
    END IF;

    IF v_current_status <> 'ready' THEN
        RETURN jsonb_build_object('error', 'Only ready payouts can be marked as paid, current status: ' || v_current_status);
    END IF;

    UPDATE pending_payouts
    SET status = 'paid',
        paid_at = now(),
        payment_method = p_payment_method,
        transaction_id = p_transaction_id
    WHERE id = p_payout_id;

    RETURN jsonb_build_object(
        'success', true,
        'payout_id', p_payout_id,
        'paid_at', now()
    );
END;
$$;
