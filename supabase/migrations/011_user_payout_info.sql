-- Migration 011: Add payout info columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS paypal_email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS wise_email TEXT;
