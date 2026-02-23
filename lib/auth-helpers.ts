import { timingSafeEqual } from 'crypto';

/**
 * Timing-safe comparison of two strings.
 * Returns false if either string is empty/undefined.
 */
export function safeCompare(a: string | undefined | null, b: string | undefined | null): boolean {
    if (!a || !b) return false;
    if (a.length !== b.length) return false;
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Verify ADMIN_API_KEY from Authorization: Bearer header.
 * Returns true if valid, false otherwise.
 */
export function verifyAdminKey(authHeader: string | null): boolean {
    const expectedKey = process.env.ADMIN_API_KEY?.trim();
    const token = (authHeader ?? '').replace(/^bearer\s+/i, '').trim();
    return safeCompare(token, expectedKey);
}

/**
 * Verify either ADMIN_API_KEY (Bearer token) or CRON_SECRET (x-vercel-cron-secret header).
 * Use this on admin routes that are also triggered by Vercel cron jobs.
 */
export function verifyAdminOrCron(request: Request): boolean {
    const authHeader = request.headers.get('authorization');
    if (verifyAdminKey(authHeader)) return true;

    const cronSecret = process.env.CRON_SECRET?.trim();
    const cronHeader = request.headers.get('x-vercel-cron-secret');
    if (cronSecret && cronHeader) {
        return safeCompare(cronHeader, cronSecret);
    }

    return false;
}
