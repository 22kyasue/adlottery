-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- Users Table
-- Stores user currency and shadowban status
create table users (
  id uuid references auth.users not null primary key,
  vibe_chips int default 0,
  vibe_coins int default 0,
  is_booster_active boolean default false,
  booster_expires_at timestamp with time zone,
  is_shadowbanned boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS) on users
alter table users enable row level security;
-- Allow users to view their own data
create policy "Users can view own data" on users for select using (auth.uid() = id);
-- Only service role can update shadowban status (or via secure functions)

-- Weekly Tickets Table
-- Tracks tickets for a specific week, split by type
create table weekly_tickets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references users(id) not null,
  week_id text not null, -- Format: "YYYY-W##", e.g., "2026-W08"
  organic_tickets int default 0,
  converted_tickets int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, week_id)
);

-- Enable RLS on weekly_tickets
alter table weekly_tickets enable row level security;
create policy "Users can view own tickets" on weekly_tickets for select using (auth.uid() = user_id);

-- Ad Watch Logs Table
-- Logs every ad watch attempt for verification and bot detection
create table ad_watch_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references users(id) not null,
  session_token_hash text, -- Optional: hash of the session token for deeper tracking
  watched_at timestamp with time zone default timezone('utc'::text, now()) not null,
  metadata jsonb default '{}'::jsonb -- For flexibility (browser info, IP hash, etc.)
);

-- Enable RLS on ad_watch_logs
alter table ad_watch_logs enable row level security;
-- Users might not need to see logs, but admins do.
-- For now, we can create a policy for users to see their own logs if needed for history
create policy "Users can view own logs" on ad_watch_logs for select using (auth.uid() = user_id);

-- Index for faster querying of recent logs
create index idx_ad_watch_logs_user_date on ad_watch_logs(user_id, watched_at desc);

-- RPC for atomic ticket increment
create or replace function increment_organic_tickets(p_user_id uuid, p_week_id text)
returns int as $$
declare
  new_count int;
begin
  insert into weekly_tickets (user_id, week_id, organic_tickets)
  values (p_user_id, p_week_id, 1)
  on conflict (user_id, week_id)
  do update set 
    organic_tickets = weekly_tickets.organic_tickets + 1,
    updated_at = now()
  returning organic_tickets into new_count;
  
  return new_count;
end;
$$ language plpgsql security definer;

-- RPC for atomic chip-to-ticket conversion with 30% global cap
-- See supabase/migrations/002_convert_chips_rpc.sql for full implementation
-- convert_chips_to_tickets(p_user_id uuid, p_week_id text, p_amount int) RETURNS jsonb
-- SECURITY DEFINER — enforces global cap, deducts vibe_chips, upserts converted_tickets
