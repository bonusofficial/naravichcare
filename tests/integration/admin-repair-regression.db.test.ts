import mongoose from "mongoose";
import { expect, it } from "vitest";
import { GET as listRoute, POST as createRoute } from "@/app/api/admin/repair/jobs/route";
import { DELETE as deleteRoute, GET as getRoute, PATCH as patchRoute } from "@/app/api/admin/repair/jobs/[id]/route";
import { POST as integrationCreateRoute } from "@/app/api/integration/v1/repair-jobs/route";
import { GET as meRoute } from "@/app/api/auth/me/route";
import { repairJobPrefix } from "@/lib/repair/sequence";
import type { RepairIntegrationDto } from "@/lib/repair/service";
import { middleware } from "@/middleware";
import RepairCustomer from "@/models/RepairCustomer";
import RepairJob from "@/models/RepairJob";
import { adminRequest, apiRequest, createAdmin, describeDb, insertApiKey, json, noParams, params, posPayload } from "../helpers/db";

interface JobJson {
    _id: string;
    jobId: string;
    status: string;
    totalPrice: number;
    customer?: { _id: string; firstName: string; phone: string } | null;
    ownerType?: string;
    source?: string;
    statusHistory: { status: string; changedBy: string; actorType?: string; note?: string }[];
}

const newJobBody = (overrides: Record<string, unknown> = {}) => ({
    deviceType: "Smartphone",
    brand: "Samsung",
    deviceModel: "Galaxy S24",
    serialNumber: "",
    imei: "356938035643809",
    color: "Black",
    deviceCondition: "รอยขีดข่วน",
    accessories: [],
    jobType: "repair",
    reportedSymptom: "จอไม่ติด",
    internalNotes: "",
    newCustomer: { firstName: "สมหญิง", lastName: "ทดสอบ", phone: "0899999999", lineId: "", address: "", notes: "" },
    ...overrides,
});

async function createAdminJob(token: string, body: Record<string, unknown> = newJobBody()) {
    const res = await createRoute(adminRequest("/api/admin/repair/jobs", { method: "POST", token, body }));
    return { res, job: res.status === 201 ? await json<JobJson>(res) : null };
}

async function patch(token: string, id: string, body: Record<string, unknown>) {
    return patchRoute(adminRequest(`/api/admin/repair/jobs/${id}`, { method: "PATCH", token, body }), params({ id }));
}

