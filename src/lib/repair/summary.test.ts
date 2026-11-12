import { describe, expect, it } from "vitest";
import { externalCostTotal, isOverdue, summarizePayments } from "./summary";
import { DATA_BACKUP, PAYMENT_METHOD, QC_CHECKLIST, QC_ITEM_KEYS } from "./options";

describe("summarizePayments", () => {
    it("adds deposits and payments, subtracts refunds, and skips voided entries", () => {
        const summary = summarizePayments({
            totalPrice: 2500,
            payments: [
                { kind: "deposit", amount: 500 },
                { kind: "payment", amount: 1500 },
                { kind: "payment", amount: 999, voidedAt: "2026-11-12T10:00:00Z" },
                { kind: "refund", amount: 200 },
            ],
        });
        expect(summary).toEqual({ total: 2500, paid: 2000, refunded: 200, net: 1800, outstanding: 700, overpaid: 0 });
    });

    it("reports money held beyond the price instead of a negative balance", () => {
        // Customer paid a deposit, then refused the repair and the price was cleared.
        const summary = summarizePayments({ totalPrice: 0, payments: [{ kind: "deposit", amount: 500 }] });
        expect(summary.outstanding).toBe(0);
        expect(summary.overpaid).toBe(500);
    });

    it("handles a job with no payments or price", () => {
        expect(summarizePayments({})).toEqual({ total: 0, paid: 0, refunded: 0, net: 0, outstanding: 0, overpaid: 0 });
    });

    it("rounds to satang", () => {
        const summary = summarizePayments({ totalPrice: 100.1, payments: [{ kind: "payment", amount: 33.37 }, { kind: "payment", amount: 33.37 }] });
        expect(summary.paid).toBe(66.74);
        expect(summary.outstanding).toBe(33.36);
    });
});

describe("externalCostTotal", () => {
    it("sums actual costs of outside repairs only", () => {
        expect(externalCostTotal({
            movements: [
                { type: "external_repair", actualCost: 800 },
                { type: "transfer", actualCost: 50 },
                { type: "external_repair", actualCost: null },
                { type: "external_repair", actualCost: 120.5 },
            ],
        })).toBe(920.5);
    });
});

describe("isOverdue", () => {
    const now = new Date("2026-11-12T12:00:00Z");

    it("is overdue once the appointment passes while the job is still open", () => {
        expect(isOverdue({ appointmentDate: "2026-11-12T11:59:00Z", status: "in_progress" }, now)).toBe(true);
        expect(isOverdue({ appointmentDate: "2026-11-12T12:01:00Z", status: "in_progress" }, now)).toBe(false);
    });

    it("ignores jobs without an appointment and jobs that are ready or closed", () => {
        expect(isOverdue({ status: "pending" }, now)).toBe(false);
        for (const status of ["ready_pickup", "completed", "cancelled"]) {
            expect(isOverdue({ appointmentDate: "2026-11-01T00:00:00Z", status }, now)).toBe(false);
        }
    });
});

describe("options", () => {
    it("labels every value and recognises only known values", () => {
        for (const value of DATA_BACKUP.values) expect(DATA_BACKUP.labels[value]).toBeTruthy();
        expect(PAYMENT_METHOD.is("cash")).toBe(true);
        expect(PAYMENT_METHOD.is("bitcoin")).toBe(false);
        expect(PAYMENT_METHOD.is(undefined)).toBe(false);
    });

    it("keeps QC checklist keys unique", () => {
        expect(new Set(QC_ITEM_KEYS).size).toBe(QC_CHECKLIST.length);
    });
});
