import { expect, it } from "vitest";
import { GET as statsRoute } from "@/app/api/admin/repair/stats/route";
import { GET as listRoute } from "@/app/api/admin/repair/jobs/route";
import type { RepairDashboard } from "@/lib/repair/dashboard";
import { bangkokMonthDays } from "@/lib/repair/period";
import { isOverdue, summarizePayments } from "@/lib/repair/summary";
import RepairCustomer from "@/models/RepairCustomer";
import RepairJob from "@/models/RepairJob";
import { adminRequest, createAdmin, createBranch, describeDb, json } from "../helpers/db";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const NOVEMBER = "from=2026-11-01&to=2026-11-30";

let receiptSeq = 0;
const payment = (kind: "deposit" | "payment" | "refund", amount: number, receivedAt: string, extra: Record<string, unknown> = {}) => ({
    kind,
    amount,
    method: "cash",
    receivedAt: new Date(receivedAt),
    receiptNo: `RC-TEST-${++receiptSeq}`,
    recordedBy: "tester",
    ...extra,
});

const movement = (type: "external_repair" | "transfer", actualCost: number, returnedAt: string) => ({
    type,
    fromLabel: "สาขา A",
    toKind: type === "external_repair" ? "external" : "branch",
    toLabel: type === "external_repair" ? "ร้านซ่อมภายนอก" : "สาขา B",
    vendorName: type === "external_repair" ? "ร้านซ่อมภายนอก" : undefined,
    sentBy: "tester",
    sentAt: new Date(new Date(returnedAt).getTime() - 3 * DAY),
    returnedAt: new Date(returnedAt),
    actualCost,
    recordedBy: "tester",
    recordedAt: new Date(),
});

async function insertJob(customer: string, fields: Record<string, unknown>, extras: { payments?: unknown[]; movements?: unknown[] } = {}) {
    const job = await RepairJob.create({
        customer,
        deviceType: "smartphone",
        brand: "Apple",
        deviceModel: "iPhone 13",
        reportedSymptom: "จอแตก",
        ...fields,
    });
    // Payments and movements go in directly: their entry UIs belong to other streams.
    if (extras.payments || extras.movements) {
        await RepairJob.updateOne(
            { _id: job._id },
            { $push: { payments: { $each: extras.payments ?? [] }, movements: { $each: extras.movements ?? [] } } },
        );
    }
    return String(job._id);
}

/**
 * Branch A: overdue job with a deposit on the first instant of November and a
 * payment one millisecond before it; a ready job with a voided payment, a
 * refund and outside repairs; a completed job still owing money; a cancelled
 * job with a deposit. Branch B: three open jobs (one overpaid). Branch C: none.
 * One job has no branch.
 */
async function seed() {
    const a = await createBranch("สาขา A");
    const b = await createBranch("สาขา B");
    const c = await createBranch("สาขา C");
    const customer = String((await RepairCustomer.create({ firstName: "ลูกค้า", lastName: "ทดสอบ", phone: "0811111111" }))._id);
    const now = Date.now();
    const ago = (ms: number) => new Date(now - ms);

    const ids = {
        a1: await insertJob(customer, { branchId: a.id, status: "in_progress", laborCost: 1000, appointmentDate: ago(2 * DAY) }, {
            payments: [
                payment("deposit", 300, "2026-10-31T17:00:00.000Z"), // 1 Nov 00:00 Bangkok: in
                payment("payment", 200, "2026-10-31T16:59:59.999Z"), // 31 Oct 23:59 Bangkok: out
            ],
        }),
        a2: await insertJob(customer, { branchId: a.id, status: "ready_pickup", laborCost: 1500, partsCost: 500, appointmentDate: ago(3 * DAY) }, {
            payments: [
                payment("payment", 2000, "2026-11-30T16:59:59.999Z"), // 30 Nov 23:59 Bangkok: in
                payment("payment", 999, "2026-11-15T03:00:00.000Z", { voidedAt: new Date("2026-11-15T04:00:00.000Z"), voidedBy: "tester", voidReason: "ผิด" }),
                payment("refund", 100, "2026-11-20T03:00:00.000Z"),
            ],
            movements: [
                movement("external_repair", 800, "2026-11-10T03:00:00.000Z"),
                movement("external_repair", 500, "2026-12-01T00:00:00.000Z"), // 1 Dec Bangkok: out
                movement("transfer", 50, "2026-11-11T03:00:00.000Z"), // not an outside repair
            ],
        }),
        a3: await insertJob(customer, { branchId: a.id, status: "completed", laborCost: 700 }, {
            payments: [payment("payment", 100, "2026-11-30T17:00:00.000Z")], // 1 Dec 00:00 Bangkok: out
        }),
        a4: await insertJob(customer, { branchId: a.id, status: "cancelled", laborCost: 500, appointmentDate: ago(5 * DAY) }, {
            payments: [payment("deposit", 200, "2026-11-05T03:00:00.000Z")],
        }),
        b1: await insertJob(customer, { branchId: b.id, status: "pending", laborCost: 1500, partsCost: 250.5, appointmentDate: new Date(now + 2 * DAY) }, {
            payments: [payment("payment", 1000, "2026-11-13T05:00:00.000Z")],
        }),
        b2: await insertJob(customer, { branchId: b.id, status: "waiting_parts", laborCost: 300, appointmentDate: ago(HOUR) }, {
            payments: [payment("payment", 500, "2026-11-02T05:00:00.000Z")],
        }),
        b3: await insertJob(customer, { branchId: b.id, status: "checking" }),
        u1: await insertJob(customer, { status: "in_progress", laborCost: 400, appointmentDate: ago(DAY) }),
    };
    return { a, b, c, ids };
}

