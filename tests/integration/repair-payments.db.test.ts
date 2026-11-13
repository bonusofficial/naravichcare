import { expect, it } from "vitest";
import { POST as createRoute } from "@/app/api/admin/repair/jobs/route";
import { POST as paymentRoute } from "@/app/api/admin/repair/jobs/[id]/payments/route";
import { PATCH as voidRoute } from "@/app/api/admin/repair/jobs/[id]/payments/[paymentId]/route";
import { summarizePayments } from "@/lib/repair/summary";
import { receiptPrefix } from "@/lib/repair/payments";
import AdminLog from "@/models/AdminLog";
import RepairJob from "@/models/RepairJob";
import { adminRequest, createAdmin, createBranch, describeDb, json, params } from "../helpers/db";

interface PaymentJson {
    _id: string;
    kind: string;
    amount: number;
    method: string;
    receiptNo: string;
    recordedBy: string;
    note?: string;
    voidedAt?: string | null;
    voidedBy?: string;
    voidReason?: string;
}

interface JobJson {
    _id: string;
    totalPrice: number;
    status: string;
    payments: PaymentJson[];
    customer?: { firstName: string } | null;
    branchId?: { _id: string; name: string } | null;
}

const jobBody = (branchId: string) => ({
    brand: "Apple",
    deviceModel: "iPhone 13",
    imei: "356938035643809",
    jobType: "repair",
    reportedSymptom: "จอแตก",
    newCustomer: { firstName: "ลูกค้า", lastName: "ทดสอบ", phone: "0811111111" },
    dataBackupStatus: "customer_informed",
    branchId,
});

async function createJob(token: string, branchId: string, totalPrice = 0, status?: string) {
    const res = await createRoute(adminRequest("/api/admin/repair/jobs", { method: "POST", token, body: jobBody(branchId) }));
    expect(res.status).toBe(201);
    const job = await json<JobJson>(res);
    if (totalPrice || status) {
        await RepairJob.updateOne({ _id: job._id }, { $set: { laborCost: totalPrice, totalPrice, ...(status ? { status } : {}) } });
    }
    return job._id;
}

function pay(token: string, jobId: string, body: Record<string, unknown>) {
    return paymentRoute(
        adminRequest(`/api/admin/repair/jobs/${jobId}/payments`, { method: "POST", token, body: { method: "cash", ...body } }),
        params({ id: jobId }),
    );
}

function voidEntry(token: string, jobId: string, paymentId: string, body: Record<string, unknown> = { action: "void", reason: "บันทึกผิด" }) {
    return voidRoute(
        adminRequest(`/api/admin/repair/jobs/${jobId}/payments/${paymentId}`, { method: "PATCH", token, body }),
        params({ id: jobId, paymentId }),
    );
}

async function code(res: Response) {
    return (await json<{ code?: string }>(res)).code;
}

