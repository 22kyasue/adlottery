# Tasks to do on PC

## Vercel Environment Variables

Set these in Vercel Dashboard → Settings → Environment Variables:

### Payment Processing
- `PAYPAL_CLIENT_ID` — From PayPal Developer Dashboard
- `PAYPAL_CLIENT_SECRET` — From PayPal Developer Dashboard
- `PAYPAL_MODE` — Set to `live` for production (default: sandbox)
- `WISE_API_TOKEN` — From Wise Business API settings
- `WISE_PROFILE_ID` — Your Wise business profile ID
- `WISE_MODE` — Set to `live` for production (default: sandbox)

### Sentry Error Monitoring
- `NEXT_PUBLIC_SENTRY_DSN` — From Sentry project settings → Client Keys (DSN)
- `SENTRY_ORG` — Your Sentry organization slug
- `SENTRY_PROJECT` — Your Sentry project slug
- `SENTRY_AUTH_TOKEN` — From Sentry → Settings → Auth Tokens (needed for source map uploads)

### Vercel Cron
- `CRON_SECRET` — Any random string (e.g. `openssl rand -hex 32`). Vercel uses this to authenticate cron requests.

### Production Ad Tag
- `NEXT_PUBLIC_GOOGLE_AD_TAG_URL` — Your real Google Ad Manager / AdSense VAST tag URL (optional — uses Google's test tag if unset)

## Supabase Migrations

Run these in Supabase Dashboard → SQL Editor if not already applied:
- Migration 015: roulette tables + indexes
- Migration 016: webhook failure tracking

## Offer Wall Providers

1. Sign up for Tapjoy / ironSource / similar provider
2. Configure your app in their dashboard
3. Set the postback/webhook URL to: `https://yourdomain.com/api/webhooks/offerwall`
4. Set `OFFERWALL_SECRET_KEY` env var in Vercel to match the provider's secret key
5. Replace mock offers in the offer wall component with real offer data
