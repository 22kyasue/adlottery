-- Migration 019: Launch Campaign early adopter reward
-- All users who sign up on or before 2026-03-31 receive:
--   25 Vibe Chips + 3-day Booster (awarded once, on first login)

ALTER TABLE users ADD COLUMN IF NOT EXISTS early_adopter_reward_claimed BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION apply_early_adopter_reward(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_already_claimed  BOOLEAN;
    v_created_at       TIMESTAMPTZ;
    v_booster_expires  TIMESTAMPTZ;
BEGIN
    -- Already claimed?
    SELECT early_adopter_reward_claimed INTO v_already_claimed
    FROM users WHERE id = p_user_id;

    IF v_already_claimed THEN
        RETURN jsonb_build_object('error', 'already_claimed');
    END IF;

    -- Check signup date (must be on or before 2026-03-31)
    SELECT created_at INTO v_created_at
    FROM auth.users WHERE id = p_user_id;

    IF v_created_at IS NULL OR v_created_at > '2026-03-31 23:59:59+00'::TIMESTAMPTZ THEN
        RETURN jsonb_build_object('error', 'not_eligible');
    END IF;

    -- Extend booster (or start fresh) by 3 days
    SELECT GREATEST(COALESCE(booster_expires_at, now()), now()) + INTERVAL '3 days'
    INTO v_booster_expires
    FROM users WHERE id = p_user_id;

    -- Award chips + booster, mark as claimed
    UPDATE users
    SET vibe_chips                    = vibe_chips + 25,
        is_booster_active             = TRUE,
        booster_expires_at            = v_booster_expires,
        early_adopter_reward_claimed  = TRUE,
        updated_at                    = now()
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'success',     true,
        'chips',       25,
        'booster_days', 3
    );
END;
$$;
