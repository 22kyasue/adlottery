-- Migration: Atomic chip-to-ticket conversion with global 30% cap enforcement

CREATE OR REPLACE FUNCTION convert_chips_to_tickets(
    p_user_id  uuid,
    p_week_id  text,
    p_amount   int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_chips          int;
    v_global_organic      bigint;
    v_global_converted    bigint;
    v_cap_limit           bigint;
    v_remaining_cap       bigint;
    v_new_converted       int;
    v_new_chips           int;
BEGIN
    -- 1. Lock and read the user's chip balance (prevents double-spend)
    SELECT vibe_chips
    INTO   v_user_chips
    FROM   users
    WHERE  id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'user_not_found');
    END IF;

    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('error', 'invalid_amount');
    END IF;

    IF v_user_chips < p_amount THEN
        RETURN jsonb_build_object(
            'error', 'insufficient_chips',
            'have',  v_user_chips,
            'need',  p_amount
        );
    END IF;

    -- 2. Compute global organic and converted totals for this week
    SELECT
        COALESCE(SUM(organic_tickets),   0),
        COALESCE(SUM(converted_tickets), 0)
    INTO
        v_global_organic,
        v_global_converted
    FROM weekly_tickets
    WHERE week_id = p_week_id;

    -- 3. Enforce the 30% cap
    v_cap_limit     := FLOOR(v_global_organic::numeric * 0.30);
    v_remaining_cap := GREATEST(v_cap_limit - v_global_converted, 0);

    IF v_remaining_cap <= 0 THEN
        RETURN jsonb_build_object(
            'error',            'cap_reached',
            'global_organic',   v_global_organic,
            'global_converted', v_global_converted,
            'cap_limit',        v_cap_limit,
            'remaining_cap',    0
        );
    END IF;

    IF p_amount > v_remaining_cap THEN
        RETURN jsonb_build_object(
            'error',            'exceeds_cap',
            'requested',        p_amount,
            'remaining_cap',    v_remaining_cap,
            'global_organic',   v_global_organic,
            'global_converted', v_global_converted,
            'cap_limit',        v_cap_limit
        );
    END IF;

    -- 4. Deduct chips
    v_new_chips := v_user_chips - p_amount;

    UPDATE users
    SET    vibe_chips = v_new_chips,
           updated_at = NOW()
    WHERE  id = p_user_id;

    -- 5. Upsert converted tickets
    INSERT INTO weekly_tickets (user_id, week_id, organic_tickets, converted_tickets)
    VALUES (p_user_id, p_week_id, 0, p_amount)
    ON CONFLICT (user_id, week_id)
    DO UPDATE SET
        converted_tickets = weekly_tickets.converted_tickets + p_amount,
        updated_at        = NOW()
    RETURNING converted_tickets INTO v_new_converted;

    -- 6. Return success
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
