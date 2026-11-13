import { describe, expect, it } from "vitest";
import { needsQuoteApproval, qcPassedForCurrentRepair, statusLabelForOutcome, transitionBlock, type WorkflowJob } from "./workflow";

const at = (minutes: number) => new Date(Date.UTC(2026, 10, 13, 10, minutes));

const customerJob = (overrides: Partial<WorkflowJob> = {}): WorkflowJob => ({
    status: "quoted",
    ownerType: "customer",
    totalPrice: 1500,
    costsVersion: 2,
    quoteApprovals: [],
    qcChecks: [],
    statusHistory: [{ status: "pending", changedAt: at(0) }],
    ...overrides,
});

describe("quotation approval", () => {
    it("needs approval for a priced customer job without an approved round for the current prices", () => {
        expect(needsQuoteApproval(customerJob())).toBe(true);
        expect(needsQuoteApproval(customerJob({ quoteApprovals: [{ round: 1, decision: "approved", costsVersion: 1 }] }))).toBe(true);
        expect(needsQuoteApproval(customerJob({ quoteApprovals: [{ round: 1, decision: "rejected", costsVersion: 2 }] }))).toBe(true);
        expect(needsQuoteApproval(customerJob({ quoteApprovals: [{ round: 1, decision: "approved", costsVersion: 2 }] }))).toBe(false);
    });

    it("exempts store-owned jobs, free jobs, and treats a missing version as 1", () => {
        expect(needsQuoteApproval(customerJob({ ownerType: "store" }))).toBe(false);
        expect(needsQuoteApproval(customerJob({ totalPrice: 0 }))).toBe(false);
        expect(needsQuoteApproval(customerJob({ costsVersion: undefined, quoteApprovals: [{ round: 1, decision: "approved", costsVersion: 1 }] }))).toBe(false);
    });

    it("blocks in_progress until the current prices are approved", () => {
        expect(transitionBlock(customerJob(), "in_progress")?.code).toBe("QUOTE_APPROVAL_REQUIRED");
        expect(transitionBlock(customerJob({ quoteApprovals: [{ round: 1, decision: "approved", costsVersion: 2 }] }), "in_progress")).toBeNull();
    });
});

describe("QC before ready_pickup", () => {
    const started = customerJob({
        status: "testing",
        quoteApprovals: [{ round: 1, decision: "approved", costsVersion: 2 }],
        statusHistory: [{ status: "pending", changedAt: at(0) }, { status: "in_progress", changedAt: at(10) }, { status: "testing", changedAt: at(20) }],
    });

    it("needs the latest QC to be a pass recorded after the job last entered in_progress", () => {
        expect(qcPassedForCurrentRepair(started)).toBe(false);
        expect(qcPassedForCurrentRepair({ ...started, qcChecks: [{ overall: "pass", checkedAt: at(5) }] })).toBe(false);
        expect(qcPassedForCurrentRepair({ ...started, qcChecks: [{ overall: "pass", checkedAt: at(15) }] })).toBe(true);
        expect(qcPassedForCurrentRepair({ ...started, qcChecks: [{ overall: "pass", checkedAt: at(15) }, { overall: "fail", checkedAt: at(16) }] })).toBe(false);
    });

    it("blocks a repaired ready_pickup without QC but lets a refused repair through", () => {
        expect(transitionBlock(started, "ready_pickup")?.code).toBe("QC_REQUIRED");
        expect(transitionBlock(started, "ready_pickup", "repaired")?.code).toBe("QC_REQUIRED");
        expect(transitionBlock(started, "ready_pickup", "not_repaired")).toBeNull();
        expect(transitionBlock({ ...started, qcChecks: [{ overall: "pass", checkedAt: at(25) }] }, "ready_pickup")).toBeNull();
    });

    it("allows a refused repair straight from pending, but not a repaired one", () => {
        const pending = customerJob({ status: "pending" });
        expect(transitionBlock(pending, "ready_pickup", "not_repaired")).toBeNull();
        expect(transitionBlock(pending, "ready_pickup")?.code).toBe("INVALID_STATUS_TRANSITION");
    });
});

describe("closing", () => {
    it("needs a handover record to complete", () => {
        const ready = customerJob({ status: "ready_pickup" });
        expect(transitionBlock(ready, "completed")?.code).toBe("HANDOVER_REQUIRED");
        expect(transitionBlock({ ...ready, handover: { receiverName: "ลูกค้า" } }, "completed")).toBeNull();
    });

    it("labels a refused repair without saying it was repaired", () => {
        expect(statusLabelForOutcome("ready_pickup", "not_repaired")).not.toContain("ซ่อมเสร็จ");
        expect(statusLabelForOutcome("ready_pickup", "repaired")).toBe("ซ่อมเสร็จ/รอรับคืน");
    });
});
