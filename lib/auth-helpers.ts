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
 * Verify either ADMIN_API_KEY or CRON_SECRET.
 * Vercel Cron sends: Authorization: Bearer <CRON_SECRET>
 * Admin calls send:  Authorization: Bearer <ADMIN_API_KEY>
 */
export function verifyAdminOrCron(request: Request): boolean {
    const authHeader = request.headers.get('authorization');

    // Check ADMIN_API_KEY first
    if (verifyAdminKey(authHeader)) return true;

    // Check CRON_SECRET from Authorization: Bearer header (Vercel Cron)
    const cronSecret = process.env.CRON_SECRET?.trim();
    if (cronSecret) {
        const token = (authHeader ?? '').replace(/^bearer\s+/i, '').trim();
        if (safeCompare(token, cronSecret)) return true;
    }

    return false;
}
