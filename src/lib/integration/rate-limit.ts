/**
 * Fixed-window rate limiter kept in process memory.
 *
 * Limits are per bucket ("ip:<addr>" before authentication, "key:<publicId>"
 * after). Because the counters live in this process, running several app
 * instances multiplies the effective limit by the instance count; see
 * docs/REPAIR_INTEGRATION_RUNBOOK.md.
 */

interface Bucket {
    count: number;
    resetAt: number;
}

const MAX_BUCKETS = 10_000;
const buckets = new Map<string, Bucket>();

function envInt(name: string, fallback: number, min: number, max: number): number {
    const parsed = Number.parseInt(process.env[name] ?? "", 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
}

export function rateLimitConfig() {
    const limit = envInt("INTEGRATION_API_RATE_LIMIT", 120, 1, 100_000);
    return {
        limit,
        ipLimit: envInt("INTEGRATION_API_IP_RATE_LIMIT", limit, 1, 100_000),
        windowMs: envInt("INTEGRATION_API_RATE_WINDOW_SECONDS", 60, 1, 86_400) * 1000,
    };
}

export interface RateLimitResult {
    allowed: boolean;
    limit: number;
    remaining: number;
    retryAfterSeconds: number;
}

function prune(now: number) {
    for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(key);
    }
    // Still full of live buckets: drop the oldest insertions rather than grow without bound.
    while (buckets.size >= MAX_BUCKETS) {
        const oldest = buckets.keys().next().value;
        if (oldest === undefined) break;
        buckets.delete(oldest);
    }
}

export function consumeRateLimit(bucketKey: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
    let bucket = buckets.get(bucketKey);
    if (!bucket || bucket.resetAt <= now) {
        if (buckets.size >= MAX_BUCKETS) prune(now);
        bucket = { count: 0, resetAt: now + windowMs };
        buckets.set(bucketKey, bucket);
    }
    bucket.count += 1;
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return {
        allowed: bucket.count <= limit,
        limit,
        remaining: Math.max(0, limit - bucket.count),
        retryAfterSeconds,
    };
}

/** Test helper. */
export function resetRateLimits() {
    buckets.clear();
}