describeDb("repair payments and receipts", () => {
    it("takes a deposit before the job has a price, stamped with the session user", async () => {
        const a = await createBranch("สาขา A");
        const { token, username } = await createAdmin("admin", undefined, { branchId: a.id });
        const jobId = await createJob(token, a.id);

        const res = await pay(token, jobId, { kind: "deposit", amount: 500, method: "transfer", note: "มัดจำค่าจอ", recordedBy: "someone-else", receiptNo: "FAKE-1" });
        expect(res.status).toBe(201);
        const job = await json<JobJson>(res);
        // The full job comes back, populated for the page.
        expect(job.customer?.firstName).toBe("ลูกค้า");
        expect(job.branchId?.name).toBe("สาขา A");
        expect(job.payments).toHaveLength(1);
        const [deposit] = job.payments;
        expect(deposit).toMatchObject({ kind: "deposit", amount: 500, method: "transfer", note: "มัดจำค่าจอ", recordedBy: username });
        expect(deposit.receiptNo).toBe(`${receiptPrefix()}-0001`);
        expect(summarizePayments(job)).toMatchObject({ total: 0, net: 500, overpaid: 500 });

        // Without a price only a deposit is accepted.
        const payment = await pay(token, jobId, { kind: "payment", amount: 100 });
        expect(payment.status).toBe(409);
        expect(await code(payment)).toBe("NO_PRICE_YET");

        const log = await AdminLog.findOne({ action: "record_repair_payment" }).lean<{ adminName: string; details: { receiptNo: string } }>();
        expect(log?.adminName).toBe(username);
        expect(log?.details.receiptNo).toBe(deposit.receiptNo);
    });

    it("accepts payments up to the outstanding balance and rejects overpayment", async () => {
        const a = await createBranch("สาขา A");
        const { token } = await createAdmin("admin");
        const jobId = await createJob(token, a.id, 1000);

        expect((await pay(token, jobId, { kind: "deposit", amount: 300 })).status).toBe(201);
        const over = await pay(token, jobId, { kind: "payment", amount: 700.01 });
        expect(over.status).toBe(409);
        expect(await code(over)).toBe("AMOUNT_EXCEEDS_OUTSTANDING");

        const exact = await pay(token, jobId, { kind: "payment", amount: 700, method: "qr" });
        expect(exact.status).toBe(201);
        expect(summarizePayments(await json<JobJson>(exact))).toMatchObject({ paid: 1000, outstanding: 0 });

        const more = await pay(token, jobId, { kind: "payment", amount: 1 });
        expect(more.status).toBe(409);
        expect(await code(more)).toBe("FULLY_PAID");

        const bad = await pay(token, jobId, { kind: "payment", amount: "100" });
        expect(bad.status).toBe(400);
        expect(await code(bad)).toBe("VALIDATION_ERROR");
    });

    it("lets a technician receive money but not refund or void it, and caps refunds at the net held", async () => {
        const a = await createBranch("สาขา A");
        const { token: admin } = await createAdmin("admin");
        const { token: tech } = await createAdmin("technician", undefined, { branchId: a.id });
        const jobId = await createJob(admin, a.id, 1000);

        const deposit = await pay(tech, jobId, { kind: "deposit", amount: 400 });
        expect(deposit.status).toBe(201);
        const depositId = (await json<JobJson>(deposit)).payments[0]._id;

        expect((await pay(tech, jobId, { kind: "refund", amount: 100 })).status).toBe(403);
        expect((await voidEntry(tech, jobId, depositId)).status).toBe(403);

        const tooMuch = await pay(admin, jobId, { kind: "refund", amount: 400.5 });
        expect(tooMuch.status).toBe(409);
        expect(await code(tooMuch)).toBe("REFUND_EXCEEDS_NET");

        const refund = await pay(admin, jobId, { kind: "refund", amount: 400 });
        expect(refund.status).toBe(201);
        const job = await json<JobJson>(refund);
        expect(job.payments.map((entry) => entry.kind)).toEqual(["deposit", "refund"]);
        expect(summarizePayments(job)).toMatchObject({ paid: 400, refunded: 400, net: 0, outstanding: 1000 });

        const nothing = await pay(admin, jobId, { kind: "refund", amount: 1 });
        expect(await code(nothing)).toBe("NOTHING_TO_REFUND");
    });

    it("refuses money in on a cancelled job but still refunds the deposit", async () => {
        const a = await createBranch("สาขา A");
        const { token } = await createAdmin("admin");
        const jobId = await createJob(token, a.id, 1000);
        expect((await pay(token, jobId, { kind: "deposit", amount: 500 })).status).toBe(201);
        await RepairJob.updateOne({ _id: jobId }, { $set: { status: "cancelled" } });

        const deposit = await pay(token, jobId, { kind: "deposit", amount: 100 });
        expect(deposit.status).toBe(409);
        expect(await code(deposit)).toBe("JOB_CANCELLED");
        expect((await pay(token, jobId, { kind: "refund", amount: 500 })).status).toBe(201);
    });

    it("voids an entry with a reason, keeps it on the job, and refuses a second void", async () => {
        const a = await createBranch("สาขา A");
        const { token, username } = await createAdmin("admin");
        const jobId = await createJob(token, a.id, 1000);
        const first = await json<JobJson>(await pay(token, jobId, { kind: "payment", amount: 600 }));
        const paymentId = first.payments[0]._id;

        const noReason = await voidEntry(token, jobId, paymentId, { action: "void", reason: "  " });
        expect(noReason.status).toBe(400);

        const res = await voidEntry(token, jobId, paymentId, { action: "void", reason: "ลูกค้าโอนผิดบัญชี" });
        expect(res.status).toBe(200);
        const job = await json<JobJson>(res);
        expect(job.payments).toHaveLength(1);
        expect(job.payments[0]).toMatchObject({ voidedBy: username, voidReason: "ลูกค้าโอนผิดบัญชี" });
        expect(job.payments[0].voidedAt).toBeTruthy();
        expect(summarizePayments(job)).toMatchObject({ paid: 0, outstanding: 1000 });

        const again = await voidEntry(token, jobId, paymentId);
        expect(again.status).toBe(409);
        expect(await code(again)).toBe("ALREADY_VOIDED");
        expect((await voidEntry(token, jobId, "not-an-id")).status).toBe(404);
        expect((await voidEntry(token, jobId, "6560f0f0f0f0f0f0f0f0f0f0")).status).toBe(404);
        expect(await AdminLog.countDocuments({ action: "void_repair_payment" })).toBe(1);

        // Money in that was already refunded cannot be voided before the refund.
        const deposit = await json<JobJson>(await pay(token, jobId, { kind: "deposit", amount: 200 }));
        await pay(token, jobId, { kind: "refund", amount: 200 });
        const blocked = await voidEntry(token, jobId, deposit.payments[1]._id);
        expect(blocked.status).toBe(409);
        expect(await code(blocked)).toBe("VOID_LEAVES_NEGATIVE_BALANCE");
    });

    it("numbers receipts uniquely and in sequence across jobs, even under concurrency", async () => {
        const a = await createBranch("สาขา A");
        const { token } = await createAdmin("admin");
        const jobOne = await createJob(token, a.id);
        const jobTwo = await createJob(token, a.id);
        const prefix = receiptPrefix();

        await pay(token, jobOne, { kind: "deposit", amount: 100 });
        await pay(token, jobTwo, { kind: "deposit", amount: 100 });
        await pay(token, jobOne, { kind: "deposit", amount: 100 });

        const jobs = await Promise.all(Array.from({ length: 5 }, () => createJob(token, a.id)));
        const responses = await Promise.all(jobs.map((jobId) => pay(token, jobId, { kind: "deposit", amount: 50 })));
        expect(responses.map((res) => res.status)).toEqual([201, 201, 201, 201, 201]);

        const all = (await RepairJob.find().select("payments.receiptNo").lean()).flatMap((job) => job.payments.map((entry) => entry.receiptNo));
        expect(all.sort()).toEqual(Array.from({ length: 8 }, (_, i) => `${prefix}-${String(i + 1).padStart(4, "0")}`));
    });

    it("does not let two concurrent payments overshoot the price", async () => {
        const a = await createBranch("สาขา A");
        const { token } = await createAdmin("admin");
        const jobId = await createJob(token, a.id, 1000);

        const results = await Promise.all([pay(token, jobId, { kind: "payment", amount: 1000 }), pay(token, jobId, { kind: "payment", amount: 1000 })]);
        expect(results.map((res) => res.status).sort()).toEqual([201, 409]);
        const job = await RepairJob.findById(jobId).lean();
        expect(job!.payments).toHaveLength(1);
    });

    it("answers 404 for another branch's job", async () => {
        const a = await createBranch("สาขา A");
        const b = await createBranch("สาขา B");
        const { token: admin } = await createAdmin("admin");
        const { token: techA } = await createAdmin("technician", undefined, { branchId: a.id });
        const jobB = await createJob(admin, b.id, 1000);
        const paid = await json<JobJson>(await pay(admin, jobB, { kind: "payment", amount: 100 }));

        expect((await pay(techA, jobB, { kind: "deposit", amount: 100 })).status).toBe(404);
        expect((await pay(techA, "not-an-id", { kind: "deposit", amount: 100 })).status).toBe(404);
        expect((await RepairJob.findById(jobB).lean())!.payments).toHaveLength(1);

        // A custom role with the refund permission but no view_all_branches is scoped too.
        const { default: Role } = await import("@/models/Role");
        await Role.create({ name: "cashier", displayName: "แคชเชียร์", permissions: ["view_repair_jobs", "manage_repair_payments", "refund_repair_payments"] });
        const { token: cashierA } = await createAdmin("cashier", undefined, { branchId: a.id });
        expect((await voidEntry(cashierA, jobB, paid.payments[0]._id)).status).toBe(404);
        expect((await pay(cashierA, jobB, { kind: "refund", amount: 50 })).status).toBe(404);
    });
});