async function dashboard(token: string, query = NOVEMBER) {
    const res = await statsRoute(adminRequest(`/api/admin/repair/stats?${query}`, { token }));
    return { status: res.status, body: await json<RepairDashboard & { error?: string; fields?: string[] }>(res) };
}

async function list(token: string, query: string) {
    const res = await listRoute(adminRequest(`/api/admin/repair/jobs?${query}`, { token }));
    expect(res.status).toBe(200);
    return (await json<{ _id: string }[]>(res)).map((job) => job._id);
}

const A_FIGURES = { openJobs: 2, overdueJobs: 1, readyPickup: 1, received: 2400, refunded: 100, outstanding: 1200, externalCost: 800 };
const B_FIGURES = { openJobs: 3, overdueJobs: 1, readyPickup: 0, received: 1500, refunded: 0, outstanding: 750.5, externalCost: 0 };
const ZERO = { openJobs: 0, overdueJobs: 0, readyPickup: 0, received: 0, refunded: 0, outstanding: 0, externalCost: 0 };

describeDb("repair dashboard", () => {
    it("adds up open, overdue, money received and outstanding per branch", async () => {
        const { a, b, c } = await seed();
        const { token } = await createAdmin("admin");
        const { status, body } = await dashboard(token);
        expect(status).toBe(200);

        expect(body.period).toMatchObject({
            fromDate: "2026-11-01",
            toDate: "2026-11-30",
            from: "2026-10-31T17:00:00.000Z",
            to: "2026-11-30T16:59:59.999Z",
        });
        expect(body.allBranches).toBe(true);
        expect(body.branches.map((row) => [row.branchId, row.name])).toEqual([
            [a.id, "สาขา A"],
            [b.id, "สาขา B"],
            [c.id, "สาขา C"],
            [null, "ยังไม่ผูกสาขา"],
        ]);
        expect(body.branches[0]).toMatchObject(A_FIGURES);
        expect(body.branches[1]).toMatchObject(B_FIGURES);
        expect(body.branches[2]).toMatchObject(ZERO);
        expect(body.branches[3]).toMatchObject({ ...ZERO, openJobs: 1, overdueJobs: 1, outstanding: 400 });
        expect(body.totals).toEqual({ openJobs: 6, overdueJobs: 3, readyPickup: 1, received: 3900, refunded: 100, outstanding: 2350.5, externalCost: 800 });

        // Same definitions as the per-job helpers the job page uses.
        const jobs = await RepairJob.find().lean();
        const outstanding = jobs.filter((job) => job.status !== "cancelled").reduce((sum, job) => sum + summarizePayments(job).outstanding, 0);
        expect(body.totals.outstanding).toBe(outstanding);
        expect(body.totals.overdueJobs).toBe(jobs.filter((job) => isOverdue(job)).length);

        expect(body.statusBreakdown).toEqual([
            { status: "pending", count: 1 },
            { status: "checking", count: 1 },
            { status: "in_progress", count: 2 },
            { status: "waiting_parts", count: 1 },
            { status: "ready_pickup", count: 1 },
            { status: "completed", count: 1 },
            { status: "cancelled", count: 1 },
        ]);
        // Nothing per customer or per job in the response.
        expect(JSON.stringify(body)).not.toContain("0811111111");
    });

    it("counts money by Bangkok calendar day at the period boundaries", async () => {
        await seed();
        const { token } = await createAdmin("admin");
        // Only the deposit at 1 Nov 00:00 Bangkok falls on 1 November.
        const first = await dashboard(token, "from=2026-11-01&to=2026-11-01");
        expect(first.body.totals.received).toBe(300);
        // 30 November includes its last millisecond; 1 December 00:00 is out.
        const last = await dashboard(token, "from=2026-11-30&to=2026-11-30");
        expect(last.body.totals.received).toBe(2000);
        // October holds the payment one millisecond before November.
        const october = await dashboard(token, "from=2026-10-01&to=2026-10-31");
        expect(october.body.totals).toMatchObject({ received: 200, externalCost: 0 });
        // December: the late payment and the second outside repair.
        const december = await dashboard(token, "from=2026-12-01&to=2026-12-31");
        expect(december.body.totals).toMatchObject({ received: 100, externalCost: 500 });
        // Snapshot figures do not depend on the period.
        expect(december.body.totals).toMatchObject({ openJobs: 6, overdueJobs: 3, outstanding: 2350.5 });
    });

    it("defaults to this month and rejects bad periods", async () => {
        const { token } = await createAdmin("admin");
        const current = await dashboard(token, "");
        expect(current.status).toBe(200);
        expect(current.body.period).toMatchObject(bangkokMonthDays(new Date()));

        const badDate = await dashboard(token, "from=2026-13-01");
        expect(badDate.status).toBe(400);
        expect(badDate.body.fields).toEqual(["from"]);
        expect((await dashboard(token, "from=2026-11-10&to=2026-11-01")).status).toBe(400);
    });

    it("limits staff to their own branch", async () => {
        const { a, b } = await seed();
        const { token: techA } = await createAdmin("technician", undefined, { branchId: a.id });
        const { body } = await dashboard(techA);
        expect(body.allBranches).toBe(false);
        expect(body.branches).toHaveLength(1);
        expect(body.branches[0]).toMatchObject({ branchId: a.id, ...A_FIGURES });
        expect(body.totals).toEqual(A_FIGURES);
        expect(body.statusBreakdown.reduce((sum, entry) => sum + entry.count, 0)).toBe(4);

        expect((await dashboard(techA, `${NOVEMBER}&branchId=${b.id}`)).status).toBe(404);
        expect((await dashboard(techA, `${NOVEMBER}&branchId=none`)).status).toBe(404);
        expect((await dashboard(techA, `${NOVEMBER}&branchId=not-an-id`)).status).toBe(404);
        expect((await dashboard(techA, `${NOVEMBER}&branchId=${a.id}`)).body.totals).toEqual(A_FIGURES);

        // A user with no branch sees no rows and no money.
        const { token: techNone } = await createAdmin("technician");
        const empty = await dashboard(techNone);
        expect(empty.body.branches).toEqual([]);
        expect(empty.body.totals).toEqual(ZERO);
    });

    it("filters to one branch, or to jobs with no branch, for admins", async () => {
        const { b } = await seed();
        const { token } = await createAdmin("admin");
        const onlyB = await dashboard(token, `${NOVEMBER}&branchId=${b.id}`);
        expect(onlyB.body.branchId).toBe(b.id);
        expect(onlyB.body.branches.map((row) => row.branchId)).toEqual([b.id]);
        expect(onlyB.body.totals).toEqual(B_FIGURES);

        const unassigned = await dashboard(token, `${NOVEMBER}&branchId=none`);
        expect(unassigned.body.branches.map((row) => row.branchId)).toEqual([null]);
        expect(unassigned.body.totals).toMatchObject({ openJobs: 1, overdueJobs: 1, outstanding: 400 });
    });

    it("filters the job list by overdue, open and branch within the caller's scope", async () => {
        const { a, b, ids } = await seed();
        const { token: admin } = await createAdmin("admin");
        const { token: techA } = await createAdmin("technician", undefined, { branchId: a.id });

        // Most overdue first.
        expect(await list(admin, "overdue=1")).toEqual([ids.a1, ids.u1, ids.b2]);
        expect(await list(admin, `overdue=1&branchId=${a.id}`)).toEqual([ids.a1]);
        expect(await list(admin, "overdue=1&status=ready_pickup")).toEqual([]);
        expect(await list(techA, "overdue=1")).toEqual([ids.a1]);

        expect(await list(admin, "branchId=none")).toEqual([ids.u1]);
        expect((await list(admin, `branchId=${b.id}`)).sort()).toEqual([ids.b1, ids.b2, ids.b3].sort());
        expect((await list(admin, `status=open&branchId=${a.id}`)).sort()).toEqual([ids.a1, ids.a2].sort());

        // Outside the scope, or not a branch at all: an empty list, not an error.
        expect(await list(techA, `branchId=${b.id}`)).toEqual([]);
        expect(await list(techA, "branchId=none")).toEqual([]);
        expect(await list(admin, "branchId=not-an-id")).toEqual([]);
    });
});
