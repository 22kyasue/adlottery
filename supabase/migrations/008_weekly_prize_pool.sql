-- Migration 008: Weekly Prize Pool
-- Tracks real ad revenue flowing into the weekly prize pool

-- Table
CREATE TABLE IF NOT EXISTS weekly_prize_pool (
    week_id TEXT PRIMARY KEY,
    base_amount INT NOT NULL DEFAULT 1250000,
    ad_revenue_added INT NOT NULL DEFAULT 0,
    total_pool INT GENERATED ALWAYS AS (base_amount + ad_revenue_added) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: pool is public info for authenticated users
ALTER TABLE weekly_prize_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view prize pool"
    ON weekly_prize_pool FOR SELECT
    TO authenticated
    USING (true);

-- RPC: increment_prize_pool — called on every ad watch
-- Upserts row and returns new total
CREATE OR REPLACE FUNCTION increment_prize_pool(p_week_id TEXT, p_amount INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total INT;
BEGIN
    INSERT INTO weekly_prize_pool (week_id, ad_revenue_added)
    VALUES (p_week_id, p_amount)
    ON CONFLICT (week_id) DO UPDATE
        SET ad_revenue_added = weekly_prize_pool.ad_revenue_added + p_amount,
            updated_at = now();

    SELECT (base_amount + ad_revenue_added) INTO v_total
    FROM weekly_prize_pool
    WHERE week_id = p_week_id;

    RETURN v_total;
END;
$$;

-- RPC: admin_add_revenue — bulk sync from ad networks
-- Same upsert, returns full row details for admin logging
CREATE OR REPLACE FUNCTION admin_add_revenue(p_week_id TEXT, p_amount INT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_row RECORD;
BEGIN
    INSERT INTO weekly_prize_pool (week_id, ad_revenue_added)
    VALUES (p_week_id, p_amount)
    ON CONFLICT (week_id) DO UPDATE
        SET ad_revenue_added = weekly_prize_pool.ad_revenue_added + p_amount,
            updated_at = now();

    SELECT * INTO v_row
    FROM weekly_prize_pool
    WHERE week_id = p_week_id;

    RETURN jsonb_build_object(
        'week_id', v_row.week_id,
        'base_amount', v_row.base_amount,
        'ad_revenue_added', v_row.ad_revenue_added,
        'total_pool', v_row.base_amount + v_row.ad_revenue_added,
        'updated_at', v_row.updated_at
    );
END;
$$;
