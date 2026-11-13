/**
 * Business rules for money received against a repair job (งานเพิ่ม 2):
 * deposits, payments, refunds, voids and receipt numbers.
 *
 * Pure functions with no server-only imports, so the admin page can use the
 * same limits as the API. The database side (receipt counter, conditional
 * updates) lives in payment-service.ts.
 *
 * Rules:
 * - deposit/payment: not on a cancelled job, and never more than what is
 *   outstanding. While the job has no price yet (totalPrice 0) only a
 *   deposit is accepted, of any amount up to MAX_MONEY.
 * - refund: allowed on any job, cancelled ones included (that is how a
 *   deposit goes back), up to the net amount the shop holds.
 * - void: entries are never deleted. Voiding a deposit/payment may not leave
 *   more refunded than received; void the refund first.
 */

import type { Permission } from "@/lib/permissions";
import { isValidMoney, MAX_MONEY } from "./costs";
import { PAYMENT_KIND, PAYMENT_METHOD, type PaymentKind, type PaymentMethod } from "./options";
import { summarizePayments, type PaymentLike, type PaymentSummary } from "./summary";

export type RepairPaymentErrorCode =
    | "VALIDATION_ERROR"
    | "JOB_CANCELLED"
    | "NO_PRICE_YET"
    | "FULLY_PAID"
    | "AMOUNT_EXCEEDS_OUTSTANDING"
    | "NOTHING_TO_REFUND"
    | "REFUND_EXCEEDS_NET"
    | "PAYMENT_NOT_FOUND"
    | "ALREADY_VOIDED"
    | "VOID_LEAVES_NEGATIVE_BALANCE"
    | "CONCURRENT_UPDATE";

export class RepairPaymentError extends Error {
    constructor(
        public readonly code: RepairPaymentErrorCode,
        public readonly status: number,
        message: string,
        public readonly fields?: string[],
    ) {
        super(message);
        this.name = "RepairPaymentError";
    }
}

export const PAYMENT_NOTE_MAX = 500;
export const VOID_REASON_MAX = 500;
/** How far a receivedAt may run ahead of the server clock (device clock drift). */
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;
const EARLIEST_RECEIVED_AT = Date.UTC(2000, 0, 1);
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

/** deposit/payment need manage_repair_payments; refunds need refund_repair_payments. */
export function paymentPermission(kind: unknown): Permission {
    return kind === "refund" ? "refund_repair_payments" : "manage_repair_payments";
}

/** Voiding undoes money movements in both directions, so it needs the refund permission. */
export const VOID_PAYMENT_PERMISSION: Permission = "refund_repair_payments";

export interface PaymentInput {
    kind: PaymentKind;
    amount: number;
    method: PaymentMethod;
    receivedAt: Date;
    note: string;
}

function invalid(message: string, field: string): never {
    throw new RepairPaymentError("VALIDATION_ERROR", 400, message, [field]);
}

function optionalText(raw: unknown, field: string, label: string, max: number): string {
    if (raw === undefined || raw === null) return "";
    if (typeof raw !== "string") invalid(`${label}ต้องเป็นข้อความ`, field);
    const value = raw.trim();
    if (value.length > max) invalid(`${label}ยาวเกิน ${max} ตัวอักษร`, field);
    if (CONTROL_CHARS.test(value)) invalid(`${label}มีอักขระที่ไม่อนุญาต`, field);
    return value;
}

/** Validate a POST body. recordedBy and receiptNo are never taken from the client. */
export function parsePaymentInput(body: unknown, now: Date = new Date()): PaymentInput {
    if (!body || typeof body !== "object" || Array.isArray(body)) invalid("ข้อมูลไม่ถูกต้อง", "body");
    const raw = body as Record<string, unknown>;

    if (!PAYMENT_KIND.is(raw.kind)) invalid("ประเภทรายการไม่ถูกต้อง", "kind");
    if (!PAYMENT_METHOD.is(raw.method)) invalid("ช่องทางชำระเงินไม่ถูกต้อง", "method");
    if (!isValidMoney(raw.amount) || raw.amount <= 0) {
        invalid(`จำนวนเงินต้องมากกว่า 0 และไม่เกิน ${MAX_MONEY.toLocaleString("th-TH")} บาท (ทศนิยมไม่เกิน 2 ตำแหน่ง)`, "amount");
    }

    let receivedAt = now;
    if (raw.receivedAt !== undefined && raw.receivedAt !== null && raw.receivedAt !== "") {
        if (typeof raw.receivedAt !== "string") invalid("วันเวลารับเงินไม่ถูกต้อง", "receivedAt");
        const parsed = new Date(raw.receivedAt);
        if (Number.isNaN(parsed.getTime()) || parsed.getTime() < EARLIEST_RECEIVED_AT) invalid("วันเวลารับเงินไม่ถูกต้อง", "receivedAt");
        if (parsed.getTime() > now.getTime() + FUTURE_TOLERANCE_MS) invalid("วันเวลารับเงินต้องไม่อยู่ในอนาคต", "receivedAt");
        receivedAt = parsed;
    }

    return {
        kind: raw.kind,
        amount: raw.amount,
        method: raw.method,
        receivedAt,
        note: optionalText(raw.note, "note", "หมายเหตุ", PAYMENT_NOTE_MAX),
    };
}

