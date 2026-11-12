import { expect, it } from "vitest";
import { GET as listRoute, POST as createRoute } from "@/app/api/admin/repair/jobs/route";
import { DELETE as deleteRoute, GET as getRoute, PATCH as patchRoute } from "@/app/api/admin/repair/jobs/[id]/route";
import { GET as branchesRoute } from "@/app/api/admin/repair/branches/route";
import { GET as statsRoute } from "@/app/api/admin/repair/stats/route";
import { POST as integrationCreateRoute } from "@/app/api/integration/v1/repair-jobs/route";
import { PUT as updateUserRoute } from "@/app/api/admin-users/[id]/route";
import type { RepairIntegrationDto } from "@/lib/repair/service";
import RepairJob from "@/models/RepairJob";
import AdminUser from "@/models/AdminUser";
import Role from "@/models/Role";
import { adminRequest, apiRequest, createAdmin, createBranch, describeDb, insertApiKey, json, noParams, params, posPayload } from "../helpers/db";

interface JobJson {
    _id: string;
    jobId: string;
    branchId?: string | { _id: string; name: string } | null;
    appointmentDate?: string | null;
    dataBackup?: { status: string; recordedBy: string; recordedAt: string };
    currentHolder?: { kind: string; label: string; branchId?: string };
}

const jobBody = (overrides: Record<string, unknown> = {}) => ({
    brand: "Apple",
    deviceModel: "iPhone 13",
    imei: "356938035643809",
    jobType: "repair",
    reportedSymptom: "แบตบวม",
    newCustomer: { firstName: "ลูกค้า", lastName: "ทดสอบ", phone: "0811111111" },
    dataBackupStatus: "customer_informed",
    ...overrides,
});

async function create(token: string, body: Record<string, unknown>) {
    const res = await createRoute(adminRequest("/api/admin/repair/jobs", { method: "POST", token, body }));
    return { res, job: res.status === 201 ? await json<JobJson>(res) : null };
}

const branchIdOf = (value: JobJson["branchId"]) => (value && typeof value === "object" ? value._id : value ?? null);

