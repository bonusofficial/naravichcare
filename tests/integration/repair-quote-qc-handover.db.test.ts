import { expect, it } from "vitest";
import { POST as createRoute } from "@/app/api/admin/repair/jobs/route";
import { PATCH as patchRoute } from "@/app/api/admin/repair/jobs/[id]/route";
import { POST as approvalRoute } from "@/app/api/admin/repair/jobs/[id]/quote-approvals/route";
import { POST as qcRoute } from "@/app/api/admin/repair/jobs/[id]/qc/route";
import { POST as handoverRoute } from "@/app/api/admin/repair/jobs/[id]/handover/route";
import { POST as posCreateRoute } from "@/app/api/integration/v1/repair-jobs/route";
import { GET as posGetRoute } from "@/app/api/integration/v1/repair-jobs/[id]/route";
import { POST as posHandoverRoute } from "@/app/api/integration/v1/repair-jobs/[id]/handover/route";
import { QC_ITEM_KEYS } from "@/lib/repair/options";
import type { RepairIntegrationDto } from "@/lib/repair/service";
import AdminLog from "@/models/AdminLog";
import RepairJob from "@/models/RepairJob";
import { adminRequest, apiRequest, createAdmin, createBranch, describeDb, insertApiKey, json, noParams, params, posPayload } from "../helpers/db";

interface JobJson {
    _id: string;
    status: string;
    totalPrice: number;
    costsVersion: number;
    quotationApproved: string;
    outcome?: string;
    quoteApprovals: { round: number; laborCost: number; partsCost: number; totalPrice: number; costsVersion: number; decision: string; channel: string; approverName: string; decidedAt: string; recordedBy: string }[];
    qcChecks: { overall: string; items: { key: string; result: string }[]; checkedBy: string }[];
    handover?: { receiverName: string; receiverPhone?: string; receiverRelation?: string; handedOverBy: string; handedOverAt: string; note?: string };
}

const allPass = () => QC_ITEM_KEYS.map((key) => ({ key, result: "pass" }));

async function setup() {
    const { id: branchId } = await createBranch("สาขา S3", [posPayload().branchId as string]);
    const { token, username } = await createAdmin("technician", undefined, { branchIds: [branchId] });
    const create = async () => {
        const res = await createRoute(adminRequest("/api/admin/repair/jobs", {
            method: "POST",
            token,
            body: {
                branchId,
                brand: "Samsung",
                deviceModel: "Galaxy S24",
                reportedSymptom: "จอไม่ติด",
                dataBackupStatus: "backed_up",
                newCustomer: { firstName: "สมหญิง", lastName: "ทดสอบ", phone: "0899999999" },
            },
        }));
        expect(res.status).toBe(201);
        return (await json<JobJson>(res))._id;
    };
    const patch = (id: string, body: Record<string, unknown>, as = token) =>
        patchRoute(adminRequest(`/api/admin/repair/jobs/${id}`, { method: "PATCH", token: as, body }), params({ id }));
    const approve = (id: string, body: Record<string, unknown> = {}, as = token) =>
        approvalRoute(adminRequest(`/api/admin/repair/jobs/${id}/quote-approvals`, {
            method: "POST",
            token: as,
            body: { decision: "approved", channel: "line", approverName: "สมหญิง ทดสอบ", ...body },
        }), params({ id }));
    const qc = (id: string, body: Record<string, unknown> = { items: allPass() }, as = token) =>
        qcRoute(adminRequest(`/api/admin/repair/jobs/${id}/qc`, { method: "POST", token: as, body }), params({ id }));
    const handover = (id: string, body: Record<string, unknown> = { receiverName: "สมหญิง ทดสอบ" }, as = token) =>
        handoverRoute(adminRequest(`/api/admin/repair/jobs/${id}/handover`, { method: "POST", token: as, body }), params({ id }));
    return { token, username, branchId, create, patch, approve, qc, handover };
}

async function code(res: Response) {
    return (await json<{ code: string }>(res)).code;
}