describeDb("admin repair workflow (regression)", () => {
    it("still creates a customer repair job from the admin form", async () => {
        const { token, username } = await createAdmin("admin");
        const { res, job } = await createAdminJob(token);
        expect(res.status).toBe(201);
        expect(job!.jobId).toMatch(/^JOB\d{4}-\d{4}$/);
        expect(job!.ownerType).toBe("customer");
        expect(job!.source).toBe("admin");
        expect(job!.statusHistory[0]).toMatchObject({ status: "pending", changedBy: username, actorType: "admin" });
        const customer = await RepairCustomer.findOne({ phone: "0899999999" }).lean();
        expect(customer!.customerId).toBe("CUS00001");

        const reuse = await createAdminJob(token, newJobBody({ newCustomer: null, customer: String(customer!._id) }));
        expect(reuse.res.status).toBe(201);
        expect(await RepairCustomer.countDocuments()).toBe(1);
    });

    it("still requires customer data and device details for admin jobs", async () => {
        const { token } = await createAdmin("admin");
        expect((await createAdminJob(token, newJobBody({ newCustomer: null }))).res.status).toBe(400);
        expect((await createAdminJob(token, newJobBody({ brand: "" }))).res.status).toBe(400);
        expect((await createAdminJob(token, newJobBody({ newCustomer: null, customer: new mongoose.Types.ObjectId().toString() }))).res.status).toBe(400);
    });

    it("refuses client-set internal fields on create", async () => {
        const { token } = await createAdmin("admin");
        for (const extra of [{ jobId: "JOB0000-0001" }, { statusHistory: [] }, { totalPrice: 5 }, { _id: new mongoose.Types.ObjectId().toString() }, { createdAt: "2020-01-01" }]) {
            expect((await createAdminJob(token, newJobBody(extra))).res.status).toBe(400);
        }
        expect(await RepairJob.countDocuments()).toBe(0);
    });

    it("persists status history with the actor from the JWT, not the body", async () => {
        const { token: creatorToken } = await createAdmin("admin");
        const { job } = await createAdminJob(creatorToken);
        const { token, username } = await createAdmin("technician", "tech_somchai");
        const res = await patch(token, job!._id, { status: "checking", statusNote: "เริ่มตรวจ", adminUsername: "Super Admin" });
        expect(res.status).toBe(200);
        const stored = await RepairJob.findById(job!._id).lean();
        expect(stored!.status).toBe("checking");
        expect(stored!.statusHistory).toHaveLength(2);
        expect(stored!.statusHistory[1]).toMatchObject({ status: "checking", changedBy: username, actorType: "admin", note: "เริ่มตรวจ" });
        expect(JSON.stringify(stored!.statusHistory)).not.toContain("Super Admin");
    });

    it("enforces the state machine on admin status changes", async () => {
        const { token } = await createAdmin("admin");
        const { job } = await createAdminJob(token);
        const jump = await patch(token, job!._id, { status: "completed" });
        expect(jump.status).toBe(409);
        expect((await json<{ code: string }>(jump)).code).toBe("INVALID_STATUS_TRANSITION");
        expect((await RepairJob.findById(job!._id).lean())!.status).toBe("pending");

        for (const status of ["in_progress", "ready_pickup", "completed"]) {
            expect((await patch(token, job!._id, { status })).status).toBe(200);
        }
        const stored = await RepairJob.findById(job!._id).lean();
        expect(stored!.statusHistory.map((h) => h.status)).toEqual(["pending", "in_progress", "ready_pickup", "completed"]);
        expect(stored!.repairCompletedAt).toBeInstanceOf(Date);
        expect(stored!.handedOverAt).toBeInstanceOf(Date);
        expect(stored!.completedAt).toBeInstanceOf(Date);
        expect((await patch(token, job!._id, { status: "in_progress" })).status).toBe(409);
    });

    it("rejects PATCH of internal fields and leaves the job unchanged", async () => {
        const { token } = await createAdmin("admin");
        const { job } = await createAdminJob(token);
        for (const body of [{ jobId: "HACKED" }, { statusHistory: [] }, { createdAt: "2020-01-01" }, { _id: "x" }, { customer: null }, { source: "pos" }]) {
            expect((await patch(token, job!._id, body)).status).toBe(400);
        }
        const stored = await RepairJob.findById(job!._id).lean();
        expect(stored!.jobId).toBe(job!.jobId);
        expect(stored!.statusHistory).toHaveLength(1);
    });

    it("computes totalPrice on the server and ignores a client total", async () => {
        const { token } = await createAdmin("admin");
        const { job } = await createAdminJob(token);
        const res = await patch(token, job!._id, { laborCost: 300, partsCost: 1200.5, partsPurchaseCost: 800, totalPrice: 1 });
        expect(res.status).toBe(200);
        expect((await json<JobJson>(res)).totalPrice).toBe(1500.5);
        expect((await patch(token, job!._id, { laborCost: -5 })).status).toBe(400);
    });

    it("lists customer and store-owned jobs together", async () => {
        const { token } = await createAdmin("viewer");
        const { token: adminToken } = await createAdmin("admin");
        await createAdminJob(adminToken);
        const key = await insertApiKey();
        const posJob = await json<RepairIntegrationDto>(await integrationCreateRoute(
            apiRequest("/api/integration/v1/repair-jobs", { method: "POST", apiKey: key.apiKey, body: posPayload({ reference: "REP-LIST-1" }) }),
            noParams,
        ));

        const res = await listRoute(adminRequest("/api/admin/repair/jobs?status=all", { token }));
        expect(res.status).toBe(200);
        const jobs = await json<JobJson[]>(res);
        expect(jobs).toHaveLength(2);
        const store = jobs.find((j) => j._id === posJob.id)!;
        // Store-owned jobs have no customer at all (the field is absent).
        expect(store.customer ?? null).toBeNull();
        expect(store.ownerType).toBe("store");
        expect(jobs.find((j) => j._id !== posJob.id)!.customer!.firstName).toBe("สมหญิง");

        const byRef = await json<JobJson[]>(await listRoute(adminRequest("/api/admin/repair/jobs?q=REP-LIST", { token })));
        expect(byRef.map((j) => j._id)).toEqual([posJob.id]);
        // Regex metacharacters are searched literally instead of crashing the query.
        expect((await listRoute(adminRequest(`/api/admin/repair/jobs?q=${encodeURIComponent("(((")}`, { token }))).status).toBe(200);

        const detail = await getRoute(adminRequest(`/api/admin/repair/jobs/${posJob.id}`, { token }), params({ id: posJob.id }));
        expect(detail.status).toBe(200);
    });

    it("lets admins move a store-owned POS job through the workflow", async () => {
        const { token } = await createAdmin("technician");
        const key = await insertApiKey();
        const posJob = await json<RepairIntegrationDto>(await integrationCreateRoute(
            apiRequest("/api/integration/v1/repair-jobs", { method: "POST", apiKey: key.apiKey, body: posPayload() }),
            noParams,
        ));
        const res = await patch(token, posJob.id, { status: "checking", laborCost: 100 });
        expect(res.status).toBe(200);
        const body = await json<JobJson>(res);
        expect(body.status).toBe("checking");
        expect(body.customer ?? null).toBeNull();
    });

    it("does not hard-delete POS jobs but still deletes admin jobs", async () => {
        const { token } = await createAdmin("super_admin");
        const key = await insertApiKey();
        const posJob = await json<RepairIntegrationDto>(await integrationCreateRoute(
            apiRequest("/api/integration/v1/repair-jobs", { method: "POST", apiKey: key.apiKey, body: posPayload() }),
            noParams,
        ));
        const blocked = await deleteRoute(adminRequest(`/api/admin/repair/jobs/${posJob.id}`, { method: "DELETE", token }), params({ id: posJob.id }));
        expect(blocked.status).toBe(409);
        expect(await RepairJob.exists({ _id: posJob.id })).toBeTruthy();

        const { job } = await createAdminJob(token);
        const ok = await deleteRoute(adminRequest(`/api/admin/repair/jobs/${job!._id}`, { method: "DELETE", token }), params({ id: job!._id }));
        expect(ok.status).toBe(200);
    });

    it("keeps the existing permission matrix", async () => {
        const { token: adminToken } = await createAdmin("admin");
        const { job } = await createAdminJob(adminToken);
        const { token: viewer } = await createAdmin("viewer");
        const { token: staff } = await createAdmin("staff");
        const { token: tech } = await createAdmin("technician");
        expect((await patch(viewer, job!._id, { status: "checking" })).status).toBe(403);
        expect((await createAdminJob(viewer)).res.status).toBe(403);
        expect((await listRoute(adminRequest("/api/admin/repair/jobs", { token: staff }))).status).toBe(403);
        expect((await deleteRoute(adminRequest(`/api/admin/repair/jobs/${job!._id}`, { method: "DELETE", token: tech }), params({ id: job!._id }))).status).toBe(403);
        expect((await patch(tech, job!._id, { status: "checking" })).status).toBe(200);
        expect((await listRoute(adminRequest("/api/admin/repair/jobs"))).status).toBe(401);
    });

    it("keeps existing authentication working", async () => {
        const { token, username } = await createAdmin("admin");
        const me = await meRoute(adminRequest("/api/auth/me", { token }));
        expect(me.status).toBe(200);
        const body = await json<{ user: { username: string; password?: string }; permissions: string[] }>(me);
        expect(body.user.username).toBe(username);
        expect(body.user.password).toBeUndefined();
        expect(body.permissions).toContain("view_repair_jobs");
        expect((await meRoute(adminRequest("/api/auth/me", { token: "invalid.token.value" }))).status).toBe(401);

        const noCookie = await middleware(adminRequest("/admin/repair/jobs"));
        expect(noCookie.status).toBe(307);
        expect(noCookie.headers.get("location")).toContain("/admin/login");
        expect((await middleware(adminRequest("/api/admin/repair/jobs"))).status).toBe(401);
        expect((await middleware(adminRequest("/admin/repair/jobs", { token }))).headers.get("x-middleware-next")).toBe("1");
        // Existing super_admin-only rule for user management is unchanged.
        expect((await middleware(adminRequest("/api/admin/users", { token }))).status).toBe(403);
    });

    it("continues job numbers after existing ones instead of counting documents", async () => {
        const prefix = repairJobPrefix();
        await RepairJob.collection.insertOne({
            jobId: `${prefix}0042`,
            customer: new mongoose.Types.ObjectId(),
            deviceType: "Smartphone",
            brand: "Old",
            deviceModel: "Job",
            reportedSymptom: "legacy",
            status: "completed",
            statusHistory: [],
        });
        await RepairCustomer.collection.insertOne({ customerId: "CUS00010", firstName: "a", lastName: "b", phone: "0800000000" });

        const { token } = await createAdmin("admin");
        const { job } = await createAdminJob(token);
        expect(job!.jobId).toBe(`${prefix}0043`);
        expect((await RepairCustomer.findOne({ phone: "0899999999" }).lean())!.customerId).toBe("CUS00011");
    });
});
