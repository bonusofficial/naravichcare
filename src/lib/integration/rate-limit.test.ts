import { afterEach, describe, expect, it } from "vitest";
import { consumeRateLimit, rateLimitConfig, resetRateLimits } from "./rate-limit";

describe("in-memory rate limiter", () => {
    afterEach(() => resetRateLimits());

    it("allows up to the limit within a window, then blocks", () => {
        const results = Array.from({ length: 4 }, () => consumeRateLimit("key:a", 3, 60_000, 1_000));
        expect(results.map((r) => r.allowed)).toEqual([true, true, true, false]);
        expect(results[3].retryAfterSeconds).toBe(60);
        expect(results[2].remaining).toBe(0);
    });

    it("keeps buckets independent and resets after the window", () => {
        consumeRateLimit("key:a", 1, 1_000, 0);
        expect(consumeRateLimit("key:a", 1, 1_000, 10).allowed).toBe(false);
        expect(consumeRateLimit("ip:b", 1, 1_000, 10).allowed).toBe(true);
        expect(consumeRateLimit("key:a", 1, 1_000, 1_001).allowed).toBe(true);
    });

    it("reads limits from the environment", () => {
        const previous = { ...process.env };
        process.env.INTEGRATION_API_RATE_LIMIT = "5";
        process.env.INTEGRATION_API_RATE_WINDOW_SECONDS = "30";
        delete process.env.INTEGRATION_API_IP_RATE_LIMIT;
        expect(rateLimitConfig()).toEqual({ limit: 5, ipLimit: 5, windowMs: 30_000 });
        process.env.INTEGRATION_API_RATE_LIMIT = "nonsense";
        expect(rateLimitConfig().limit).toBe(120);
        Object.assign(process.env, previous);
    });
});