/** Validate a void request: `{ action: "void", reason }` with a non-empty reason. */
export function parseVoidInput(body: unknown): { reason: string } {
    if (!body || typeof body !== "object" || Array.isArray(body)) invalid("ข้อมูลไม่ถูกต้อง", "body");
    const raw = body as Record<string, unknown>;
    if (raw.action !== "void") invalid('รองรับเฉพาะ action "void"', "action");
    const reason = optionalText(raw.reason, "reason", "เหตุผล", VOID_REASON_MAX);
    if (!reason) invalid("กรุณาระบุเหตุผลที่ยกเลิกรายการ", "reason");
    return { reason };
}

/** The parts of a job the payment rules look at. */
export interface PaymentJobState {
    status: string;
    totalPrice?: number | null;
    payments?: readonly (PaymentLike & { _id?: unknown })[] | null;
}

const satang = (value: number) => Math.round(value * 100);

/**
 * The largest amount of this kind that can be recorded right now (0 when
 * none). A deposit on a job with no price yet is capped only by MAX_MONEY.
 */
export function paymentLimit(job: PaymentJobState, kind: PaymentKind): number {
    const summary = summarizePayments(job);
    if (kind === "refund") return Math.max(summary.net, 0);
    if (job.status === "cancelled") return 0;
    if (summary.total === 0) return kind === "deposit" ? MAX_MONEY : 0;
    return summary.outstanding;
}

/** Throw a RepairPaymentError when this entry may not be recorded on the job. */
export function assertPaymentAllowed(job: PaymentJobState, input: { kind: PaymentKind; amount: number }): void {
    const summary = summarizePayments(job);
    const baht = (value: number) => value.toLocaleString("th-TH", { maximumFractionDigits: 2 });

    if (input.kind === "refund") {
        if (summary.net <= 0) throw new RepairPaymentError("NOTHING_TO_REFUND", 409, "งานนี้ไม่มียอดเงินที่รับไว้ให้คืน");
        if (satang(input.amount) > satang(summary.net)) {
            throw new RepairPaymentError("REFUND_EXCEEDS_NET", 409, `คืนเงินได้ไม่เกินยอดที่รับไว้สุทธิ ${baht(summary.net)} บาท`);
        }
        return;
    }

    if (job.status === "cancelled") throw new RepairPaymentError("JOB_CANCELLED", 409, "งานนี้ถูกยกเลิกแล้ว รับเงินเพิ่มไม่ได้");
    if (summary.total === 0) {
        if (input.kind !== "deposit") {
            throw new RepairPaymentError("NO_PRICE_YET", 409, "งานนี้ยังไม่มีราคา รับได้เฉพาะเงินมัดจำ");
        }
        return;
    }
    if (summary.outstanding <= 0) throw new RepairPaymentError("FULLY_PAID", 409, "งานนี้ชำระครบแล้ว");
    if (satang(input.amount) > satang(summary.outstanding)) {
        throw new RepairPaymentError("AMOUNT_EXCEEDS_OUTSTANDING", 409, `รับเงินได้ไม่เกินยอดคงค้าง ${baht(summary.outstanding)} บาท`);
    }
}

/** Throw unless the entry exists, is not voided, and voiding it keeps the balance sane. */
export function assertVoidAllowed(job: PaymentJobState, paymentId: string): void {
    const payments = job.payments ?? [];
    const payment = payments.find((entry) => String(entry._id) === paymentId);
    if (!payment) throw new RepairPaymentError("PAYMENT_NOT_FOUND", 404, "ไม่พบรายการรับเงินนี้");
    if (payment.voidedAt) throw new RepairPaymentError("ALREADY_VOIDED", 409, "รายการนี้ถูกยกเลิกไปแล้ว");
    if (payment.kind === "refund") return;
    const after = summarizePayments({ totalPrice: job.totalPrice, payments: payments.filter((entry) => entry !== payment) });
    if (after.net < 0) {
        throw new RepairPaymentError(
            "VOID_LEAVES_NEGATIVE_BALANCE",
            409,
            "ยกเลิกรายการนี้แล้วยอดคืนเงินจะมากกว่ายอดที่รับ กรุณายกเลิกรายการคืนเงินก่อน",
        );
    }
}

// --- Receipt numbers ---------------------------------------------------------

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000; // Thailand has no daylight saving time.

/** "RC" + yyMM of the date in Bangkok, e.g. RC2611. */
export function receiptPrefix(date: Date = new Date()): string {
    const bangkok = new Date(date.getTime() + BANGKOK_OFFSET_MS);
    const yy = String(bangkok.getUTCFullYear()).slice(-2);
    const mm = String(bangkok.getUTCMonth() + 1).padStart(2, "0");
    return `RC${yy}${mm}`;
}

/** Counter key for one month's receipt series. */
export const receiptCounterKey = (prefix: string) => `repair_receipt:${prefix}`;

/** RC2611 + 1 -> RC2611-0001. */
export const formatReceiptNo = (prefix: string, sequence: number) => `${prefix}-${String(sequence).padStart(4, "0")}`;

// --- Figures for one receipt ---------------------------------------------------

/**
 * Totals as of one entry: every non-voided entry up to and including it, in
 * the order they were recorded. Used for "received to date" and "outstanding
 * after this receipt" on a printed receipt. Null when the id is unknown.
 */
export function summaryAsOf<P extends PaymentLike & { _id?: unknown }>(
    job: { totalPrice?: number | null; payments?: readonly P[] | null },
    paymentId: string,
): { payment: P; summary: PaymentSummary } | null {
    const payments = job.payments ?? [];
    const index = payments.findIndex((entry) => String(entry._id) === paymentId);
    if (index < 0) return null;
    return {
        payment: payments[index],
        summary: summarizePayments({ totalPrice: job.totalPrice, payments: payments.slice(0, index + 1) }),
    };
}
