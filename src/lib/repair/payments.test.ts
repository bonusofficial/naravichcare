import { describe, expect, it } from "vitest";
import { MAX_MONEY } from "./costs";
import {
    assertPaymentAllowed,
    assertVoidAllowed,
    formatReceiptNo,
    parsePaymentInput,
    parseVoidInput,
    paymentLimit,
    paymentPermission,
    receiptCounterKey,
    receiptPrefix,
    RepairPaymentError,
    summaryAsOf,
    type PaymentJobState,
} from "./payments";

function errorCode(fn: () => unknown): string | null {
    try {
        fn();
        return null;
    } catch (error) {
        if (error instanceof RepairPaymentError) return error.code;
        throw error;
    }
}

const job = (overrides: Partial<PaymentJobState> = {}): PaymentJobState => ({ status: "in_progress", totalPrice: 1000, payments: [], ...overrides });

describe("parsePaymentInput", () => {
    const now = new Date("2026-11-13T05:00:00Z");

    it("accepts a valid entry and defaults receivedAt to now", () => {
        expect(parsePaymentInput({ kind: "deposit", amount: 500, method: "cash", note: "  มัดจำค่าจอ " }, now)).toEqual({
            kind: "deposit",
            amount: 500,
            method: "cash",
            receivedAt: now,
            note: "มัดจำค่าจอ",
        });
    });

    it("rejects bad kinds, methods and amounts", () => {
        const base = { kind: "payment", amount: 100, method: "transfer" };
        expect(errorCode(() => parsePaymentInput({ ...base, kind: "gift" }, now))).toBe("VALIDATION_ERROR");
        expect(errorCode(() => parsePaymentInput({ ...base, method: "crypto" }, now))).toBe("VALIDATION_ERROR");
        for (const amount of [0, -5, 10.123, "100", Number.NaN, MAX_MONEY + 1]) {
            expect(errorCode(() => parsePaymentInput({ ...base, amount }, now))).toBe("VALIDATION_ERROR");
        }
        expect(errorCode(() => parsePaymentInput(null, now))).toBe("VALIDATION_ERROR");
        expect(errorCode(() => parsePaymentInput([], now))).toBe("VALIDATION_ERROR");
    });

    it("accepts a past receivedAt but not a future or garbage one", () => {
        const base = { kind: "payment", amount: 100, method: "qr" };
        expect(parsePaymentInput({ ...base, receivedAt: "2026-11-12T10:00:00Z" }, now).receivedAt.toISOString()).toBe("2026-11-12T10:00:00.000Z");
        // A few seconds of clock drift is fine.
        expect(parsePaymentInput({ ...base, receivedAt: "2026-11-13T05:01:00Z" }, now).receivedAt.toISOString()).toBe("2026-11-13T05:01:00.000Z");
        expect(errorCode(() => parsePaymentInput({ ...base, receivedAt: "2026-11-14T05:00:00Z" }, now))).toBe("VALIDATION_ERROR");
        expect(errorCode(() => parsePaymentInput({ ...base, receivedAt: "yesterday" }, now))).toBe("VALIDATION_ERROR");
        expect(errorCode(() => parsePaymentInput({ ...base, receivedAt: 1731474000000 }, now))).toBe("VALIDATION_ERROR");
    });

    it("limits the note", () => {
        const base = { kind: "payment", amount: 100, method: "cash" };
        expect(errorCode(() => parsePaymentInput({ ...base, note: "x".repeat(501) }, now))).toBe("VALIDATION_ERROR");
        expect(errorCode(() => parsePaymentInput({ ...base, note: "bad\u0007" }, now))).toBe("VALIDATION_ERROR");
        expect(errorCode(() => parsePaymentInput({ ...base, note: 5 }, now))).toBe("VALIDATION_ERROR");
    });
});

describe("parseVoidInput", () => {
    it("needs action void and a reason", () => {
        expect(parseVoidInput({ action: "void", reason: " บันทึกซ้ำ " })).toEqual({ reason: "บันทึกซ้ำ" });
        expect(errorCode(() => parseVoidInput({ action: "void", reason: "   " }))).toBe("VALIDATION_ERROR");
        expect(errorCode(() => parseVoidInput({ action: "void" }))).toBe("VALIDATION_ERROR");
        expect(errorCode(() => parseVoidInput({ action: "delete", reason: "x" }))).toBe("VALIDATION_ERROR");
    });
});

describe("paymentPermission", () => {
    it("needs the refund permission only for refunds", () => {
        expect(paymentPermission("deposit")).toBe("manage_repair_payments");
        expect(paymentPermission("payment")).toBe("manage_repair_payments");
        expect(paymentPermission("refund")).toBe("refund_repair_payments");
        expect(paymentPermission(undefined)).toBe("manage_repair_payments");
    });
});

