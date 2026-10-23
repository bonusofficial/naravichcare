import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Machine-to-machine API keys for the integration API.
 *
 * Format: nvc_live_<publicId>_<secret>
 *   publicId - 16 hex chars, stored in clear and used to find the record
 *   secret   - 32 random bytes (256 bits) as base64url, never stored
 *
 * Only SHA-256(secret) is persisted. A slow hash (bcrypt/scrypt) is not needed
 * because the secret is high-entropy random data, not a human password.
 */

export const API_KEY_PREFIX = "nvc_live_";

export const INTEGRATION_SCOPES = [
    "repair:read",
    "repair:write",
    "repair:cancel",
    "repair:handover",
] as const;

export type IntegrationScope = (typeof INTEGRATION_SCOPES)[number];

const KEY_PATTERN = /^nvc_live_([0-9a-f]{16})_([A-Za-z0-9_-]{43})$/;

export interface GeneratedApiKey {
    publicId: string;
    /** Full key to hand to the client exactly once. Never persist or log it. */
    fullKey: string;
    keyHash: string;
    /** Safe to display: nvc_live_<publicId> */
    keyPrefix: string;
    /** Last 4 chars of the secret, for recognising a key on screen. */
    lastFour: string;
}

export function hashSecret(secret: string): string {
    return createHash("sha256").update(secret, "utf8").digest("hex");
}

export function generateSecret(): string {
    return randomBytes(32).toString("base64url");
}

export function generatePublicId(): string {
    return randomBytes(8).toString("hex");
}

/** Build a key for an existing publicId (rotation keeps the publicId). */
export function buildApiKey(publicId: string, secret = generateSecret()): GeneratedApiKey {
    return {
        publicId,
        fullKey: `${API_KEY_PREFIX}${publicId}_${secret}`,
        keyHash: hashSecret(secret),
        keyPrefix: `${API_KEY_PREFIX}${publicId}`,
        lastFour: secret.slice(-4),
    };
}

export function generateApiKey(): GeneratedApiKey {
    return buildApiKey(generatePublicId());
}

export function parseApiKey(raw: string): { publicId: string; secret: string } | null {
    const match = KEY_PATTERN.exec(raw);
    if (!match) return null;
    return { publicId: match[1], secret: match[2] };
}

/** Constant-time comparison of two hex digests. */
export function hashesMatch(expectedHex: string, actualHex: string): boolean {
    const expected = Buffer.from(expectedHex, "hex");
    const actual = Buffer.from(actualHex, "hex");
    if (expected.length !== actual.length || expected.length === 0) {
        // Still burn a comparison so a length mismatch is not measurably faster.
        timingSafeEqual(actual, actual);
        return false;
    }
    return timingSafeEqual(expected, actual);
}

/** Extract the token from "Authorization: Bearer <token>". */
export function extractBearerToken(header: string | null): string | null {
    if (!header) return null;
    const match = /^Bearer[ ]+(\S+)[ ]*$/i.exec(header);
    return match ? match[1] : null;
}

export function isIntegrationScope(value: unknown): value is IntegrationScope {
    return typeof value === "string" && (INTEGRATION_SCOPES as readonly string[]).includes(value);
}

/** Mask anything that looks like an API key inside free text (logs, errors). */
export function maskApiKeys(text: string): string {
    return text.replace(/nvc_live_([0-9a-f]{16})_[A-Za-z0-9_-]+/g, "nvc_live_$1_[REDACTED]");
}
