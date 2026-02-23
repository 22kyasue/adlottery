-- Migration 017: Individual numbered lottery tickets
-- Changes from weighted-probability draw to numbered-ticket draw.
-- Each ticket earned gets a unique sequential number for that week.
-- Draw: pick random number 1–total_tickets → find owner → winner.

-- ─── Tables ──────────────────────────────────────────────────────────────────

-- One row per ticket, with a sequential number unique within each week
CREATE TABLE IF NOT EXISTS lottery_tickets (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID        NOT NULL REFERENCES users(id),
    week_id       TEXT        NOT NULL,
    ticket_number INT         NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (week_id, ticket_number)
);

CREATE INDEX IF NOT EXISTS idx_lottery_tickets_user_week
    ON lottery_tickets (user_id, week_id);

CREATE INDEX IF NOT EXISTS idx_lottery_tickets_number
    ON lottery_tickets (week_id, ticket_number);

ALTER TABLE lottery_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lottery tickets"
    ON lottery_tickets FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- ─── Per-week sequential counter ─────────────────────────────────────────────
-- next_number is always (highest assigned number + 1).
-- Total tickets issued = next_number - 1.

CREATE TABLE IF NOT EXISTS lottery_ticket_counters (
    week_id     TEXT PRIMARY KEY,
    next_number INT  NOT NULL DEFAULT 1
);

-- ─── RPC: assign_lottery_tickets ─────────────────────────────────────────────
-- Atomically claims p_count sequential ticket numbers and inserts rows.
-- Returns the array of numbers assigned (first..first+p_count-1).

