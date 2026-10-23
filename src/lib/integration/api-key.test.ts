import { describe, expect, it } from "vitest";
import {
    buildApiKey,
    extractBearerToken,
    generateApiKey,
    hashesMatch,
    hashSecret,
    maskApiKeys,
    parseApiKey,
} from "./api-key";

describe("integration API key format", () => {
    it("generates nvc_live_<publicId>_<secret> with a 256-bit secret", () => {
        const key = generateApiKey();
        const parsed = parseApiKey(key.fullKey);
        expect(parsed).not.toBeNull();
        expect(key.fullKey.startsWith(`nvc_live_${key.publicId}_`)).toBe(true);
        expect(Buffer.from(parsed!.secret, "base64url")).toHaveLength(32);
        expect(key.keyPrefix).toBe(`nvc_live_${key.publicId}`);
    });

    it("stores only a hash that does not contain the secret", () => {
        const key = generateApiKey();
        const { secret } = parseApiKey(key.fullKey)!;
        expect(key.keyHash).toBe(hashSecret(secret));
        expect(key.keyHash).not.toContain(secret);
        expect(JSON.stringify({ hash: key.keyHash, prefix: key.keyPrefix, lastFour: key.lastFour })).not.toContain(secret);
    });

    it("produces a different secret on every call, and on rotation for the same publicId", () => {
        const first = generateApiKey();
        const rotated = buildApiKey(first.publicId);
        expect(rotated.publicId).toBe(first.publicId);
        expect(rotated.fullKey).not.toBe(first.fullKey);
        expect(rotated.keyHash).not.toBe(first.keyHash);
    });

    it("rejects malformed keys", () => {
        expect(parseApiKey("")).toBeNull();
        expect(parseApiKey("nvc_live_short_abc")).toBeNull();
        expect(parseApiKey(`nvc_test_${"a".repeat(16)}_${"b".repeat(43)}`)).toBeNull();
        expect(parseApiKey(`nvc_live_${"g".repeat(16)}_${"b".repeat(43)}`)).toBeNull();
        expect(parseApiKey(`nvc_live_${"a".repeat(16)}_${"b".repeat(42)}`)).toBeNull();
    });

    it("compares hashes in constant time and handles bad input", () => {
        const hash = hashSecret("secret");
        expect(hashesMatch(hash, hashSecret("secret"))).toBe(true);
        expect(hashesMatch(hash, hashSecret("other"))).toBe(false);
        expect(hashesMatch(hash, "abcd")).toBe(false);
        expect(hashesMatch("", "")).toBe(false);
    });

    it("extracts bearer tokens only from a well-formed header", () => {
        expect(extractBearerToken("Bearer abc")).toBe("abc");
        expect(extractBearerToken("bearer abc")).toBe("abc");
        expect(extractBearerToken("Basic abc")).toBeNull();
        expect(extractBearerToken("Bearer")).toBeNull();
        expect(extractBearerToken("Bearer a b")).toBeNull();
        expect(extractBearerToken(null)).toBeNull();
    });

    it("masks keys that appear in free text", () => {
        const key = generateApiKey();
        const masked = maskApiKeys(`header was Bearer ${key.fullKey}`);
        expect(masked).toContain(key.keyPrefix);
        expect(masked).not.toContain(parseApiKey(key.fullKey)!.secret);
    });
});
