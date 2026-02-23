-- 010_booster_file_storage.sql
-- Add column to track uploaded booster history files in Supabase Storage

ALTER TABLE users ADD COLUMN IF NOT EXISTS last_uploaded_file_url TEXT;
