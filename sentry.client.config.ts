import * as Sentry from '@sentry/nextjs';

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Only initialize if DSN is provided
    enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Capture 100% of errors, sample 10% of transactions for performance
    tracesSampleRate: 0.1,

    // Disable session replay by default (enable if needed)
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,

    environment: process.env.NODE_ENV,
});