describeDb("repair jobs are scoped to the user's branches", () => {
    it("shows staff only their branches' jobs and answers 404 for the rest", async () => {
        const a = await createBranch("สาขา A");
        const b = await createBranch("สาขา B");
        const { token: admin } = await createAdmin("admin");
        const { job: jobA } = await create(admin, jobBody({ branchId: a.id }));
        const { job: jobB } = await create(admin, jobBody({ branchId: b.id }));

        const { token: techA } = await createAdmin("technician", undefined, { branchId: a.id });
        const list = await json<JobJson[]>(await listRoute(adminRequest("/api/admin/repair/jobs", { token: techA })));
        expect(list.map((job) => job._id)).toEqual([jobA!._id]);

        expect((await getRoute(adminRequest(`/api/admin/repair/jobs/${jobA!._id}`, { token: techA }), params({ id: jobA!._id }))).status).toBe(200);
        expect((await getRoute(adminRequest(`/api/admin/repair/jobs/${jobB!._id}`, { token: techA }), params({ id: jobB!._id }))).status).toBe(404);
        const patchB = await patchRoute(adminRequest(`/api/admin/repair/jobs/${jobB!._id}`, { method: "PATCH", token: techA, body: { status: "checking" } }), params({ id: jobB!._id }));
        expect(patchB.status).toBe(404);
        expect((await RepairJob.findById(jobB!._id).lean())!.status).toBe("pending");

        // A home branch plus extra branches adds up.
        const { token: techAB } = await createAdmin("technician", undefined, { branchId: a.id, branchIds: [b.id] });
        const both = await json<JobJson[]>(await listRoute(adminRequest("/api/admin/repair/jobs", { token: techAB })));
        expect(both).toHaveLength(2);

        // No branch at all: nothing.
        const { token: techNone } = await createAdmin("technician");
        expect(await json<JobJson[]>(await listRoute(adminRequest("/api/admin/repair/jobs", { token: techNone })))).toEqual([]);

        const stats = await json<{ stats: { total: number } }>(await statsRoute(adminRequest("/api/admin/repair/stats", { token: techA })));
        expect(stats.stats.total).toBe(1);
    });

    it("scopes custom roles too, including delete", async () => {
        const a = await createBranch("สาขา A");
        const b = await createBranch("สาขา B");
        const { token: admin } = await createAdmin("admin");
        const { job: jobA } = await create(admin, jobBody({ branchId: a.id }));
        const { job: jobB } = await create(admin, jobBody({ branchId: b.id }));
        // A custom role that may delete repair jobs but has no view_all_branches.
        await Role.create({ name: "branch_manager", displayName: "หัวหน้าสาขา", permissions: ["view_repair_jobs", "delete_repair_jobs"] });
        const { token: managerA } = await createAdmin("branch_manager", undefined, { branchId: a.id });

        expect((await deleteRoute(adminRequest(`/api/admin/repair/jobs/${jobB!._id}`, { method: "DELETE", token: managerA }), params({ id: jobB!._id }))).status).toBe(404);
        expect(await RepairJob.exists({ _id: jobB!._id })).toBeTruthy();
        expect((await deleteRoute(adminRequest(`/api/admin/repair/jobs/${jobA!._id}`, { method: "DELETE", token: managerA }), params({ id: jobA!._id }))).status).toBe(200);
    });

    it("lets roles with view_all_branches see every job, including unassigned ones", async () => {
        const a = await createBranch("สาขา A");
        const { token: admin } = await createAdmin("admin");
        await create(admin, jobBody({ branchId: a.id }));
        const key = await insertApiKey();
        // POS branch not mapped to any branch: the job has no branch.
        const pos = await json<RepairIntegrationDto>(await integrationCreateRoute(
            apiRequest("/api/integration/v1/repair-jobs", { method: "POST", apiKey: key.apiKey, body: posPayload({ branchId: "unmapped-pos-branch" }) }),
            noParams,
        ));
        expect((await RepairJob.findById(pos.id).lean())!.branchId ?? null).toBeNull();

        const list = await json<JobJson[]>(await listRoute(adminRequest("/api/admin/repair/jobs", { token: admin })));
        expect(list).toHaveLength(2);
        const { token: techA } = await createAdmin("technician", undefined, { branchId: a.id });
        expect(await json<JobJson[]>(await listRoute(adminRequest("/api/admin/repair/jobs", { token: techA })))).toHaveLength(1);
    });

    it("routes POS jobs to the branch mapped by POS branch id or branch code", async () => {
        const byId = await createBranch("สาขาตาม ID", ["pos-uuid-1"]);
        const byCode = await createBranch("สาขาตามรหัส", ["BKK02"]);
        const key = await insertApiKey();
        const send = async (body: Record<string, unknown>) => json<RepairIntegrationDto>(await integrationCreateRoute(
            apiRequest("/api/integration/v1/repair-jobs", { method: "POST", apiKey: key.apiKey, body: posPayload(body) }),
            noParams,
        ));
        const first = await send({ branchId: "pos-uuid-1" });
        const second = await send({ branchId: "pos-uuid-unknown", branchCode: "BKK02" });
        const firstJob = (await RepairJob.findById(first.id).lean())!;
        expect(String(firstJob.branchId)).toBe(byId.id);
        expect(firstJob.currentHolder).toMatchObject({ kind: "branch", label: "สาขาตาม ID" });
        expect(String((await RepairJob.findById(second.id).lean())!.branchId)).toBe(byCode.id);
    });

    it("needs a receiving branch inside the user's scope when creating", async () => {
        const a = await createBranch("สาขา A");
        const b = await createBranch("สาขา B");
        const { token: admin, username: adminName } = await createAdmin("admin");

        // Admins see every branch, so they must pick one.
        const missing = await create(admin, jobBody());
        expect(missing.res.status).toBe(400);
        expect((await json<{ fields: string[] }>(missing.res)).fields).toEqual(["branchId"]);

        const { job } = await create(admin, jobBody({ branchId: a.id, appointmentDate: "2026-11-20T10:00:00.000Z" }));
        expect(branchIdOf(job!.branchId)).toBe(a.id);
        expect(job!.appointmentDate).toBe("2026-11-20T10:00:00.000Z");
        expect(job!.dataBackup).toMatchObject({ status: "customer_informed", recordedBy: adminName });
        expect(job!.currentHolder).toMatchObject({ kind: "branch", label: "สาขา A" });

        // A user with one branch gets it by default, and cannot use another.
        const { token: techA } = await createAdmin("technician", undefined, { branchId: a.id });
        const defaulted = await create(techA, jobBody());
        expect(defaulted.res.status).toBe(201);
        expect(branchIdOf(defaulted.job!.branchId)).toBe(a.id);
        expect((await create(techA, jobBody({ branchId: b.id }))).res.status).toBe(400);

        // The data-on-device choice is required and must be a known value.
        expect((await create(admin, jobBody({ branchId: a.id, dataBackupStatus: undefined }))).res.status).toBe(400);
        expect((await create(admin, jobBody({ branchId: a.id, dataBackupStatus: "maybe" }))).res.status).toBe(400);
    });

    it("updates the appointment and data choice with the editor's name", async () => {
        const a = await createBranch("สาขา A");
        const { token: admin } = await createAdmin("admin");
        const { job } = await create(admin, jobBody({ branchId: a.id }));
        const { token: tech, username: techName } = await createAdmin("technician", undefined, { branchIds: [a.id] });

        const res = await patchRoute(adminRequest(`/api/admin/repair/jobs/${job!._id}`, {
            method: "PATCH",
            token: tech,
            body: { appointmentDate: "2026-12-01T09:30:00.000Z", dataBackupStatus: "customer_declined" },
        }), params({ id: job!._id }));
        expect(res.status).toBe(200);
        const updated = await json<JobJson>(res);
        expect(updated.appointmentDate).toBe("2026-12-01T09:30:00.000Z");
        expect(updated.dataBackup).toMatchObject({ status: "customer_declined", recordedBy: techName });
        // Populated for the UI.
        expect(updated.branchId).toMatchObject({ _id: a.id, name: "สาขา A" });

        const cleared = await patchRoute(adminRequest(`/api/admin/repair/jobs/${job!._id}`, { method: "PATCH", token: tech, body: { appointmentDate: null } }), params({ id: job!._id }));
        expect((await json<JobJson>(cleared)).appointmentDate ?? null).toBeNull();
        const bad = await patchRoute(adminRequest(`/api/admin/repair/jobs/${job!._id}`, { method: "PATCH", token: tech, body: { dataBackupStatus: "x" } }), params({ id: job!._id }));
        expect(bad.status).toBe(400);
    });

    it("lists only the branches a user may pick", async () => {
        const a = await createBranch("สาขา A");
        await createBranch("สาขา B");
        const { token: techA } = await createAdmin("technician", undefined, { branchId: a.id });
        const scoped = await json<{ branches: { _id: string }[]; allBranches: boolean }>(await branchesRoute(adminRequest("/api/admin/repair/branches", { token: techA })));
        expect(scoped.allBranches).toBe(false);
        expect(scoped.branches.map((branch) => branch._id)).toEqual([a.id]);

        const { token: admin } = await createAdmin("admin");
        const all = await json<{ branches: unknown[]; allBranches: boolean }>(await branchesRoute(adminRequest("/api/admin/repair/branches", { token: admin })));
        expect(all.allBranches).toBe(true);
        expect(all.branches).toHaveLength(2);
    });

    it("validates extra branches on admin users", async () => {
        const a = await createBranch("สาขา A");
        const { token: superAdmin } = await createAdmin("super_admin");
        const { user } = await createAdmin("technician");

        const ok = await updateUserRoute(adminRequest(`/api/admin-users/${user._id}`, { method: "PUT", token: superAdmin, body: { branchIds: [a.id, a.id] } }), params({ id: String(user._id) }));
        expect(ok.status).toBe(200);
        expect((await AdminUser.findById(user._id).lean())!.branchIds!.map(String)).toEqual([a.id]);
        const bad = await updateUserRoute(adminRequest(`/api/admin-users/${user._id}`, { method: "PUT", token: superAdmin, body: { branchIds: ["not-an-id"] } }), params({ id: String(user._id) }));
        expect(bad.status).toBe(400);
    });
});
