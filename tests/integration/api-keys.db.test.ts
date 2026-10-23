import mongoose from "mongoose";
import { afterEach, expect, it } from "vitest";
import { GET as listKeysRoute, POST as createKeyRoute } from "@/app/api/admin/integration-keys/route";
import { POST as rotateRoute } from "@/app/api/admin/integration-keys/[id]/rotate/route";
import { POST as revokeRoute } from "@/app/api/admin/integration-keys/[id]/revoke/route";
import { GET as searchRoute, POST as createJobRoute } from "@/app/api/integration/v1/repair-jobs/route";
import { parseApiKey } from "@/lib/integration/api-key";
import { ALL_PERMISSIONS } from "@/lib/permissions";
import { middleware } from "@/middleware";
import AdminLog from "@/models/AdminLog";
import IntegrationApiKey from "@/models/IntegrationApiKey";
import Role from "@/models/Role";
import {
    adminRequest,
    apiRequest,
    createAdmin,
    describeDb,
    insertApiKey,
    json,
    noParams,
    params,
    posPayload,
} from "../helpers/db";

interface KeyDto {
    id: string;
    name: string;
    keyPrefix: string;
    maskedKey: string;
    scopes: string[];
    status: string;
    lastUsedAt: string | null;
    rotatedAt: string | null;
    rotationCount: number;
    revokedAt: string | null;
    revokeReason: string | null;
}
interface ErrorEnvelope {
    error: { code: string; message: string; requestId: string };
}

const SEARCH = "/api/integration/v1/repair-jobs";

async function createKeyAsSuperAdmin(body: Record<string, unknown> = { name: "Web POS", scopes: ["repair:read", "repair:write"] }) {
    const { token, user } = await createAdmin("super_admin");
    const res = await createKeyRoute(adminRequest("/api/admin/integration-keys", { method: "POST", token, body }));
    return { res, token, user, payload: await json<{ key: KeyDto; apiKey: string }>(res) };
}

async function callSearch(apiKey?: string, query = "") {
    return searchRoute(apiRequest(`${SEARCH}${query}`, { apiKey }), noParams);
}