describe("assertPaymentAllowed", () => {
    it("accepts a deposit of any amount while the job has no price", () => {
        expect(errorCode(() => assertPaymentAllowed(job({ totalPrice: 0 }), { kind: "deposit", amount: 3000 }))).toBeNull();
        expect(errorCode(() => assertPaymentAllowed(job({ totalPrice: null }), { kind: "deposit", amount: 3000 }))).toBeNull();
        expect(errorCode(() => assertPaymentAllowed(job({ totalPrice: 0 }), { kind: "payment", amount: 1 }))).toBe("NO_PRICE_YET");
    });

    it("caps payments and deposits at what is outstanding", () => {
        const partlyPaid = job({ payments: [{ kind: "deposit", amount: 300 }] });
        expect(errorCode(() => assertPaymentAllowed(partlyPaid, { kind: "payment", amount: 700 }))).toBeNull();
        expect(errorCode(() => assertPaymentAllowed(partlyPaid, { kind: "deposit", amount: 700 }))).toBeNull();
        expect(errorCode(() => assertPaymentAllowed(partlyPaid, { kind: "payment", amount: 700.01 }))).toBe("AMOUNT_EXCEEDS_OUTSTANDING");
        const paid = job({ payments: [{ kind: "payment", amount: 1000 }] });
        expect(errorCode(() => assertPaymentAllowed(paid, { kind: "payment", amount: 1 }))).toBe("FULLY_PAID");
    });

    it("compares in satang so float sums do not block an exact payment", () => {
        const odd = job({ totalPrice: 0.3, payments: [{ kind: "payment", amount: 0.1 }] });
        expect(errorCode(() => assertPaymentAllowed(odd, { kind: "payment", amount: 0.2 }))).toBeNull();
    });

    it("ignores voided entries", () => {
        const voided = job({ payments: [{ kind: "payment", amount: 1000, voidedAt: new Date() }] });
        expect(errorCode(() => assertPaymentAllowed(voided, { kind: "payment", amount: 1000 }))).toBeNull();
    });

    it("refuses money in on a cancelled job but allows the refund", () => {
        const cancelled = job({ status: "cancelled", payments: [{ kind: "deposit", amount: 500 }] });
        expect(errorCode(() => assertPaymentAllowed(cancelled, { kind: "deposit", amount: 100 }))).toBe("JOB_CANCELLED");
        expect(errorCode(() => assertPaymentAllowed(cancelled, { kind: "payment", amount: 100 }))).toBe("JOB_CANCELLED");
        expect(errorCode(() => assertPaymentAllowed(cancelled, { kind: "refund", amount: 500 }))).toBeNull();
    });

    it("caps refunds at the net amount held", () => {
        const held = job({ payments: [{ kind: "deposit", amount: 500 }, { kind: "refund", amount: 200 }] });
        expect(errorCode(() => assertPaymentAllowed(held, { kind: "refund", amount: 300 }))).toBeNull();
        expect(errorCode(() => assertPaymentAllowed(held, { kind: "refund", amount: 300.01 }))).toBe("REFUND_EXCEEDS_NET");
        expect(errorCode(() => assertPaymentAllowed(job(), { kind: "refund", amount: 1 }))).toBe("NOTHING_TO_REFUND");
    });
});

describe("paymentLimit", () => {
    it("matches the rules", () => {
        expect(paymentLimit(job({ totalPrice: 0 }), "deposit")).toBe(MAX_MONEY);
        expect(paymentLimit(job({ totalPrice: 0 }), "payment")).toBe(0);
        expect(paymentLimit(job({ payments: [{ kind: "deposit", amount: 250 }] }), "payment")).toBe(750);
        expect(paymentLimit(job({ payments: [{ kind: "deposit", amount: 250 }] }), "refund")).toBe(250);
        expect(paymentLimit(job({ status: "cancelled" }), "deposit")).toBe(0);
    });
});

describe("assertVoidAllowed", () => {
    const entries = [
        { _id: "a", kind: "deposit", amount: 500 },
        { _id: "b", kind: "refund", amount: 500 },
        { _id: "c", kind: "payment", amount: 100, voidedAt: new Date() },
    ];

    it("finds the entry and refuses unknown or already voided ones", () => {
        expect(errorCode(() => assertVoidAllowed(job({ payments: entries }), "zzz"))).toBe("PAYMENT_NOT_FOUND");
        expect(errorCode(() => assertVoidAllowed(job({ payments: entries }), "c"))).toBe("ALREADY_VOIDED");
    });

    it("refuses to void money in that was already refunded, but allows voiding the refund", () => {
        expect(errorCode(() => assertVoidAllowed(job({ payments: entries }), "a"))).toBe("VOID_LEAVES_NEGATIVE_BALANCE");
        expect(errorCode(() => assertVoidAllowed(job({ payments: entries }), "b"))).toBeNull();
        expect(errorCode(() => assertVoidAllowed(job({ payments: entries.slice(0, 1) }), "a"))).toBeNull();
    });
});

describe("receipt numbers", () => {
    it("uses the Bangkok month", () => {
        // 18:00 UTC on 31 Oct is already 1 Nov in Bangkok.
        expect(receiptPrefix(new Date("2026-10-31T18:00:00Z"))).toBe("RC2611");
        expect(receiptPrefix(new Date("2026-10-31T16:59:59Z"))).toBe("RC2610");
        expect(receiptPrefix(new Date("2026-12-31T17:00:00Z"))).toBe("RC2701");
    });

    it("formats the sequence", () => {
        expect(formatReceiptNo("RC2611", 1)).toBe("RC2611-0001");
        expect(formatReceiptNo("RC2611", 12345)).toBe("RC2611-12345");
        expect(receiptCounterKey("RC2611")).toBe("repair_receipt:RC2611");
    });
});

describe("summaryAsOf", () => {
    it("totals the non-voided entries up to and including the one asked for", () => {
        const payments = [
            { _id: "a", kind: "deposit", amount: 300 },
            { _id: "x", kind: "payment", amount: 50, voidedAt: "2026-11-13T00:00:00Z" },
            { _id: "b", kind: "payment", amount: 500 },
            { _id: "c", kind: "payment", amount: 200 },
        ];
        const asOfB = summaryAsOf({ totalPrice: 1000, payments }, "b");
        expect(asOfB?.payment._id).toBe("b");
        expect(asOfB?.summary).toMatchObject({ paid: 800, net: 800, outstanding: 200 });
        expect(summaryAsOf({ totalPrice: 1000, payments }, "missing")).toBeNull();
    });
});
