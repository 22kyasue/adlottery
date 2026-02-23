-- Migration 015: Missing play_roulette_multi RPC + performance indexes
-- play_roulette_multi handles the multi-bet roulette spin (up to 3 color bets per spin).
-- Also adds missing indexes flagged by production audit.

-- =============================================================================
-- play_roulette_multi(p_user_id, p_bets jsonb)
-- p_bets: [{"color":"red","bet":50},{"color":"gold","bet":25}]
-- Wheel: black 45%, red 30%, gold 5%, dead 20%
-- Payouts: black=2x, red=3x, gold=10x
-- =============================================================================
CREATE OR REPLACE FUNCTION play_roulette_multi(p_user_id UUID, p_bets JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_chips INT;
    v_total_bet INT := 0;
    v_total_payout INT := 0;
    v_roll FLOAT;
    v_result_color TEXT;
    v_bet RECORD;
    v_bet_color TEXT;
    v_bet_amount INT;
    v_multiplier INT;
    v_won BOOLEAN;
    v_payout INT;
    v_any_won BOOLEAN := FALSE;
    v_bets_result JSONB := '[]'::JSONB;
    v_seen_colors TEXT[] := '{}';
    v_valid_colors TEXT[] := ARRAY['black', 'red', 'gold'];
BEGIN
    -- Validate bets array
    IF p_bets IS NULL OR jsonb_array_length(p_bets) < 1 THEN
        RETURN jsonb_build_object('error', 'invalid_bets', 'message', 'At least one bet is required');
    END IF;
    IF jsonb_array_length(p_bets) > 3 THEN
        RETURN jsonb_build_object('error', 'invalid_bets', 'message', 'Maximum 3 bets per spin');
    END IF;

    -- Pre-validate all bets and compute total
    FOR v_bet IN SELECT * FROM jsonb_array_elements(p_bets) AS elem LOOP
        v_bet_color := v_bet.elem ->> 'color';
        v_bet_amount := (v_bet.elem ->> 'bet')::INT;

        IF v_bet_color IS NULL OR NOT (v_bet_color = ANY(v_valid_colors)) THEN
            RETURN jsonb_build_object('error', 'invalid_color', 'message', 'Color must be black, red, or gold');
        END IF;

        IF v_bet_color = ANY(v_seen_colors) THEN
            RETURN jsonb_build_object('error', 'duplicate_color', 'message', 'Duplicate color: ' || v_bet_color);
        END IF;
        v_seen_colors := v_seen_colors || v_bet_color;

        IF v_bet_amount IS NULL OR v_bet_amount <= 0 THEN
            RETURN jsonb_build_object('error', 'invalid_bet', 'message', 'Each bet must be a positive integer');
        END IF;
        IF v_bet_amount > 500 THEN
            RETURN jsonb_build_object('error', 'bet_too_high', 'max', 500);
        END IF;

        v_total_bet := v_total_bet + v_bet_amount;
    END LOOP;

    -- Lock user row, check balance
    SELECT vibe_chips INTO v_chips
    FROM users
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'user_not_found');
    END IF;

    IF v_chips < v_total_bet THEN
        RETURN jsonb_build_object(
            'error', 'insufficient_chips',
            'have', v_chips,
            'need', v_total_bet
        );
    END IF;

    -- Deduct total bet
    v_chips := v_chips - v_total_bet;

    -- Spin the wheel: black 45%, red 30%, gold 5%, dead 20%
    v_roll := random();
    IF v_roll < 0.45 THEN
        v_result_color := 'black';
    ELSIF v_roll < 0.75 THEN
        v_result_color := 'red';
    ELSIF v_roll < 0.80 THEN
        v_result_color := 'gold';
    ELSE
        v_result_color := 'dead';  -- house wins, no color matches
    END IF;

    -- Evaluate each bet
    FOR v_bet IN SELECT * FROM jsonb_array_elements(p_bets) AS elem LOOP
        v_bet_color := v_bet.elem ->> 'color';
        v_bet_amount := (v_bet.elem ->> 'bet')::INT;

        -- Determine multiplier for the winning color
        CASE v_result_color
            WHEN 'black' THEN v_multiplier := 2;
            WHEN 'red' THEN v_multiplier := 3;
            WHEN 'gold' THEN v_multiplier := 10;
            ELSE v_multiplier := 0;
        END CASE;

        v_won := (v_bet_color = v_result_color);

        IF v_won THEN
            v_payout := v_bet_amount * v_multiplier;
            v_any_won := TRUE;
        ELSE
            v_payout := 0;
        END IF;

        v_total_payout := v_total_payout + v_payout;

        v_bets_result := v_bets_result || jsonb_build_object(
            'color', v_bet_color,
            'bet', v_bet_amount,
            'won', v_won,
            'multiplier', CASE WHEN v_won THEN v_multiplier ELSE 0 END,
            'payout', v_payout,
            'net', v_payout - v_bet_amount
        );
    END LOOP;

    -- Credit winnings
    v_chips := v_chips + v_total_payout;

    UPDATE users
    SET vibe_chips = v_chips,
        updated_at = now()
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'result_color', v_result_color,
        'any_won', v_any_won,
        'total_bet', v_total_bet,
        'total_payout', v_total_payout,
        'net', v_total_payout - v_total_bet,
        'bets', v_bets_result,
        'new_chips', v_chips
    );
END;
$$;

-- =============================================================================
-- Missing performance indexes
-- =============================================================================

-- Fast expiry sweep for expire_overdue_payouts()
CREATE INDEX IF NOT EXISTS idx_pending_payouts_expires
    ON pending_payouts(expires_at)
    WHERE status = 'pending';

-- Standalone user_id index for ad_watch_logs (compound idx_ad_watch_logs_user_date exists but not standalone)
CREATE INDEX IF NOT EXISTS idx_ad_watch_logs_user_id
    ON ad_watch_logs(user_id);
