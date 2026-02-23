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
