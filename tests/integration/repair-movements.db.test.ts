import { expect, it } from "vitest";
import { POST as createRoute } from "@/app/api/admin/repair/jobs/route";
import { PATCH as patchJobRoute } from "@/app/api/admin/repair/jobs/[id]/route";
import { POST as sendRoute } from "@/app/api/admin/repair/jobs/[id]/movements/route";
import { PATCH as returnRoute } from "@/app/api/admin/repair/jobs/[id]/movements/[movementId]/route";
import { GET as targetsRoute } from "@/app/api/admin/repair/movement-targets/route";
import { externalCostTotal } from "@/lib/repair/summary";
import AdminLog from "@/models/AdminLog";
import Branch from "@/models/Branch";
import RepairJob from "@/models/RepairJob";
import { adminRequest, createAdmin, createBranch, describeDb, json, params } from "../helpers/db";

interface MovementJson {
    _id: string;
    type: string;
    fromLabel: string;
    toKind: string;
    toLabel: string;
    toBranchId?: string;
    vendorName?: string;
    sentBy: string;
    receivedBy?: string;
    sentAt: string;
    returnedAt?: string;
    returnReceivedBy?: string;
    actualCost?: number;
    note?: string;
    recordedBy: string;
}

interface JobJson {
    _id: string;
    jobId: string;
    branchId?: { _id: string; name: string } | null;
    currentHolder?: { kind: string; label: string; branchId?: string };
    movements: MovementJson[];
}

const jobBody = (branchId: string) => ({
    brand: "Apple",
    deviceModel: "iPhone 13",
    imei: "356938035643809",
    jobType: "repair",
    reportedSymptom: "เครื่องไม่ชาร์จ",
    newCustomer: { firstName: "ลูกค้า", lastName: "ทดสอบ", phone: "0811111111" },
    dataBackupStatus: "customer_informed",
    branchId,
});

async function createJob(token: string, branchId: string) {
    const res = await createRoute(adminRequest("/api/admin/repair/jobs", { method: "POST", token, body: jobBody(branchId) }));
    expect(res.status).toBe(201);
    return json<JobJson>(res);
}

const send = (token: string, jobId: string, body: unknown) =>
    sendRoute(adminRequest(`/api/admin/repair/jobs/${jobId}/movements`, { method: "POST", token, body }), params({ id: jobId }));

const giveBack = (token: string, jobId: string, movementId: string, body: unknown = {}) =>
    returnRoute(
        adminRequest(`/api/admin/repair/jobs/${jobId}/movements/${movementId}`, { method: "PATCH", token, body }),
        params({ id: jobId, movementId }),
    );

async function errorOf(res: Response) {
    return { status: res.status, ...(await json<{ code?: string; fields?: string[] }>(res)) };
}

