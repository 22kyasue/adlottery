/**
 * Simple in-memory sliding window rate limiter.
 * For production with multiple instances, replace with Redis-backed solution.
 */

interface RateLimitEntry {
    timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL) return;
    lastCleanup = now;
    const cutoff = now - windowMs;
    for (const [key, entry] of store) {
        entry.timestamps = entry.timestamps.filter(t => t > cutoff);
        if (entry.timestamps.length === 0) store.delete(key);
    }
}

interface RateLimitConfig {
    /** Unique namespace for this limiter (e.g., 'verify-ad', 'casino') */
    prefix: string;
    /** Maximum number of requests in the window */
    maxRequests: number;
    /** Window size in milliseconds */
    windowMs: number;
}

interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    retryAfterMs?: number;
}

export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
    const fullKey = `${config.prefix}:${key}`;
    const now = Date.now();
    const cutoff = now - config.windowMs;

    cleanup(config.windowMs);

    let entry = store.get(fullKey);
    if (!entry) {
        entry = { timestamps: [] };
        store.set(fullKey, entry);
    }

    // Remove expired timestamps
    entry.timestamps = entry.timestamps.filter(t => t > cutoff);

    if (entry.timestamps.length >= config.maxRequests) {
        const oldestInWindow = entry.timestamps[0];
        return {
            allowed: false,
            remaining: 0,
            retryAfterMs: oldestInWindow + config.windowMs - now,
        };
    }

    entry.timestamps.push(now);
    return {
        allowed: true,
        remaining: config.maxRequests - entry.timestamps.length,
    };
}

// Pre-configured limiters for different routes
export const RATE_LIMITS = {
    verifyAd: { prefix: 'verify-ad', maxRequests: 60, windowMs: 60 * 1000 },       // 60/min
    casino: { prefix: 'casino', maxRequests: 30, windowMs: 60 * 1000 },             // 30/min
    webhook: { prefix: 'webhook', maxRequests: 100, windowMs: 60 * 1000 },          // 100/min
    auth: { prefix: 'auth', maxRequests: 10, windowMs: 60 * 1000 },                 // 10/min
    conversion: { prefix: 'conversion', maxRequests: 10, windowMs: 60 * 1000 },     // 10/min
} as const;
