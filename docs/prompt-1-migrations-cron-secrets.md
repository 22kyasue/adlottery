I need you to do 3 things in my Supabase project and Vercel/hosting setup:

1. Apply these two SQL migrations in Supabase Dashboard → SQL Editor. Run them in order:

Migration 015 — Creates the play_roulette_multi RPC and adds missing indexes:
- File: supabase/migrations/015_roulette_multi_and_indexes.sql

Migration 016 — Creates the webhook_failures retry queue table:
- File: supabase/migrations/016_webhook_failures.sql

Open each file, copy the full SQL, paste into Supabase SQL Editor, and run. Confirm each succeeds with no errors.

2. Set up two cron jobs that call my admin API endpoints. Use whatever scheduler is available (Supabase pg_cron, cron-job.org, or a Vercel cron in vercel.json):

- Weekly draw: POST https://<my-domain>/api/admin/run-draw every Sunday at 20:00 JST (11:00 UTC). Include header Authorization: Bearer <ADMIN_API_KEY>.
- Expire payouts: POST https://<my-domain>/api/admin/expire-payouts daily at 00:00 UTC. Include header Authorization: Bearer <ADMIN_API_KEY>.

3. Replace the test secrets in my environment variables (Vercel dashboard or .env.local for local dev):

- ADMIN_API_KEY — generate a cryptographically random 64-character hex string (e.g., openssl rand -hex 32)
- OFFERWALL_SECRET_KEY — generate another separate random 64-character hex string

Make sure both the hosting environment (Vercel env vars) and any cron job configs use the new keys.