describeDb("repair device custody (movements)", () => {
    it("sends the device to another branch and records it coming back", async () => {
        const a = await createBranch("สาขา A");
        const b = await createBranch("สาขา B");
        const { token: admin } = await createAdmin("admin");
        const job = await createJob(admin, a.id);
        expect(job.currentHolder).toMatchObject({ kind: "branch", label: "สาขา A", branchId: a.id });

        // A technician of branch A may send to branch B, which is outside their own scope.
        const { token: techA, username: techName } = await createAdmin("technician", undefined, { branchId: a.id });
        const sentRes = await send(techA, job._id, { toKind: "branch", toBranchId: b.id, receivedBy: "พี่บี", note: "ส่งไปเปลี่ยนบอร์ด" });
        expect(sentRes.status).toBe(201);
        const sent = await json<JobJson>(sentRes);
        expect(sent.branchId?._id).toBe(a.id); // the owning branch does not change
        expect(sent.currentHolder).toMatchObject({ kind: "branch", label: "สาขา B", branchId: b.id });
        expect(sent.movements).toHaveLength(1);
        const [movement] = sent.movements;
        expect(movement).toMatchObject({
            type: "transfer", fromLabel: "สาขา A", toKind: "branch", toLabel: "สาขา B", toBranchId: b.id,
            sentBy: techName, receivedBy: "พี่บี", recordedBy: techName, note: "ส่งไปเปลี่ยนบอร์ด",
        });
        expect(movement.returnedAt).toBeUndefined();
        expect(await AdminLog.countDocuments({ action: "repair_transfer_device", targetId: job._id, adminName: techName })).toBe(1);

        const backRes = await giveBack(techA, job._id, movement._id, { returnReceivedBy: "พี่เอ" });
        expect(backRes.status).toBe(200);
        const back = await json<JobJson>(backRes);
        expect(back.currentHolder).toMatchObject({ kind: "branch", label: "สาขา A", branchId: a.id });
        expect(back.movements[0].returnReceivedBy).toBe("พี่เอ");
        expect(back.movements[0].returnedAt).toBeTruthy();
        expect(back.movements[0].actualCost).toBeUndefined();
        expect(await AdminLog.countDocuments({ action: "repair_return_device", targetId: job._id })).toBe(1);

        // A return cannot be recorded twice.
        const again = await errorOf(await giveBack(techA, job._id, movement._id));
        expect(again).toMatchObject({ status: 409, code: "ALREADY_RETURNED" });
    });

    it("records an outside repair with its actual cost and blocks hand-offs until it is back", async () => {
        const a = await createBranch("สาขา A");
        const b = await createBranch("สาขา B");
        const { token: admin, username: adminName } = await createAdmin("admin");
        const job = await createJob(admin, a.id);

        const atShop = await json<JobJson>(await send(admin, job._id, { toKind: "external", vendorName: "ร้านซ่อมบอร์ดเจริญ", sentBy: "สมชาย" }));
        const external = atShop.movements[0];
        expect(external).toMatchObject({ type: "external_repair", toKind: "external", toLabel: "ร้านซ่อมบอร์ดเจริญ", vendorName: "ร้านซ่อมบอร์ดเจริญ", sentBy: "สมชาย" });
        expect(atShop.currentHolder).toMatchObject({ kind: "external", label: "ร้านซ่อมบอร์ดเจริญ" });

        const blocked = await errorOf(await send(admin, job._id, { toKind: "technician", toLabel: "ช่างเอ" }));
        expect(blocked).toMatchObject({ status: 409, code: "EXTERNAL_REPAIR_OPEN" });

        expect(await errorOf(await giveBack(admin, job._id, external._id))).toMatchObject({ status: 400, fields: ["actualCost"] });
        expect(await errorOf(await giveBack(admin, job._id, external._id, { actualCost: 12.345 }))).toMatchObject({ status: 400, fields: ["actualCost"] });
        expect(await errorOf(await giveBack(admin, job._id, external._id, { actualCost: -5 }))).toMatchObject({ status: 400, fields: ["actualCost"] });

        // Back to branch B instead of the receiving branch.
        const backRes = await giveBack(admin, job._id, external._id, { actualCost: 1500.5, toBranchId: b.id, note: "เปลี่ยน IC ชาร์จ" });
        expect(backRes.status).toBe(200);
        const back = await json<JobJson>(backRes);
        expect(back.movements[0]).toMatchObject({ actualCost: 1500.5, returnReceivedBy: adminName, note: "รับกลับ: เปลี่ยน IC ชาร์จ" });
        expect(back.currentHolder).toMatchObject({ kind: "branch", label: "สาขา B", branchId: b.id });
        expect(await AdminLog.countDocuments({ action: "repair_return_external", targetId: job._id })).toBe(1);

        // A second outside repair adds to the total.
        const second = await json<JobJson>(await send(admin, job._id, { toKind: "external", vendorName: "ร้านจอ" }));
        expect(second.movements[1].fromLabel).toBe("สาขา B");
        await giveBack(admin, job._id, second.movements[1]._id, { actualCost: 200 });
        const stored = (await RepairJob.findById(job._id).lean())!;
        expect(externalCostTotal(stored)).toBe(1700.5);
        expect(stored.currentHolder).toMatchObject({ kind: "branch", label: "สาขา A" });
    });

    it("refuses movements on closed jobs but still lets an open hand-off come back", async () => {
        const a = await createBranch("สาขา A");
        const { token: admin } = await createAdmin("admin");
        const job = await createJob(admin, a.id);
        const withTech = await json<JobJson>(await send(admin, job._id, { toKind: "technician", toLabel: "ช่างเอ" }));

        const cancel = await patchJobRoute(
            adminRequest(`/api/admin/repair/jobs/${job._id}`, { method: "PATCH", token: admin, body: { status: "cancelled", statusNote: "ลูกค้ายกเลิก" } }),
            params({ id: job._id }),
        );
        expect(cancel.status).toBe(200);

        expect(await errorOf(await send(admin, job._id, { toKind: "technician", toLabel: "ช่างบี" }))).toMatchObject({ status: 409, code: "REPAIR_CLOSED" });
        const back = await giveBack(admin, job._id, withTech.movements[0]._id);
        expect(back.status).toBe(200);
        expect((await json<JobJson>(back)).currentHolder).toMatchObject({ kind: "branch", label: "สาขา A" });
    });

    it("validates targets, chains hand-offs, and only returns the latest movement", async () => {
        const a = await createBranch("สาขา A");
        const closedBranch = await createBranch("สาขาปิด");
        await Branch.updateOne({ _id: closedBranch.id }, { isActive: false });
        const { token: admin } = await createAdmin("admin");
        const job = await createJob(admin, a.id);

        expect(await errorOf(await send(admin, job._id, { toKind: "branch", toBranchId: closedBranch.id }))).toMatchObject({ status: 400, fields: ["toBranchId"] });
        expect(await errorOf(await send(admin, job._id, { toKind: "branch", toBranchId: a.id }))).toMatchObject({ status: 409, code: "SAME_HOLDER" });
        expect(await errorOf(await send(admin, job._id, { toKind: "external" }))).toMatchObject({ status: 400, fields: ["vendorName"] });
        expect(await errorOf(await send(admin, job._id, { toKind: "technician", toLabel: "ช่าง", currentHolder: { kind: "customer" } }))).toMatchObject({ status: 400 });
        expect(await errorOf(await send(admin, job._id, { toKind: "technician", toLabel: "ช่าง", sentAt: "2000-01-01T00:00:00.000Z" }))).toMatchObject({ status: 400, fields: ["sentAt"] });

        const first = await json<JobJson>(await send(admin, job._id, { toKind: "technician", toLabel: "ช่างเอ" }));
        const chained = await json<JobJson>(await send(admin, job._id, { toKind: "technician", toLabel: "ช่างบี" }));
        expect(chained.movements[1]).toMatchObject({ fromLabel: "ช่างเอ", toLabel: "ช่างบี" });

        expect(await errorOf(await giveBack(admin, job._id, first.movements[0]._id))).toMatchObject({ status: 409, code: "NOT_LATEST_MOVEMENT" });
        expect(await errorOf(await giveBack(admin, job._id, "64b000000000000000000099"))).toMatchObject({ status: 404, code: "MOVEMENT_NOT_FOUND" });
        expect(await errorOf(await giveBack(admin, job._id, chained.movements[1]._id, { actualCost: 100 }))).toMatchObject({ status: 400, fields: ["actualCost"] });
        expect(await errorOf(await giveBack(admin, job._id, chained.movements[1]._id, { toBranchId: closedBranch.id }))).toMatchObject({ status: 400, fields: ["toBranchId"] });
        expect((await giveBack(admin, job._id, chained.movements[1]._id)).status).toBe(200);
    });

    it("handles jobs created before custody tracking", async () => {
        const a = await createBranch("สาขา A");
        const { token: admin } = await createAdmin("admin");
        const job = await createJob(admin, a.id);
        await RepairJob.collection.updateOne({ _id: (await RepairJob.findById(job._id))!._id }, { $unset: { movements: "", currentHolder: "" } });

        const res = await send(admin, job._id, { toKind: "technician", toLabel: "ช่างเอ" });
        expect(res.status).toBe(201);
        const sent = await json<JobJson>(res);
        expect(sent.movements[0].fromLabel).toBe("ไม่ระบุ");
        // With no holder recorded, the return falls back to the receiving branch.
        expect((await json<JobJson>(await giveBack(admin, job._id, sent.movements[0]._id))).currentHolder).toMatchObject({ kind: "branch", label: "สาขา A" });
    });

    it("answers 404 for a job in another branch and 403 without edit permission", async () => {
        const a = await createBranch("สาขา A");
        const b = await createBranch("สาขา B");
        const hidden = await createBranch("สาขาปิด");
        await Branch.updateOne({ _id: hidden.id }, { isActive: false });
        const { token: admin } = await createAdmin("admin");
        const jobB = await createJob(admin, b.id);
        const sentB = await json<JobJson>(await send(admin, jobB._id, { toKind: "technician", toLabel: "ช่างบี" }));

        const { token: techA } = await createAdmin("technician", undefined, { branchId: a.id });
        expect((await send(techA, jobB._id, { toKind: "technician", toLabel: "ช่างเอ" })).status).toBe(404);
        expect((await giveBack(techA, jobB._id, sentB.movements[0]._id)).status).toBe(404);
        expect((await send(techA, "not-an-id", { toKind: "technician", toLabel: "ช่างเอ" })).status).toBe(404);
        const stored = (await RepairJob.findById(jobB._id).lean())!;
        expect(stored.movements).toHaveLength(1);
        expect(stored.movements[0].returnedAt ?? null).toBeNull();

        const { token: viewerB } = await createAdmin("viewer", undefined, { branchId: b.id });
        expect((await send(viewerB, jobB._id, { toKind: "technician", toLabel: "ช่างเอ" })).status).toBe(403);

        // The picker lists every active branch, including ones outside the caller's scope.
        const targets = await json<{ branches: { _id: string; name: string }[] }>(await targetsRoute(adminRequest("/api/admin/repair/movement-targets", { token: techA })));
        expect(targets.branches.map((branch) => branch.name).sort()).toEqual(["สาขา A", "สาขา B"].sort());
    });
});
