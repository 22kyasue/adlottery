-- Migration 013: Weekly Draw System
-- Winner selection, draw results history, and prize distribution

-- Draw results table
CREATE TABLE IF NOT EXISTS weekly_draw_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_id TEXT NOT NULL UNIQUE,
    winner_user_id UUID REFERENCES users(id),
    winning_ticket_number INT NOT NULL,
    total_tickets INT NOT NULL,
    prize_amount INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_weekly_draw_results_week ON weekly_draw_results(week_id);
CREATE INDEX idx_weekly_draw_results_winner ON weekly_draw_results(winner_user_id);

-- RLS: anyone authenticated can see draw results (public transparency)
ALTER TABLE weekly_draw_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view draw results"
    ON weekly_draw_results FOR SELECT
    TO authenticated
    USING (true);

-- RPC: select_weekly_winner
-- Picks a random winner weighted by ticket count.
-- Each user's total tickets (organic + converted) = their weight.
-- Returns draw result as JSONB.
CREATE OR REPLACE FUNCTION select_weekly_winner(p_week_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_tickets INT;
    v_prize INT;
    v_winning_number INT;
    v_running_sum INT := 0;
    v_winner_id UUID;
    v_draw_id UUID;
    v_row RECORD;
    v_has_payout_method BOOLEAN;
BEGIN
    -- Prevent double-draw for same week
    IF EXISTS (SELECT 1 FROM weekly_draw_results WHERE week_id = p_week_id) THEN
        RETURN jsonb_build_object(
            'error', 'Draw already completed for this week',
            'week_id', p_week_id
        );
    END IF;

    -- Get total ticket count across all users for this week
    SELECT COALESCE(SUM(organic_tickets + converted_tickets), 0)
    INTO v_total_tickets
    FROM weekly_tickets
    WHERE week_id = p_week_id
      AND (organic_tickets + converted_tickets) > 0;

    IF v_total_tickets = 0 THEN
        RETURN jsonb_build_object(
            'error', 'No tickets for this week',
            'week_id', p_week_id
        );
    END IF;

    -- Get prize pool
    SELECT COALESCE(total_pool, base_amount)
    INTO v_prize
    FROM weekly_prize_pool
    WHERE week_id = p_week_id;

    IF v_prize IS NULL THEN
        v_prize := 1250000; -- fallback default
    END IF;

    -- Pick random ticket number (1-based)
    v_winning_number := floor(random() * v_total_tickets)::INT + 1;

    -- Walk through users ordered by id, accumulating ticket counts
    -- until we pass the winning number
    FOR v_row IN
        SELECT user_id, (organic_tickets + converted_tickets) AS tickets
        FROM weekly_tickets
        WHERE week_id = p_week_id
          AND (organic_tickets + converted_tickets) > 0
        ORDER BY user_id
    LOOP
        v_running_sum := v_running_sum + v_row.tickets;
        IF v_running_sum >= v_winning_number THEN
            v_winner_id := v_row.user_id;
            EXIT;
        END IF;
    END LOOP;

    -- Safety check
    IF v_winner_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Winner selection failed');
    END IF;

    -- Record the draw result
    INSERT INTO weekly_draw_results (week_id, winner_user_id, winning_ticket_number, total_tickets, prize_amount)
    VALUES (p_week_id, v_winner_id, v_winning_number, v_total_tickets, v_prize)
    RETURNING id INTO v_draw_id;

    -- Check if winner has payout method set up
    SELECT (paypal_email IS NOT NULL OR wise_email IS NOT NULL)
    INTO v_has_payout_method
    FROM users
    WHERE id = v_winner_id;

    IF v_has_payout_method THEN
        -- Winner has payout info → create as 'ready'
        INSERT INTO pending_payouts (user_id, week_id, amount, status)
        VALUES (v_winner_id, p_week_id, v_prize, 'ready');
    ELSE
        -- Winner needs to set up payout → create as 'pending' with 14-day grace
        INSERT INTO pending_payouts (user_id, week_id, amount, status)
        VALUES (v_winner_id, p_week_id, v_prize, 'pending');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'draw_id', v_draw_id,
        'week_id', p_week_id,
        'winner_user_id', v_winner_id,
        'winning_ticket_number', v_winning_number,
        'total_tickets', v_total_tickets,
        'prize_amount', v_prize,
        'payout_status', CASE WHEN v_has_payout_method THEN 'ready' ELSE 'pending' END
    );
END;
$$;