describeDb("integration API keys", () => {
    afterEach(() => {
        process.env.INTEGRATION_API_RATE_LIMIT = "100000";
        process.env.INTEGRATION_API_IP_RATE_LIMIT = "100000";
    });

    it("lets a super_admin create a key and returns the secret exactly once", async () => {
        const { res, token, payload } = await createKeyAsSuperAdmin();
        expect(res.status).toBe(201);
        expect(res.headers.get("cache-control")).toBe("no-store");
        expect(parseApiKey(payload.apiKey)).not.toBeNull();
        expect(payload.key.status).toBe("active");
        expect(payload.key).not.toHaveProperty("keyHash");

        const list = await listKeysRoute(adminRequest("/api/admin/integration-keys", { token }));
        const listText = await list.text();
        const { secret } = parseApiKey(payload.apiKey)!;
        expect(list.status).toBe(200);
        expect(listText).not.toContain(secret);
        expect(listText).not.toContain(payload.apiKey);
        expect(listText).not.toContain("keyHash");
        const stored = await IntegrationApiKey.findById(payload.key.id).select("+keyHash").lean();
        expect(listText).not.toContain(stored!.keyHash);
        expect((JSON.parse(listText) as { keys: KeyDto[] }).keys[0].maskedKey).toMatch(/^nvc_live_[0-9a-f]{16}_…/);
    });

    it("never stores the plaintext secret in the database", async () => {
        const { payload } = await createKeyAsSuperAdmin();
        const { secret } = parseApiKey(payload.apiKey)!;
        const raw = await mongoose.connection.db!.collection("integrationapikeys").find().toArray();
        const dump = JSON.stringify(raw);
        expect(raw).toHaveLength(1);
        expect(dump).not.toContain(secret);
        expect(dump).not.toContain(payload.apiKey);
    });

    it("accepts a valid key and records last use", async () => {
        const { payload } = await createKeyAsSuperAdmin();
        const res = await callSearch(payload.apiKey);
        expect(res.status).toBe(200);
        const key = await IntegrationApiKey.findById(payload.key.id).lean();
        expect(key!.lastUsedAt).toBeInstanceOf(Date);
        expect(key!.lastUsedIp).toBe("203.0.113.10");
    });

    it("answers every bad credential with the same generic 401", async () => {
        const { payload } = await createKeyAsSuperAdmin();
        const { publicId, secret } = parseApiKey(payload.apiKey)!;
        const wrongSecret = `nvc_live_${publicId}_${secret.slice(0, -4)}AAAA`;
        const unknownId = `nvc_live_${"0".repeat(16)}_${secret}`;
        const bodies: string[] = [];
        for (const key of [wrongSecret, unknownId, "not-a-key", ""]) {
            const res = await callSearch(key || undefined);
            expect(res.status).toBe(401);
            const body = await json<ErrorEnvelope>(res);
            expect(body.error.code).toBe("INVALID_API_KEY");
            bodies.push(body.error.message);
        }
        // Same message whether or not the key id exists.
        expect(new Set(bodies).size).toBe(1);

        const basic = await searchRoute(apiRequest(SEARCH, { headers: { authorization: `Basic ${payload.apiKey}` } }), noParams);
        expect(basic.status).toBe(401);
    });

    it("refuses an API key passed in the query string", async () => {
        const { payload } = await createKeyAsSuperAdmin();
        const res = await callSearch(undefined, `?api_key=${payload.apiKey}`);
        expect(res.status).toBe(400);
        const withHeader = await callSearch(payload.apiKey, `?token=${payload.apiKey}`);
        expect(withHeader.status).toBe(400);
    });

    it("rejects an expired key", async () => {
        const { apiKey, id } = await insertApiKey();
        expect((await callSearch(apiKey)).status).toBe(200);
        await IntegrationApiKey.updateOne({ _id: id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
        const res = await callSearch(apiKey);
        expect(res.status).toBe(401);
        expect((await json<ErrorEnvelope>(res)).error.code).toBe("INVALID_API_KEY");
    });

    it("revokes a key immediately, keeps the record, and is idempotent", async () => {
        const { payload, token, user } = await createKeyAsSuperAdmin();
        expect((await callSearch(payload.apiKey)).status).toBe(200);

        const res = await revokeRoute(
            adminRequest(`/api/admin/integration-keys/${payload.key.id}/revoke`, { method: "POST", token, body: { reason: "POS ถูกเปลี่ยนเครื่อง" } }),
            params({ id: payload.key.id }),
        );
        expect(res.status).toBe(200);
        expect((await json<{ key: KeyDto }>(res)).key.status).toBe("revoked");
        expect((await callSearch(payload.apiKey)).status).toBe(401);

        const stored = await IntegrationApiKey.findById(payload.key.id).lean();
        expect(stored).not.toBeNull();
        expect(stored!.isActive).toBe(false);
        expect(stored!.revokedAt).toBeInstanceOf(Date);
        expect(String(stored!.revokedBy)).toBe(String(user._id));
        expect(stored!.revokeReason).toBe("POS ถูกเปลี่ยนเครื่อง");

        const again = await revokeRoute(
            adminRequest(`/api/admin/integration-keys/${payload.key.id}/revoke`, { method: "POST", token, body: { reason: "again" } }),
            params({ id: payload.key.id }),
        );
        expect(again.status).toBe(200);
        expect((await json<{ alreadyRevoked: boolean }>(again)).alreadyRevoked).toBe(true);

        const noReason = await revokeRoute(
            adminRequest(`/api/admin/integration-keys/${payload.key.id}/revoke`, { method: "POST", token, body: {} }),
            params({ id: payload.key.id }),
        );
        expect(noReason.status).toBe(400);
    });

    it("returns 403 when the key lacks the scope", async () => {
        const { apiKey } = await insertApiKey({ scopes: ["repair:read"] });
        const res = await createJobRoute(apiRequest(SEARCH, { method: "POST", apiKey, body: posPayload() }), noParams);
        expect(res.status).toBe(403);
        expect((await json<ErrorEnvelope>(res)).error.code).toBe("INSUFFICIENT_SCOPE");
        expect((await callSearch(apiKey)).status).toBe(200);
    });

    it("rotates: the old key stops working, the new one works", async () => {
        const { payload, token } = await createKeyAsSuperAdmin();
        const res = await rotateRoute(
            adminRequest(`/api/admin/integration-keys/${payload.key.id}/rotate`, { method: "POST", token }),
            params({ id: payload.key.id }),
        );
        expect(res.status).toBe(200);
        expect(res.headers.get("cache-control")).toBe("no-store");
        const rotated = await json<{ key: KeyDto; apiKey: string }>(res);
        expect(rotated.apiKey).not.toBe(payload.apiKey);
        expect(rotated.key.keyPrefix).toBe(payload.key.keyPrefix);
        expect(rotated.key.rotationCount).toBe(1);
        expect(rotated.key.rotatedAt).not.toBeNull();

        expect((await callSearch(payload.apiKey)).status).toBe(401);
        expect((await callSearch(rotated.apiKey)).status).toBe(200);

        // A revoked key cannot be rotated back to life.
        await revokeRoute(
            adminRequest(`/api/admin/integration-keys/${payload.key.id}/revoke`, { method: "POST", token, body: { reason: "done" } }),
            params({ id: payload.key.id }),
        );
        const afterRevoke = await rotateRoute(
            adminRequest(`/api/admin/integration-keys/${payload.key.id}/rotate`, { method: "POST", token }),
            params({ id: payload.key.id }),
        );
        expect(afterRevoke.status).toBe(409);
    });

    it("validates key creation input", async () => {
        const { token } = await createAdmin("super_admin");
        const post = (body: unknown, headers?: Record<string, string>) =>
            createKeyRoute(adminRequest("/api/admin/integration-keys", { method: "POST", token, body, headers }));
        expect((await post({ name: "x", scopes: [] })).status).toBe(400);
        expect((await post({ name: "x", scopes: ["admin:all"] })).status).toBe(400);
        expect((await post({ name: "", scopes: ["repair:read"] })).status).toBe(400);
        expect((await post({ name: "x", scopes: ["repair:read"], expiresAt: "2000-01-01T00:00:00Z" })).status).toBe(400);
        expect((await post({ name: "x", scopes: ["repair:read"], keyHash: "abc" })).status).toBe(400);
        expect((await post(JSON.stringify({ name: "x", scopes: ["repair:read"] }), { "content-type": "text/plain" })).status).toBe(415);
        expect(await IntegrationApiKey.countDocuments()).toBe(0);
    });

    it.each(["admin", "technician", "staff", "viewer", "custom_all_permissions"])("forbids %s from managing keys", async (role) => {
        if (role === "custom_all_permissions") {
            await Role.create({ name: role, displayName: "Custom", permissions: ALL_PERMISSIONS });
        }
        const { apiKey, id } = await insertApiKey();
        const { token } = await createAdmin(role);
        const responses = await Promise.all([
            listKeysRoute(adminRequest("/api/admin/integration-keys", { token })),
            createKeyRoute(adminRequest("/api/admin/integration-keys", { method: "POST", token, body: { name: "x", scopes: ["repair:read"] } })),
            rotateRoute(adminRequest(`/api/admin/integration-keys/${id}/rotate`, { method: "POST", token }), params({ id })),
            revokeRoute(adminRequest(`/api/admin/integration-keys/${id}/revoke`, { method: "POST", token, body: { reason: "x" } }), params({ id })),
        ]);
        expect(responses.map((r) => r.status)).toEqual([403, 403, 403, 403]);
        expect(await IntegrationApiKey.countDocuments()).toBe(1);
        expect((await callSearch(apiKey)).status).toBe(200);
    });

    it("requires a login to manage keys", async () => {
        const res = await listKeysRoute(adminRequest("/api/admin/integration-keys"));
        expect(res.status).toBe(401);
    });

    it("blocks non-super-admins in middleware for both the API and the page", async () => {
        const { token: adminToken } = await createAdmin("admin");
        const { token: superToken } = await createAdmin("super_admin");
        const api = await middleware(adminRequest("/api/admin/integration-keys", { token: adminToken }));
        expect(api.status).toBe(403);
        const page = await middleware(adminRequest("/admin/settings/integration-keys", { token: adminToken }));
        expect(page.status).toBe(307);
        expect(page.headers.get("location")).toBe("http://localhost:3000/admin");
        const allowed = await middleware(adminRequest("/admin/settings/integration-keys", { token: superToken }));
        expect(allowed.headers.get("x-middleware-next")).toBe("1");
        // The integration API itself does not depend on the admin cookie.
        const integration = await middleware(apiRequest(SEARCH));
        expect(integration.headers.get("x-middleware-next")).toBe("1");
    });

    it("writes create/rotate/revoke to AdminLog without any secret", async () => {
        const { payload, token } = await createKeyAsSuperAdmin();
        const rotated = await json<{ apiKey: string }>(await rotateRoute(
            adminRequest(`/api/admin/integration-keys/${payload.key.id}/rotate`, { method: "POST", token }),
            params({ id: payload.key.id }),
        ));
        await revokeRoute(
            adminRequest(`/api/admin/integration-keys/${payload.key.id}/revoke`, { method: "POST", token, body: { reason: "test" } }),
            params({ id: payload.key.id }),
        );
        const logs = await AdminLog.find({ targetType: "IntegrationApiKey" }).lean();
        expect(logs.map((log) => log.action).sort()).toEqual(["integration_key.created", "integration_key.revoked", "integration_key.rotated"]);
        const stored = await IntegrationApiKey.findById(payload.key.id).select("+keyHash").lean();
        const dump = JSON.stringify(logs);
        for (const key of [payload.apiKey, rotated.apiKey]) {
            expect(dump).not.toContain(key);
            expect(dump).not.toContain(parseApiKey(key)!.secret);
        }
        expect(dump).not.toContain(stored!.keyHash);
    });

    it("rate limits per key with 429 RATE_LIMITED", async () => {
        process.env.INTEGRATION_API_RATE_LIMIT = "2";
        const { apiKey } = await insertApiKey();
        expect((await callSearch(apiKey)).status).toBe(200);
        expect((await callSearch(apiKey)).status).toBe(200);
        const limited = await callSearch(apiKey);
        expect(limited.status).toBe(429);
        expect(limited.headers.get("retry-after")).toMatch(/^\d+$/);
        expect((await json<ErrorEnvelope>(limited)).error.code).toBe("RATE_LIMITED");

        const other = await insertApiKey();
        expect((await callSearch(other.apiKey)).status).toBe(200);
    });

    it("rate limits per IP before authentication", async () => {
        process.env.INTEGRATION_API_IP_RATE_LIMIT = "3";
        for (let i = 0; i < 3; i++) expect((await callSearch("nvc_live_bad")).status).toBe(401);
        expect((await callSearch("nvc_live_bad")).status).toBe(429);
    });
});