CREATE OR REPLACE FUNCTION assign_lottery_tickets(
    p_user_id UUID,
    p_week_id TEXT,
    p_count   INT
)
RETURNS INT[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start INT;
BEGIN
    IF p_count <= 0 THEN
        RETURN ARRAY[]::INT[];
    END IF;

    -- Advance counter atomically and capture the start of our batch.
    -- On first use for this week: inserts with next_number = 1 + p_count → start = 1.
    -- On subsequent uses:         updates next_number += p_count  → start = old next_number.
    INSERT INTO lottery_ticket_counters (week_id, next_number)
    VALUES (p_week_id, 1 + p_count)
    ON CONFLICT (week_id) DO UPDATE
        SET next_number = lottery_ticket_counters.next_number + p_count
    RETURNING next_number - p_count INTO v_start;

    -- Bulk-insert the ticket rows
    INSERT INTO lottery_tickets (user_id, week_id, ticket_number)
    SELECT p_user_id, p_week_id, n
    FROM generate_series(v_start, v_start + p_count - 1) AS n;

    RETURN ARRAY(SELECT generate_series(v_start, v_start + p_count - 1));
END;
$$;

-- ─── Updated: increment_tickets_with_multiplier ───────────────────────────────
-- Added: calls assign_lottery_tickets for every whole ticket awarded.

CREATE OR REPLACE FUNCTION increment_tickets_with_multiplier(
    p_user_id   uuid,
    p_week_id   text,
    p_multiplier numeric DEFAULT 1.0
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pending    numeric;
    v_whole      integer;
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
    SET organic_tickets          = organic_tickets + v_whole,
        booster_bonus_fractional = v_pending - v_whole
    WHERE user_id = p_user_id AND week_id = p_week_id
    RETURNING organic_tickets INTO v_new_organic;

    -- Assign numbered lottery tickets for any whole tickets awarded
    IF v_whole > 0 THEN
        PERFORM assign_lottery_tickets(p_user_id, p_week_id, v_whole);
    END IF;

    RETURN v_new_organic;
END;
$$;

-- ─── Updated: convert_chips_to_tickets ────────────────────────────────────────
-- Added: calls assign_lottery_tickets for converted tickets.

CREATE OR REPLACE FUNCTION convert_chips_to_tickets(
    p_user_id uuid,
    p_week_id text,
    p_amount  int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_chips       int;
    v_global_organic   bigint;
    v_global_converted bigint;
    v_cap_limit        bigint;
    v_remaining_cap    bigint;
    v_new_converted    int;
    v_new_chips        int;
BEGIN
    -- 1. Lock and read the user's chip balance (prevents double-spend)
    SELECT vibe_chips INTO v_user_chips FROM users WHERE id = p_user_id FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'user_not_found');
    END IF;

    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('error', 'invalid_amount');
    END IF;

    IF v_user_chips < p_amount THEN
        RETURN jsonb_build_object('error', 'insufficient_chips', 'have', v_user_chips, 'need', p_amount);
    END IF;

    -- 2. Compute global organic and converted totals for this week
    SELECT
        COALESCE(SUM(organic_tickets),   0),
        COALESCE(SUM(converted_tickets), 0)
    INTO v_global_organic, v_global_converted
    FROM weekly_tickets
    WHERE week_id = p_week_id;

    -- 3. Enforce the 30% cap
    v_cap_limit     := FLOOR(v_global_organic::numeric * 0.30);
    v_remaining_cap := GREATEST(v_cap_limit - v_global_converted, 0);

    IF v_remaining_cap <= 0 THEN
        RETURN jsonb_build_object(
            'error', 'cap_reached',
            'global_organic', v_global_organic,
            'global_converted', v_global_converted,
            'cap_limit', v_cap_limit,
            'remaining_cap', 0
        );
    END IF;

    IF p_amount > v_remaining_cap THEN
        RETURN jsonb_build_object(
            'error', 'exceeds_cap',
            'requested', p_amount,
            'remaining_cap', v_remaining_cap,
            'global_organic', v_global_organic,
            'global_converted', v_global_converted,
            'cap_limit', v_cap_limit
        );
    END IF;

    -- 4. Deduct chips
    v_new_chips := v_user_chips - p_amount;
    UPDATE users SET vibe_chips = v_new_chips, updated_at = NOW() WHERE id = p_user_id;

    -- 5. Upsert converted tickets
    INSERT INTO weekly_tickets (user_id, week_id, organic_tickets, converted_tickets)
    VALUES (p_user_id, p_week_id, 0, p_amount)
    ON CONFLICT (user_id, week_id) DO UPDATE
        SET converted_tickets = weekly_tickets.converted_tickets + p_amount,
            updated_at        = NOW()
    RETURNING converted_tickets INTO v_new_converted;

    -- 6. Assign numbered lottery tickets
    PERFORM assign_lottery_tickets(p_user_id, p_week_id, p_amount);

    -- 7. Return success
    RETURN jsonb_build_object(
        'success',          true,
        'chips_spent',      p_amount,
        'new_chips',        v_new_chips,
        'new_converted',    v_new_converted,
        'global_organic',   v_global_organic,
        'global_converted', v_global_converted + p_amount,
        'cap_limit',        v_cap_limit,
        'remaining_cap',    v_remaining_cap - p_amount
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('error', 'internal_error', 'detail', SQLERRM);
END;
$$;

-- ─── Rewritten: select_weekly_winner ─────────────────────────────────────────
-- Picks a random number 1–total_tickets, looks up the owner in lottery_tickets.
-- Always produces exactly one winner (as long as any tickets were issued).

CREATE OR REPLACE FUNCTION select_weekly_winner(p_week_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_tickets   INT;
    v_prize           INT;
    v_winning_number  INT;
    v_winner_id       UUID;
    v_draw_id         UUID;
    v_has_payout_method BOOLEAN;
BEGIN
    -- Prevent double-draw for same week
    IF EXISTS (SELECT 1 FROM weekly_draw_results WHERE week_id = p_week_id) THEN
        RETURN jsonb_build_object(
            'error', 'Draw already completed for this week',
            'week_id', p_week_id
        );
    END IF;

    -- Total tickets = highest sequential number issued this week
    SELECT next_number - 1 INTO v_total_tickets
    FROM lottery_ticket_counters
    WHERE week_id = p_week_id;

    IF v_total_tickets IS NULL OR v_total_tickets = 0 THEN
        RETURN jsonb_build_object(
            'error', 'No tickets for this week',
            'week_id', p_week_id
        );
    END IF;

    -- Get prize pool
    SELECT COALESCE(total_pool, base_amount) INTO v_prize
    FROM weekly_prize_pool
    WHERE week_id = p_week_id;

    IF v_prize IS NULL THEN
        v_prize := 1250000; -- fallback default
    END IF;

    -- Pick the winning ticket number (always valid: 1 ≤ n ≤ total_tickets)
    v_winning_number := floor(random() * v_total_tickets)::INT + 1;

    -- Look up the owner
    SELECT user_id INTO v_winner_id
    FROM lottery_tickets
    WHERE week_id = p_week_id AND ticket_number = v_winning_number;

    IF v_winner_id IS NULL THEN
        -- Should never happen if lottery_tickets is consistent with the counter
        RETURN jsonb_build_object(
            'error', 'Winner lookup failed — ticket #' || v_winning_number || ' has no owner'
        );
    END IF;

    -- Record the draw result
    INSERT INTO weekly_draw_results
        (week_id, winner_user_id, winning_ticket_number, total_tickets, prize_amount)
    VALUES
        (p_week_id, v_winner_id, v_winning_number, v_total_tickets, v_prize)
    RETURNING id INTO v_draw_id;

    -- Check if winner has payout method set up
    SELECT (paypal_email IS NOT NULL OR wise_email IS NOT NULL) INTO v_has_payout_method
    FROM users WHERE id = v_winner_id;

    IF v_has_payout_method THEN
        INSERT INTO pending_payouts (user_id, week_id, amount, status)
        VALUES (v_winner_id, p_week_id, v_prize, 'ready');
    ELSE
        INSERT INTO pending_payouts (user_id, week_id, amount, status)
        VALUES (v_winner_id, p_week_id, v_prize, 'pending');
    END IF;

    RETURN jsonb_build_object(
        'success',               true,
        'draw_id',               v_draw_id,
        'week_id',               p_week_id,
        'winner_user_id',        v_winner_id,
        'winning_ticket_number', v_winning_number,
        'total_tickets',         v_total_tickets,
        'prize_amount',          v_prize,
        'payout_status',         CASE WHEN v_has_payout_method THEN 'ready' ELSE 'pending' END
    );
END;
$$;

-- ─── Backfill note ────────────────────────────────────────────────────────────
-- If you have existing weekly_tickets rows (from testing), run this to backfill
-- lottery_tickets for them (assigns numbers in user_id order, same as old logic):
--
-- DO $$
-- DECLARE r RECORD;
-- BEGIN
--   FOR r IN
--     SELECT user_id, week_id, (organic_tickets + converted_tickets) AS total
--     FROM weekly_tickets
--     WHERE (organic_tickets + converted_tickets) > 0
--     ORDER BY week_id, user_id
--   LOOP
--     IF r.total > 0 THEN
--       PERFORM assign_lottery_tickets(r.user_id, r.week_id, r.total);
--     END IF;
--   END LOOP;
-- END;
-- $$;
