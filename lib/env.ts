/**
 * Validate required environment variables at import time.
 * Import this module early (e.g., in middleware or layout) to fail fast.
 */

const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ADMIN_API_KEY',
] as const;

const missing: string[] = [];

for (const key of required) {
    if (!process.env[key]) {
        missing.push(key);
    }
}

if (missing.length > 0) {
    throw new Error(
        `Missing required environment variables:\n${missing.map(k => `  - ${k}`).join('\n')}\n` +
        `Copy .env.example to .env.local and fill in the values.`
    );
}

export const env = {
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    ADMIN_API_KEY: process.env.ADMIN_API_KEY!,
    OFFERWALL_SECRET_KEY: process.env.OFFERWALL_SECRET_KEY ?? '',
    OFFERWALL_MULTIPLIER: parseFloat(process.env.OFFERWALL_MULTIPLIER ?? '1.0') || 1.0,
} as const;
