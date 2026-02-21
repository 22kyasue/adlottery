-- Phase 3: Booster multiplier on OUTPUT
-- Tracks fractional ticket accumulation from 1.5x booster multiplier

ALTER TABLE weekly_tickets
ADD COLUMN IF NOT EXISTS booster_bonus_fractional numeric(10,4) DEFAULT 0;

-- New RPC: awards tickets with a multiplier, accumulating fractional remainder
-- When multiplier=1.0: adds 1 whole ticket (same as before)
-- When multiplier=1.5: adds 1.5 to accumulator, awards floor(pending) whole tickets
CREATE OR REPLACE FUNCTION increment_tickets_with_multiplier(
    p_user_id uuid,
    p_week_id text,
    p_multiplier numeric DEFAULT 1.0
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pending numeric;
    v_whole integer;
    v_new_organic integer;
BEGIN
    -- Upsert weekly_tickets row
    INSERT INTO weekly_tickets (user_id, week_id, organic_tickets, converted_tickets, booster_bonus_fractional)
    VALUES (p_user_id, p_week_id, 0, 0, 0)
    ON CONFLICT (user_id, week_id) DO NOTHING;

    -- Lock the row, add multiplier to fractional accumulator
    SELECT booster_bonus_fractional + p_multiplier INTO v_pending
    FROM weekly_tickets
    WHERE user_id = p_user_id AND week_id = p_week_id
    FOR UPDATE;

    -- Extract whole tickets from accumulator
    v_whole := FLOOR(v_pending);

    -- Award whole tickets, store fractional remainder
    UPDATE weekly_tickets
    SET organic_tickets = organic_tickets + v_whole,
        booster_bonus_fractional = v_pending - v_whole
    WHERE user_id = p_user_id AND week_id = p_week_id
    RETURNING organic_tickets INTO v_new_organic;

    RETURN v_new_organic;
END;
$$;
