-- Add booster state columns to users table
-- These track server-authoritative booster activation state
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_booster_active boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS booster_expires_at timestamp with time zone;
