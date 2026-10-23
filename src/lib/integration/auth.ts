import dbConnect from "@/lib/mongodb";
import IntegrationApiKey from "@/models/IntegrationApiKey";
import {
    extractBearerToken,
    hashesMatch,
    hashSecret,
    isIntegrationScope,
    parseApiKey,
    type IntegrationScope,
} from "./api-key";
import { forbiddenScope, unauthorized } from "./errors";
import { logIntegration } from "./redact";

export interface IntegrationClient {
    keyId: string;
    publicId: string;
    name: string;
    scopes: IntegrationScope[];
}

// Compared against when the publicId is unknown, so a miss costs the same
// hash + compare as a hit and does not reveal whether the key id exists.
const DUMMY_HASH = hashSecret("integration-key-not-found");
const LAST_USED_WRITE_INTERVAL_MS = 60_000;

type FailureReason = "missing" | "malformed" | "unknown_key" | "bad_secret" | "revoked" | "expired";

function fail(reason: FailureReason, meta: { requestId: string; ip: string; publicId?: string }): never {
    // publicId is not secret (it is the visible key prefix); the secret never reaches the log.
    logIntegration("warn", "integration.auth_failed", { reason, ...meta });
    throw unauthorized();
}

/**
 * Resolve "Authorization: Bearer <key>" to an active integration client.
 * Every failure produces the same 401 body; the reason only goes to the log.
 */
export async function authenticateApiKey(
    authorization: string | null,
    { requestId, ip }: { requestId: string; ip: string },
): Promise<IntegrationClient> {
    const token = extractBearerToken(authorization);
    if (!token) fail(authorization ? "malformed" : "missing", { requestId, ip });
    const parsed = parseApiKey(token);
    if (!parsed) fail("malformed", { requestId, ip });

    await dbConnect();
    const key = await IntegrationApiKey.findOne({ publicId: parsed.publicId }).select("+keyHash").lean();
    const secretMatches = hashesMatch(key?.keyHash ?? DUMMY_HASH, hashSecret(parsed.secret));
    if (!key) fail("unknown_key", { requestId, ip, publicId: parsed.publicId });
    if (!secretMatches) fail("bad_secret", { requestId, ip, publicId: parsed.publicId });
    if (!key.isActive || key.revokedAt) fail("revoked", { requestId, ip, publicId: parsed.publicId });
    const now = new Date();
    if (key.expiresAt && key.expiresAt.getTime() <= now.getTime()) fail("expired", { requestId, ip, publicId: parsed.publicId });

    const lastUsed = key.lastUsedAt ? new Date(key.lastUsedAt).getTime() : 0;
    if (now.getTime() - lastUsed > LAST_USED_WRITE_INTERVAL_MS || key.lastUsedIp !== ip) {
        await IntegrationApiKey.updateOne({ _id: key._id }, { $set: { lastUsedAt: now, lastUsedIp: ip.slice(0, 64) } });
    }

    return {
        keyId: String(key._id),
        publicId: key.publicId,
        name: key.name,
        scopes: (key.scopes || []).filter(isIntegrationScope),
    };
}

export function requireScope(client: IntegrationClient, scope: IntegrationScope) {
    if (!client.scopes.includes(scope)) throw forbiddenScope();
}
