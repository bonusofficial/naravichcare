import mongoose from "mongoose";
import { expect, it } from "vitest";
import { GET as searchRoute, POST as createRoute } from "@/app/api/integration/v1/repair-jobs/route";
import { GET as getRoute } from "@/app/api/integration/v1/repair-jobs/[id]/route";
import { GET as costsRoute } from "@/app/api/integration/v1/repair-jobs/[id]/costs/route";
import { POST as cancelRoute } from "@/app/api/integration/v1/repair-jobs/[id]/cancel/route";
import { POST as handoverRoute } from "@/app/api/integration/v1/repair-jobs/[id]/handover/route";
import { PATCH as adminPatchRoute } from "@/app/api/admin/repair/jobs/[id]/route";
import { MAX_BODY_BYTES } from "@/lib/integration/http";
import { parseApiKey, type IntegrationScope } from "@/lib/integration/api-key";
import type { RepairIntegrationDto } from "@/lib/repair/service";
import { REPAIR_STATUSES, POS_STATUS_MAP } from "@/lib/repair/status";
import AdminLog from "@/models/AdminLog";
import RepairCustomer from "@/models/RepairCustomer";
import RepairJob from "@/models/RepairJob";
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

interface ErrorEnvelope {
    error: { code: string; message: string; requestId: string; details?: { field: string; message: string }[] };
}
interface Page {
    data: RepairIntegrationDto[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
}

const BASE = "/api/integration/v1/repair-jobs";

async function setup(scopes?: IntegrationScope[]) {
    const key = await insertApiKey({ scopes, name: "Web POS" });
    const create = (body: unknown, headers?: Record<string, string>) =>
        createRoute(apiRequest(BASE, { method: "POST", apiKey: key.apiKey, body, headers }), noParams);
    const get = (id: string) => getRoute(apiRequest(`${BASE}/${id}`, { apiKey: key.apiKey }), params({ id }));
    const search = (query: string) => searchRoute(apiRequest(`${BASE}?${query}`, { apiKey: key.apiKey }), noParams);
    const cancel = (id: string, body: unknown = { reason: "ยกเลิกจาก Web POS" }) =>
        cancelRoute(apiRequest(`${BASE}/${id}/cancel`, { method: "POST", apiKey: key.apiKey, body }), params({ id }));
    const handover = (id: string, body?: unknown) =>
        handoverRoute(apiRequest(`${BASE}/${id}/handover`, { method: "POST", apiKey: key.apiKey, body }), params({ id }));
    const costs = (id: string) => costsRoute(apiRequest(`${BASE}/${id}/costs`, { apiKey: key.apiKey }), params({ id }));
    return { key, create, get, search, cancel, handover, costs };
}

/** Walk a job through the admin API, as a technician would. */
async function adminMoveTo(id: string, statuses: string[]) {
    const { token } = await createAdmin("super_admin");
    for (const status of statuses) {
        const res = await adminPatchRoute(adminRequest(`/api/admin/repair/jobs/${id}`, { method: "PATCH", token, body: { status } }), params({ id }));
        expect(res.status, `move to ${status}`).toBe(200);
    }
}

describeDb("repair integration API", () => {
    it("creates a store-owned job from the current POS payload", async () => {
        const api = await setup();
        const payload = posPayload();
        const res = await api.create(payload);
        expect(res.status).toBe(201);
        const body = await json<RepairIntegrationDto>(res);
        expect(body.id).toMatch(/^[0-9a-f]{24}$/);
        expect(body.reference).toMatch(/^JOB\d{4}-\d{4}$/);
        expect(body.externalRef).toBe(payload.reference);
        expect(body.ownerType).toBe("store");
        expect(body.source).toBe("pos");
        expect(body.status).toBe("pending");
        expect(body.posStatus).toBe("sent");
        expect(body.device).toMatchObject({ productCode: "NV-00001", imei: "356938035643809", model: "Apple iPhone 13 128GB", branchId: payload.branchId });
        expect(res.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);

        const stored = await RepairJob.findById(body.id).lean();
        expect(stored!.customer ?? null).toBeNull();
        expect(stored!.brand).toBe("Apple");
        expect(stored!.deviceModel).toBe("iPhone 13 128GB");
        expect(stored!.statusHistory).toHaveLength(1);
        expect(stored!.statusHistory[0]).toMatchObject({ status: "pending", actorType: "integration", changedBy: "integration:Web POS" });
        expect(await RepairCustomer.countDocuments()).toBe(0);
    });

    it("creates a customer-owned job only with valid customer data and keeps it out of the DTO", async () => {
        const api = await setup();
        const customer = { firstName: "สมชาย", lastName: "ใจดี", phone: "0812345678" };
        const res = await api.create(posPayload({ ownerType: "customer", customer }));
        expect(res.status).toBe(201);
        const text = await res.text();
        expect(text).not.toContain("0812345678");
        expect(text).not.toContain("สมชาย");
        const job = await RepairJob.findById((JSON.parse(text) as RepairIntegrationDto).id).lean();
        expect(job!.ownerType).toBe("customer");
        expect(job!.customer).toBeTruthy();

        // Reuses the existing customer by phone, as the admin flow does.
        expect((await api.create(posPayload({ ownerType: "customer", customer }))).status).toBe(201);
        expect(await RepairCustomer.countDocuments()).toBe(1);

        expect((await api.create(posPayload({ ownerType: "customer" }))).status).toBe(400);
    });

    it("does not create a second job for a repeated reference", async () => {
        const api = await setup();
        const payload = posPayload();
        const first = await json<RepairIntegrationDto>(await api.create(payload));
        const replay = await api.create(payload);
        expect(replay.status).toBe(200);
        expect(replay.headers.get("idempotent-replayed")).toBe("true");
        expect((await json<RepairIntegrationDto>(replay)).id).toBe(first.id);
        expect(await RepairJob.countDocuments()).toBe(1);

        const conflict = await api.create({ ...payload, symptom: "แบตเสื่อม" });
        expect(conflict.status).toBe(409);
        expect((await json<ErrorEnvelope>(conflict)).error.code).toBe("EXTERNAL_REFERENCE_CONFLICT");
        expect(await RepairJob.countDocuments()).toBe(1);
    });

    it("honours Idempotency-Key", async () => {
        const api = await setup();
        const payload = posPayload();
        const headers = { "idempotency-key": "pos-req-0001-abcdef" };
        const first = await api.create(payload, headers);
        expect(first.status).toBe(201);
        const firstBody = await json<RepairIntegrationDto>(first);
        const replay = await api.create(payload, headers);
        expect(replay.status).toBe(200);
        expect((await json<RepairIntegrationDto>(replay)).id).toBe(firstBody.id);

        const conflict = await api.create(posPayload(), headers);
        expect(conflict.status).toBe(409);
        expect((await json<ErrorEnvelope>(conflict)).error.code).toBe("IDEMPOTENCY_CONFLICT");

        const badKey = await api.create(posPayload(), { "idempotency-key": "bad key!" });
        expect(badKey.status).toBe(400);
        expect(await RepairJob.countDocuments()).toBe(1);
    });

    it("creates exactly one job under concurrent identical requests", async () => {
        const api = await setup();
        const payload = posPayload();
        const responses = await Promise.all(Array.from({ length: 12 }, () => api.create(payload)));
        const statuses = responses.map((r) => r.status).sort();
        expect(statuses.filter((s) => s === 201)).toHaveLength(1);
        expect(statuses.every((s) => s === 200 || s === 201)).toBe(true);
        const ids = new Set(await Promise.all(responses.map(async (r) => (await json<RepairIntegrationDto>(r)).id)));
        expect(ids.size).toBe(1);
        expect(await RepairJob.countDocuments({ externalRef: payload.reference })).toBe(1);

        const keyed = posPayload();
        const keyedResponses = await Promise.all(Array.from({ length: 8 }, () => api.create(keyed, { "idempotency-key": "concurrent-key-1" })));
        expect(keyedResponses.filter((r) => r.status === 201)).toHaveLength(1);
        expect(await RepairJob.countDocuments({ externalRef: keyed.reference })).toBe(1);
    });

    it("hands out unique job numbers to concurrent creates", async () => {
        const api = await setup();
        const responses = await Promise.all(Array.from({ length: 15 }, () => api.create(posPayload())));
        expect(responses.every((r) => r.status === 201)).toBe(true);
        const refs = await Promise.all(responses.map(async (r) => (await json<RepairIntegrationDto>(r)).reference));
        expect(new Set(refs).size).toBe(15);
    });

    it("rejects non-allowlisted fields and saves nothing", async () => {
        const api = await setup();
        const res = await api.create({ ...posPayload(), jobId: "JOB0000-9999", statusHistory: [{ status: "completed" }], internalNotes: "x" });
        expect(res.status).toBe(400);
        const body = await json<ErrorEnvelope>(res);
        expect(body.error.code).toBe("VALIDATION_ERROR");
        expect(body.error.details!.map((d) => d.field)).toEqual(expect.arrayContaining(["jobId", "statusHistory", "internalNotes"]));
        expect(await RepairJob.countDocuments()).toBe(0);
    });

    it("validates IMEI, images, content type, JSON and body size", async () => {
        const api = await setup();
        expect((await api.create(posPayload({ imei: "1234" }))).status).toBe(400);
        expect((await api.create(posPayload({ imageUrls: ["data:image/jpeg;base64,/9j/4AAQSkZJRg=="] }))).status).toBe(400);
        expect((await api.create(posPayload({ imageUrls: Array.from({ length: 11 }, (_, i) => `https://cdn.example.com/${i}.jpg`) }))).status).toBe(400);
        expect((await api.create(posPayload({ imageUrls: ["http://cdn.example.com/a.jpg"] }))).status).toBe(400);
        expect((await api.create(JSON.stringify(posPayload()), { "content-type": "text/plain" })).status).toBe(415);
        expect((await api.create("{not json")).status).toBe(400);
        expect((await api.create("[]")).status).toBe(400);
        expect((await api.create(posPayload({ symptom: "x".repeat(MAX_BODY_BYTES) }))).status).toBe(413);
        expect(await RepairJob.countDocuments()).toBe(0);

        const ok = await api.create(posPayload({ imageUrls: ["/api/product-images/files/a.jpg", "https://cdn.example.com/b.jpg"] }));
        expect(ok.status).toBe(201);
        expect((await json<RepairIntegrationDto>(ok)).imageUrls).toEqual(["/api/product-images/files/a.jpg", "https://cdn.example.com/b.jpg"]);
    });

    it("returns only the integration DTO", async () => {
        const api = await setup();
        const created = await json<RepairIntegrationDto>(await api.create(posPayload()));
        await RepairJob.updateOne(
            { _id: created.id },
            { $set: { internalNotes: "staff only note", photosBefore: ["data:image/png;base64,iVBORw0KGgo="], diagnosticResult: "x" } },
        );
        const res = await api.get(created.id);
        expect(res.status).toBe(200);
        const text = await res.text();
        const body = JSON.parse(text) as Record<string, unknown>;
        expect(Object.keys(body).sort()).toEqual(
            ["cancelReason", "costs", "device", "externalRef", "id", "imageUrls", "ownerType", "posStatus", "reference", "repairItems", "source", "status", "symptom", "timestamps"].sort(),
        );
        for (const forbidden of ["staff only note", "iVBORw0KGgo", "statusHistory", "internalNotes", "requestHash", "idempotencyKey", "clientKeyId", "__v", "_id", "keyHash"]) {
            expect(text).not.toContain(forbidden);
        }
    });

    it("does not expose jobs that were not created through the integration", async () => {
        const api = await setup();
        const adminJob = await RepairJob.create({
            customer: new mongoose.Types.ObjectId(),
            deviceType: "Smartphone",
            brand: "Samsung",
            deviceModel: "S24",
            reportedSymptom: "จอแตก",
            imei: "356938035643809",
        });
        expect((await api.get(String(adminJob._id))).status).toBe(404);
        expect((await api.get("not-an-id")).status).toBe(404);
        const page = await json<Page>(await api.search("imei=356938035643809"));
        expect(page.data).toHaveLength(0);
        const notFound = await api.get(new mongoose.Types.ObjectId().toString());
        expect((await json<ErrorEnvelope>(notFound)).error.code).toBe("NOT_FOUND");
    });

    it("searches by exact externalRef and IMEI", async () => {
        const api = await setup();
        await api.create(posPayload({ reference: "REP-A1", imei: "356938035643809" }));
        await api.create(posPayload({ reference: "REP-A10", imei: "356938035643817" }));
        await api.create(posPayload({ reference: "REP-B1", imei: "356938035643809" }));

        const byRef = await json<Page>(await api.search("externalRef=REP-A1"));
        expect(byRef.data.map((job) => job.externalRef)).toEqual(["REP-A1"]);
        const byImei = await json<Page>(await api.search("imei=356938035643809"));
        expect(byImei.data.map((job) => job.externalRef).sort()).toEqual(["REP-A1", "REP-B1"]);
        const both = await json<Page>(await api.search("externalRef=REP-B1&imei=356938035643809"));
        expect(both.data).toHaveLength(1);
        // Pattern-like input is refused rather than turned into a regex.
        expect((await api.search("externalRef=REP-A.*")).status).toBe(400);
        expect((await api.search("imei=35693803564")).status).toBe(400);
        expect((await api.search("q=anything")).status).toBe(400);
    });

    it("paginates with a hard maximum page size", async () => {
        const api = await setup();
        for (let i = 0; i < 5; i++) await api.create(posPayload());
        const page2 = await json<Page>(await api.search("limit=2&page=2"));
        expect(page2.data).toHaveLength(2);
        expect(page2.pagination).toEqual({ page: 2, limit: 2, total: 5, totalPages: 3 });
        const page3 = await json<Page>(await api.search("limit=2&page=3"));
        expect(page3.data).toHaveLength(1);
        const first = await json<Page>(await api.search(""));
        expect(first.pagination.limit).toBe(20);
        expect((await api.search("limit=101")).status).toBe(400);
        expect((await api.search("limit=100")).status).toBe(200);
    });

    it("cancels with state checks, is idempotent, and logs the reason", async () => {
        const api = await setup();
        const job = await json<RepairIntegrationDto>(await api.create(posPayload()));
        expect((await api.cancel(job.id, {})).status).toBe(400);

        const res = await api.cancel(job.id);
        expect(res.status).toBe(200);
        const body = await json<RepairIntegrationDto>(res);
        expect(body.status).toBe("cancelled");
        expect(body.posStatus).toBe("cancelled");
        expect(body.cancelReason).toBe("ยกเลิกจาก Web POS");
        expect(body.timestamps.cancelledAt).not.toBeNull();

        const stored = await RepairJob.findById(job.id).lean();
        expect(stored!.statusHistory).toHaveLength(2);
        expect(stored!.statusHistory[1]).toMatchObject({ status: "cancelled", actorType: "integration", changedBy: "integration:Web POS", note: "ยกเลิกจาก Web POS" });
        const logs = await AdminLog.find({ action: "repair_integration.cancelled", targetId: job.id }).lean();
        expect(logs).toHaveLength(1);
        expect(logs[0].adminName).toBe("integration:Web POS");

        const again = await api.cancel(job.id);
        expect(again.status).toBe(200);
        expect((await RepairJob.findById(job.id).lean())!.statusHistory).toHaveLength(2);
        expect(await AdminLog.countDocuments({ action: "repair_integration.cancelled" })).toBe(1);
    });

    it("refuses to cancel a finished repair", async () => {
        const api = await setup();
        const ready = await json<RepairIntegrationDto>(await api.create(posPayload()));
        await adminMoveTo(ready.id, ["in_progress", "ready_pickup"]);
        const res = await api.cancel(ready.id);
        expect(res.status).toBe(409);
        expect((await json<ErrorEnvelope>(res)).error.code).toBe("REPAIR_CLOSED");

        await api.handover(ready.id);
        const completed = await api.cancel(ready.id);
        expect(completed.status).toBe(409);
        expect((await json<ErrorEnvelope>(completed)).error.code).toBe("REPAIR_CLOSED");
    });

    it("concurrent cancels write one history entry", async () => {
        const api = await setup();
        const job = await json<RepairIntegrationDto>(await api.create(posPayload()));
        const responses = await Promise.all(Array.from({ length: 6 }, () => api.cancel(job.id)));
        expect(responses.every((r) => r.status === 200)).toBe(true);
        const stored = await RepairJob.findById(job.id).lean();
        expect(stored!.statusHistory.filter((h) => h.status === "cancelled")).toHaveLength(1);
    });

    it("hands over only from ready_pickup, once", async () => {
        const api = await setup();
        const job = await json<RepairIntegrationDto>(await api.create(posPayload()));
        const early = await api.handover(job.id);
        expect(early.status).toBe(409);
        expect((await json<ErrorEnvelope>(early)).error.code).toBe("INVALID_STATUS_TRANSITION");

        await adminMoveTo(job.id, ["in_progress", "ready_pickup"]);
        const ready = await json<RepairIntegrationDto>(await api.get(job.id));
        expect(ready.posStatus).toBe("completed");
        expect(ready.timestamps.repairCompletedAt).not.toBeNull();
        expect(ready.timestamps.handedOverAt).toBeNull();

        const res = await api.handover(job.id);
        expect(res.status).toBe(200);
        const body = await json<RepairIntegrationDto>(res);
        expect(body.status).toBe("completed");
        expect(body.timestamps.handedOverAt).not.toBeNull();
        const stored = await RepairJob.findById(job.id).lean();
        expect(stored!.completedAt).toBeInstanceOf(Date);
        const historyLength = stored!.statusHistory.length;
        expect(stored!.statusHistory.at(-1)).toMatchObject({ status: "completed", actorType: "integration" });

        expect((await api.handover(job.id)).status).toBe(200);
        expect((await RepairJob.findById(job.id).lean())!.statusHistory).toHaveLength(historyLength);
        expect(await AdminLog.countDocuments({ action: "repair_integration.handed_over", targetId: job.id })).toBe(1);

        const cancelled = await json<RepairIntegrationDto>(await api.create(posPayload()));
        await api.cancel(cancelled.id);
        const closed = await api.handover(cancelled.id, {});
        expect(closed.status).toBe(409);
        expect((await json<ErrorEnvelope>(closed)).error.code).toBe("REPAIR_CLOSED");
    });

    it("computes costs on the server with explicit meanings", async () => {
        const api = await setup();
        const job = await json<RepairIntegrationDto>(await api.create(posPayload()));
        const initial = await json<Record<string, unknown>>(await api.costs(job.id));
        expect(initial).toMatchObject({ partsPurchaseCost: 0, customerChargeTotal: 0, version: 1, currency: "THB" });

        const { token } = await createAdmin("super_admin");
        const patch = await adminPatchRoute(adminRequest(`/api/admin/repair/jobs/${job.id}`, {
            method: "PATCH",
            token,
            body: { laborCost: 500, partsCost: 1500, partsPurchaseCost: 900, totalPrice: 1 },
        }), params({ id: job.id }));
        expect(patch.status).toBe(200);

        const res = await api.costs(job.id);
        expect(res.status).toBe(200);
        expect(await json<Record<string, unknown>>(res)).toMatchObject({
            id: job.id,
            partsPurchaseCost: 900,
            partsSellingPrice: 1500,
            laborCost: 500,
            inventoryCostTotal: 1400,
            customerChargeTotal: 2000,
            currency: "THB",
            version: 2,
        });
        expect((await RepairJob.findById(job.id).lean())!.totalPrice).toBe(2000);
        expect((await json<RepairIntegrationDto>(await api.get(job.id))).costs.customerChargeTotal).toBe(2000);
    });

    it("maps every status to the POS status", async () => {
        const api = await setup();
        const job = await json<RepairIntegrationDto>(await api.create(posPayload()));
        for (const status of REPAIR_STATUSES) {
            await RepairJob.updateOne({ _id: job.id }, { $set: { status } });
            const body = await json<RepairIntegrationDto>(await api.get(job.id));
            expect(body.posStatus, status).toBe(POS_STATUS_MAP[status]);
        }
    });

    it("enforces the scope of each endpoint", async () => {
        const writer = await setup();
        const job = await json<RepairIntegrationDto>(await writer.create(posPayload()));
        const reader = await setup(["repair:read"]);
        expect((await reader.get(job.id)).status).toBe(200);
        expect((await reader.costs(job.id)).status).toBe(200);
        expect((await reader.create(posPayload())).status).toBe(403);
        expect((await reader.cancel(job.id)).status).toBe(403);
        expect((await reader.handover(job.id)).status).toBe(403);
        const writeOnly = await setup(["repair:write"]);
        expect((await writeOnly.get(job.id)).status).toBe(403);
    });

    it("logs creation as the integration client without any secret", async () => {
        const api = await setup();
        const job = await json<RepairIntegrationDto>(await api.create(posPayload()));
        const logs = await AdminLog.find({ action: "repair_integration.created", targetId: job.id }).lean();
        expect(logs).toHaveLength(1);
        expect(logs[0].adminName).toBe("integration:Web POS");
        const dump = JSON.stringify(logs);
        expect(dump).not.toContain(parseApiKey(api.key.apiKey)!.secret);
    });

    it("returns the request id inside error bodies", async () => {
        const api = await setup();
        const res = await api.get(new mongoose.Types.ObjectId().toString());
        const body = await json<ErrorEnvelope>(res);
        expect(body.error.requestId).toBe(res.headers.get("x-request-id"));
        expect(JSON.stringify(body)).not.toMatch(/stack|node_modules|\/Users\//);
    });
});
