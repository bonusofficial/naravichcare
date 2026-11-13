import mongoose from "mongoose";
import { NextResponse } from "next/server";
import Counter from "@/models/Counter";
import RepairJob from "@/models/RepairJob";
import type { RepairActor } from "./service";
import {
    assertPaymentAllowed, assertVoidAllowed, formatReceiptNo, receiptCounterKey, receiptPrefix,
    RepairPaymentError, type PaymentInput, type PaymentJobState,
} from "./payments";

/**
 * Database side of repair payments. Rules are in payments.ts; this file
 * allocates receipt numbers and writes entries with conditional updates so
 * two people recording money on the same job at once cannot overshoot the
 * outstanding balance.
 */

type JobState = PaymentJobState & { _id: mongoose.Types.ObjectId };

const MAX_ATTEMPTS = 3;

/** Next receipt number for the current Bangkok month, e.g. RC2611-0001. */
export async function nextReceiptNo(now: Date = new Date()): Promise<string> {
    const prefix = receiptPrefix(now);
    const counter = await Counter.findOneAndUpdate(
        { key: receiptCounterKey(prefix) },
        { $inc: { value: 1 } },
        { upsert: true, returnDocument: "after" },
    );
    return formatReceiptNo(prefix, counter.value as number);
}

/** Matches only while price and payments are as the rules saw them. */
function unchangedFilter(job: JobState) {
    const payments = job.payments ?? [];
    const voided = payments.filter((entry) => entry.voidedAt).length;
    const list = { $ifNull: ["$payments", []] };
    return {
        $expr: {
            $and: [
                { $eq: [{ $ifNull: ["$totalPrice", 0] }, job.totalPrice ?? 0] },
                { $eq: [{ $size: list }, payments.length] },
                { $eq: [{ $size: { $filter: { input: list, cond: { $ne: [{ $ifNull: ["$$this.voidedAt", null] }, null] } } } }, voided] },
            ],
        },
    };
}

async function reload(id: mongoose.Types.ObjectId): Promise<JobState> {
    const fresh = await RepairJob.findById(id).select("status totalPrice payments").lean<JobState>();
    if (!fresh) throw new RepairPaymentError("PAYMENT_NOT_FOUND", 404, "ไม่พบงานซ่อมนี้");
    return fresh;
}

export interface RecordedPayment {
    _id: mongoose.Types.ObjectId;
    receiptNo: string;
}

/**
 * Append one deposit/payment/refund. The receipt number is allocated once,
 * after the rules pass; if a concurrent change then makes the entry invalid
 * the number is skipped (a gap in the series, never a duplicate).
 */
export async function recordPayment(initial: JobState, input: PaymentInput, actor: RepairActor): Promise<RecordedPayment> {
    let job = initial;
    let receiptNo: string | null = null;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        assertPaymentAllowed(job, input);
        receiptNo ??= await nextReceiptNo();
        const entry = {
            _id: new mongoose.Types.ObjectId(),
            kind: input.kind,
            amount: input.amount,
            method: input.method,
            receivedAt: input.receivedAt,
            receiptNo,
            recordedBy: actor.name,
            ...(actor.id ? { recordedById: actor.id } : {}),
            note: input.note,
        };
        const filter = {
            _id: job._id,
            ...(input.kind === "refund" ? {} : { status: { $ne: "cancelled" } }),
            ...unchangedFilter(job),
        };
        const result = await RepairJob.updateOne(filter, { $push: { payments: entry } }, { runValidators: true });
        if (result.modifiedCount === 1) return { _id: entry._id, receiptNo };
        job = await reload(job._id);
    }
    throw new RepairPaymentError("CONCURRENT_UPDATE", 409, "มีการแก้ไขงานนี้พร้อมกัน กรุณาลองใหม่");
}

/** Mark one entry voided with a reason. Entries are never deleted. */
export async function voidPayment(initial: JobState, paymentId: string, reason: string, actor: RepairActor) {
    if (!mongoose.isValidObjectId(paymentId)) throw new RepairPaymentError("PAYMENT_NOT_FOUND", 404, "ไม่พบรายการรับเงินนี้");
    const pid = new mongoose.Types.ObjectId(paymentId);
    let job = initial;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        assertVoidAllowed(job, paymentId);
        const result = await RepairJob.updateOne(
            { _id: job._id, payments: { $elemMatch: { _id: pid, voidedAt: null } }, ...unchangedFilter(job) },
            { $set: { "payments.$.voidedAt": new Date(), "payments.$.voidedBy": actor.name, "payments.$.voidReason": reason } },
            { runValidators: true },
        );
        if (result.modifiedCount === 1) return (job.payments ?? []).find((entry) => String(entry._id) === paymentId)!;
        job = await reload(job._id);
    }
    throw new RepairPaymentError("CONCURRENT_UPDATE", 409, "มีการแก้ไขงานนี้พร้อมกัน กรุณาลองใหม่");
}

export function paymentErrorResponse(error: unknown): NextResponse | null {
    if (error instanceof RepairPaymentError) {
        return NextResponse.json({ error: error.message, code: error.code, ...(error.fields ? { fields: error.fields } : {}) }, { status: error.status });
    }
    return null;
}