describeDb("repair quote approvals, QC and handover", () => {
    it("snapshots each approval round and needs a new one after a price change", async () => {
        const api = await setup();
        const id = await api.create();
        expect((await api.patch(id, { laborCost: 500, partsCost: 1000 })).status).toBe(200);

        const blocked = await api.patch(id, { status: "in_progress" });
        expect(blocked.status).toBe(409);
        expect(await code(blocked)).toBe("QUOTE_APPROVAL_REQUIRED");

        // A rejected round does not unlock the repair.
        expect((await api.approve(id, { decision: "rejected", channel: "phone" })).status).toBe(201);
        expect(await code(await api.patch(id, { status: "in_progress" }))).toBe("QUOTE_APPROVAL_REQUIRED");

        const decidedAt = new Date(Date.now() - 60_000).toISOString();
        const approved = await api.approve(id, { decidedAt });
        expect(approved.status).toBe(201);
        const afterApproval = await json<JobJson>(approved);
        expect(afterApproval.quotationApproved).toBe("approved");
        expect(afterApproval.quoteApprovals.map((r) => [r.round, r.decision])).toEqual([[1, "rejected"], [2, "approved"]]);
        expect(afterApproval.quoteApprovals[1]).toMatchObject({
            laborCost: 500, partsCost: 1000, totalPrice: 1500, costsVersion: afterApproval.costsVersion,
            channel: "line", approverName: "สมหญิง ทดสอบ", recordedBy: api.username, decidedAt,
        });
        expect((await api.patch(id, { status: "in_progress" })).status).toBe(200);

        // The price goes up while waiting for parts: back to in_progress needs round 3.
        expect((await api.patch(id, { status: "waiting_parts" })).status).toBe(200);
        const repriced = await json<JobJson>(await api.patch(id, { partsCost: 1800 }));
        expect(repriced.quotationApproved).toBe("pending");
        expect(await code(await api.patch(id, { status: "in_progress" }))).toBe("QUOTE_APPROVAL_REQUIRED");
        const round3 = await json<JobJson>(await api.approve(id, { channel: "in_store" }));
        expect(round3.quoteApprovals.at(-1)).toMatchObject({ round: 3, totalPrice: 2300, costsVersion: repriced.costsVersion });
        expect((await api.patch(id, { status: "in_progress" })).status).toBe(200);

        expect(await AdminLog.countDocuments({ action: "record_quote_approval", targetId: id, adminName: api.username })).toBe(3);
    });

    it("checks the new prices when a PATCH changes prices and status together", async () => {
        const api = await setup();
        const id = await api.create();
        await api.patch(id, { laborCost: 500 });
        await api.approve(id);
        const res = await api.patch(id, { laborCost: 900, status: "in_progress" });
        expect(res.status).toBe(409);
        expect(await code(res)).toBe("QUOTE_APPROVAL_REQUIRED");
        const stored = await RepairJob.findById(id).lean();
        expect(stored!.status).toBe("pending");
        expect(stored!.laborCost).toBe(500);
    });

    it("exempts free jobs and store-owned POS jobs from approval", async () => {
        const api = await setup();
        const free = await api.create();
        expect((await api.patch(free, { status: "in_progress" })).status).toBe(200);

        const key = await insertApiKey();
        const pos = await json<RepairIntegrationDto>(await posCreateRoute(
            apiRequest("/api/integration/v1/repair-jobs", { method: "POST", apiKey: key.apiKey, body: posPayload() }), noParams));
        expect((await api.patch(pos.id, { laborCost: 700 })).status).toBe(200);
        expect((await api.patch(pos.id, { status: "in_progress" })).status).toBe(200);
    });

    it("validates approval input and refuses closed or out-of-branch jobs", async () => {
        const api = await setup();
        const id = await api.create();
        for (const body of [{ decision: "maybe" }, { channel: "email" }, { approverName: "" }, { decidedAt: new Date(Date.now() + 3_600_000).toISOString() }, { totalPrice: 1 }]) {
            expect((await api.approve(id, body)).status, JSON.stringify(body)).toBe(400);
        }
        const { token: viewer } = await createAdmin("viewer", undefined, { branchIds: [api.branchId] });
        expect((await api.approve(id, {}, viewer)).status).toBe(403);
        const { id: otherBranch } = await createBranch("สาขาอื่น");
        const { token: outsider } = await createAdmin("technician", undefined, { branchIds: [otherBranch] });
        expect((await api.approve(id, {}, outsider)).status).toBe(404);
        expect((await api.qc(id, undefined, outsider)).status).toBe(404);
        expect((await api.handover(id, undefined, outsider)).status).toBe(404);

        expect((await api.patch(id, { status: "cancelled" })).status).toBe(200);
        expect(await code(await api.approve(id))).toBe("REPAIR_CLOSED");
        expect(await code(await api.qc(id))).toBe("REPAIR_CLOSED");
        expect((await RepairJob.findById(id).lean())!.quoteApprovals).toHaveLength(0);
    });

    it("requires every checklist item exactly once and computes the overall result", async () => {
        const api = await setup();
        const id = await api.create();
        const items = allPass();
        for (const body of [
            { items: items.slice(1) },
            { items: [...items, items[0]] },
            { items: [...items, { key: "bogus", result: "pass" }] },
            { items: items.map((i, n) => (n === 0 ? { ...i, result: "ok" } : i)) },
            { items: items.map((i, n) => (n === 0 ? { ...i, extra: 1 } : i)) },
            { items: "all good" },
            { items, overall: "pass" },
        ]) {
            expect((await api.qc(id, body)).status, JSON.stringify(body).slice(0, 80)).toBe(400);
        }
        const withNa = await json<JobJson>(await api.qc(id, { items: items.map((i, n) => (n === 0 ? { ...i, result: "na" } : i)), note: "ไม่มีสแกนนิ้ว" }));
        expect(withNa.qcChecks.at(-1)).toMatchObject({ overall: "pass", checkedBy: api.username });
        const failed = await json<JobJson>(await api.qc(id, { items: items.map((i, n) => (n === 1 ? { ...i, result: "fail" } : i)) }));
        expect(failed.qcChecks.at(-1)!.overall).toBe("fail");
        expect(failed.qcChecks.at(-1)!.items.map((i) => i.key)).toEqual([...QC_ITEM_KEYS]);
    });

    it("needs a passing QC recorded after the job last entered in_progress", async () => {
        const api = await setup();
        const id = await api.create();
        // QC recorded before the repair started does not count.
        await api.qc(id);
        expect((await api.patch(id, { status: "in_progress" })).status).toBe(200);
        expect(await code(await api.patch(id, { status: "ready_pickup" }))).toBe("QC_REQUIRED");

        // The latest check failing blocks, even after an earlier pass.
        await api.qc(id);
        await api.qc(id, { items: allPass().map((i, n) => (n === 0 ? { ...i, result: "fail" } : i)) });
        expect(await code(await api.patch(id, { status: "ready_pickup" }))).toBe("QC_REQUIRED");

        await api.qc(id);
        const ready = await json<JobJson>(await api.patch(id, { status: "ready_pickup" }));
        expect(ready.status).toBe("ready_pickup");
        expect(ready.outcome).toBe("repaired");

        // Sent back for rework: the old QC no longer counts and the outcome is cleared.
        const rework = await json<JobJson>(await api.patch(id, { status: "in_progress" }));
        expect(rework.outcome).toBeUndefined();
        expect(await code(await api.patch(id, { status: "ready_pickup" }))).toBe("QC_REQUIRED");
        await api.qc(id);
        expect((await api.patch(id, { status: "ready_pickup", outcome: "repaired" })).status).toBe(200);
    });

    it("lets a refused repair go to ready_pickup from any open status without QC", async () => {
        const api = await setup();
        const fromPending = await api.create();
        const res = await api.patch(fromPending, { status: "ready_pickup", outcome: "not_repaired", statusNote: "ลูกค้าไม่ซ่อม ราคาสูงเกินไป" });
        expect(res.status).toBe(200);
        const job = await json<JobJson>(res);
        expect(job.status).toBe("ready_pickup");
        expect(job.outcome).toBe("not_repaired");

        // Priced but never approved: refusing still works, starting the repair does not.
        const quoted = await api.create();
        await api.patch(quoted, { laborCost: 2000, status: "quoted" });
        expect((await api.patch(quoted, { status: "ready_pickup", outcome: "not_repaired" })).status).toBe(200);

        // Outcome only goes with ready_pickup, and cannot be swapped once there.
        const other = await api.create();
        expect((await api.patch(other, { status: "checking", outcome: "not_repaired" })).status).toBe(400);
        expect((await api.patch(other, { outcome: "bogus", status: "ready_pickup" })).status).toBe(400);
        expect(await code(await api.patch(fromPending, { status: "ready_pickup", outcome: "repaired" }))).toBe("INVALID_STATUS_TRANSITION");
        expect((await api.patch(fromPending, { status: "ready_pickup", outcome: "not_repaired" })).status).toBe(200);
        // The repaired path still needs in_progress first.
        expect(await code(await api.patch(other, { status: "ready_pickup" }))).toBe("INVALID_STATUS_TRANSITION");
    });

    it("closes only through the handover record, for both outcomes", async () => {
        const api = await setup();
        const id = await api.create();
        expect(await code(await api.handover(id))).toBe("INVALID_STATUS_TRANSITION");
        await api.patch(id, { status: "ready_pickup", outcome: "not_repaired" });
        expect(await code(await api.patch(id, { status: "completed" }))).toBe("HANDOVER_REQUIRED");

        for (const body of [{}, { receiverName: "" }, { receiverName: "x", receiverPhone: "call me" }, { receiverName: "x", handedOverAt: new Date(Date.now() + 3_600_000).toISOString() }, { receiverName: "x", handedOverBy: "someone" }]) {
            expect((await api.handover(id, body)).status, JSON.stringify(body)).toBe(400);
        }
        await RepairJob.updateOne({ _id: id }, { $set: { receivedAt: new Date(Date.now() - 60 * 60_000) } });
        const beforeIntake = new Date(Date.now() - 2 * 60 * 60_000).toISOString();
        expect((await api.handover(id, { receiverName: "x", handedOverAt: beforeIntake })).status).toBe(400);
        const handedOverAt = new Date(Date.now() - 5 * 60_000).toISOString();
        const res = await api.handover(id, { receiverName: "สมชาย ทดสอบ", receiverPhone: "0811111111", receiverRelation: "สามี", handedOverAt, note: "รับแทนภรรยา" });
        expect(res.status).toBe(200);
        const closed = await json<JobJson>(res);
        expect(closed.status).toBe("completed");
        expect(closed.outcome).toBe("not_repaired");
        expect(closed.handover).toMatchObject({
            receiverName: "สมชาย ทดสอบ", receiverPhone: "0811111111", receiverRelation: "สามี",
            handedOverBy: api.username, handedOverAt, note: "รับแทนภรรยา",
        });
        const stored = await RepairJob.findById(id).lean();
        expect(stored!.handedOverAt!.toISOString()).toBe(handedOverAt);
        expect(stored!.statusHistory.at(-1)).toMatchObject({ status: "completed", changedBy: api.username, actorType: "admin" });
        expect(await AdminLog.countDocuments({ action: "record_handover", targetId: id, adminName: api.username })).toBe(1);

        expect(await code(await api.handover(id))).toBe("REPAIR_CLOSED");
    });

    it("shows the outcome to the POS and lets the POS close a refused repair", async () => {
        const api = await setup();
        const key = await insertApiKey({ name: "Web POS" });
        const pos = await json<RepairIntegrationDto>(await posCreateRoute(
            apiRequest("/api/integration/v1/repair-jobs", { method: "POST", apiKey: key.apiKey, body: posPayload() }), noParams));
        expect(pos.outcome).toBeNull();

        await api.patch(pos.id, { status: "ready_pickup", outcome: "not_repaired" });
        const ready = await json<RepairIntegrationDto>(await posGetRoute(apiRequest(`/api/integration/v1/repair-jobs/${pos.id}`, { apiKey: key.apiKey }), params({ id: pos.id })));
        expect(ready).toMatchObject({ status: "ready_pickup", posStatus: "completed", outcome: "not_repaired" });

        const res = await posHandoverRoute(apiRequest(`/api/integration/v1/repair-jobs/${pos.id}/handover`, { method: "POST", apiKey: key.apiKey, body: { note: "คืนเข้าสต็อก" } }), params({ id: pos.id }));
        expect(res.status).toBe(200);
        expect(await json<RepairIntegrationDto>(res)).toMatchObject({ status: "completed", outcome: "not_repaired" });
        const stored = await RepairJob.findById(pos.id).lean();
        expect(stored!.handover).toMatchObject({ receiverName: "Web POS", handedOverBy: "integration:Web POS", note: "คืนเข้าสต็อก" });
    });
});
