"use client";

import { useState } from "react";
import { Ban, Banknote, CheckCircle2, Loader2, Printer, RotateCcw, Save, X } from "lucide-react";
import { useCurrentAdmin } from "@/hooks/useCurrentAdmin";
import { PAYMENT_KIND, PAYMENT_METHOD, type PaymentMethod } from "@/lib/repair/options";
import { paymentLimit, PAYMENT_NOTE_MAX, VOID_REASON_MAX } from "@/lib/repair/payments";
import { summarizePayments } from "@/lib/repair/summary";
import type { RepairJobSectionProps, RepairJobView, RepairPaymentView } from "@/lib/repair/types";
import { formatBaht, formatDateTime, fromDateTimeLocal } from "./format";

/**
 * Money received against the job (งานเพิ่ม 2): deposits, payments, refunds
 * and voids, with method, receipt number and running totals. Each entry gets
 * its own receipt, printed with onPrint({ mode: "receipt", paymentId }).
 * Actions are hidden when the user lacks manage_repair_payments /
 * refund_repair_payments; the API checks them again.
 */

type FormMode = "in" | "refund";
type InKind = "deposit" | "payment";

const INPUT = "w-full rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-xs font-bold outline-none focus:border-blue-500 disabled:opacity-60";
const KIND_STYLE: Record<string, string> = {
    deposit: "bg-blue-50 text-blue-700",
    payment: "bg-emerald-50 text-emerald-700",
    refund: "bg-amber-50 text-amber-700",
};

async function send(url: string, method: "POST" | "PATCH", body: Record<string, unknown>): Promise<RepairJobView> {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string }).error || "บันทึกไม่สำเร็จ");
    return data as RepairJobView;
}

export default function PaymentsSection({ job, onChanged, onPrint }: RepairJobSectionProps) {
    const { permissions } = useCurrentAdmin();
    const canReceive = permissions.includes("manage_repair_payments");
    const canRefund = permissions.includes("refund_repair_payments");

    const [form, setForm] = useState<FormMode | null>(null);
    const [kind, setKind] = useState<InKind>("payment");
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState<PaymentMethod>("cash");
    const [receivedAt, setReceivedAt] = useState("");
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [lastSaved, setLastSaved] = useState<RepairPaymentView | null>(null);
    const [voidingId, setVoidingId] = useState<string | null>(null);
    const [voidReason, setVoidReason] = useState("");

    const payments = job.payments ?? [];
    const summary = summarizePayments(job);
    const cancelled = job.status === "cancelled";
    const noPrice = summary.total === 0;
    const state = { status: job.status, totalPrice: job.totalPrice, payments };
    const inLimit = Math.max(paymentLimit(state, "deposit"), paymentLimit(state, "payment"));
    const refundLimit = paymentLimit(state, "refund");
    const showReceive = canReceive && !cancelled && inLimit > 0;
    const showRefund = canRefund && refundLimit > 0;
    const activeKind = form === "refund" ? "refund" : kind;
    const limit = form ? paymentLimit(state, activeKind) : 0;
    const hasEntries = payments.some((entry) => !entry.voidedAt);

    const open = (mode: FormMode) => {
        setForm(mode);
        setError("");
        setLastSaved(null);
        setMethod("cash");
        setReceivedAt("");
        setNote("");
        if (mode === "refund") {
            setAmount(String(refundLimit));
        } else {
            const nextKind: InKind = noPrice ? "deposit" : "payment";
            setKind(nextKind);
            setAmount(nextKind === "payment" ? String(summary.outstanding) : "");
        }
    };

    const submit = async () => {
        const value = Number(amount);
        if (!amount || !Number.isFinite(value) || value <= 0) return setError("กรุณากรอกจำนวนเงินมากกว่า 0");
        if (value > limit) return setError(`จำนวนเงินเกินยอดที่บันทึกได้ (${formatBaht(limit)})`);
        setSaving(true);
        setError("");
        try {
            const updated = await send(`/api/admin/repair/jobs/${job._id}/payments`, "POST", {
                kind: activeKind,
                amount: value,
                method,
                receivedAt: fromDateTimeLocal(receivedAt),
                note,
            });
            setForm(null);
            setLastSaved(updated.payments?.at(-1) ?? null);
            onChanged(updated);
        } catch (err) {
            setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
        } finally {
            setSaving(false);
        }
    };

    const confirmVoid = async (paymentId: string) => {
        if (!voidReason.trim()) return setError("กรุณาระบุเหตุผลที่ยกเลิกรายการ");
        setSaving(true);
        setError("");
        try {
            const updated = await send(`/api/admin/repair/jobs/${job._id}/payments/${paymentId}`, "PATCH", { action: "void", reason: voidReason });
            setVoidingId(null);
            setVoidReason("");
            setLastSaved(null);
            onChanged(updated);
        } catch (err) {
            setError(err instanceof Error ? err.message : "ยกเลิกรายการไม่สำเร็จ");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Banknote size={16} className="text-slate-400" /> การรับเงิน</h4>
                <div className="flex flex-wrap gap-2">
                    {hasEntries && (
                        <button onClick={() => onPrint({ mode: "receipt" })} className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-200">
                            <Printer size={12} /> พิมพ์สรุปการชำระ
                        </button>
                    )}
                    {showReceive && (
                        <button onClick={() => open("in")} className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-blue-600">
                            <Banknote size={12} /> รับเงิน
                        </button>
                    )}
                    {showRefund && (
                        <button onClick={() => open("refund")} className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-700 hover:bg-amber-100">
                            <RotateCcw size={12} /> คืนเงิน
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <SummaryCard label="ราคาที่ต้องชำระ" value={noPrice ? "ยังไม่มีราคา" : formatBaht(summary.total)} />
                <SummaryCard label="รับแล้ว" value={formatBaht(summary.paid)} />
                <SummaryCard label="คืนแล้ว" value={formatBaht(summary.refunded)} />
                <SummaryCard
                    label="คงค้าง"
                    value={cancelled ? "งานยกเลิก" : !noPrice && summary.outstanding === 0 ? "ชำระครบ" : formatBaht(summary.outstanding)}
                    tone={cancelled ? "muted" : summary.outstanding > 0 ? "danger" : noPrice ? "default" : "success"}
                />
            </div>

            {summary.overpaid > 0 && (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                    เงินเกิน {formatBaht(summary.overpaid)} — รับเงินไว้มากกว่าราคา{cancelled ? " (งานยกเลิก)" : ""} ควรคืนเงินลูกค้า
                </p>
            )}
            {noPrice && !cancelled && canReceive && (
                <p className="text-[11px] font-semibold text-slate-400">ยังไม่มีราคา รับได้เฉพาะเงินมัดจำ</p>
            )}

            {lastSaved && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
                    <span className="flex items-center gap-1.5"><CheckCircle2 size={14} /> บันทึกแล้ว ใบเสร็จเลขที่ {lastSaved.receiptNo}</span>
                    <button onClick={() => onPrint({ mode: "receipt", paymentId: lastSaved._id })} className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-emerald-700 hover:bg-emerald-100">
                        <Printer size={12} /> พิมพ์ใบเสร็จ
                    </button>
                </div>
            )}

            {form && (
                <div className={`space-y-3 rounded-2xl border p-4 ${form === "refund" ? "border-amber-200 bg-amber-50/40" : "border-slate-200 bg-slate-50/50"}`}>
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-700">{form === "refund" ? "คืนเงินลูกค้า" : "รับเงินจากลูกค้า"}</p>
                        <button onClick={() => setForm(null)} aria-label="ปิด" className="text-slate-400 hover:text-slate-700"><X size={14} /></button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {form === "in" && (
                            <label className="space-y-1.5">
                                <span className="text-xs font-semibold text-slate-500">ประเภท</span>
                                <select value={kind} onChange={(event) => setKind(event.target.value as InKind)} className={INPUT}>
                                    <option value="deposit">{PAYMENT_KIND.labels.deposit}</option>
                                    <option value="payment" disabled={noPrice}>{PAYMENT_KIND.labels.payment}</option>
                                </select>
                            </label>
                        )}
                        <label className="space-y-1.5">
                            <span className="text-xs font-semibold text-slate-500">
                                จำนวนเงิน (บาท)
                                {!(form === "in" && kind === "deposit" && noPrice) && <span className="ml-1 text-slate-400">สูงสุด {formatBaht(limit)}</span>}
                            </span>
                            <input type="number" inputMode="decimal" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className={INPUT} />
                        </label>
                        <label className="space-y-1.5">
                            <span className="text-xs font-semibold text-slate-500">{form === "refund" ? "ช่องทางคืนเงิน" : "ช่องทางชำระ"}</span>
                            <select value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)} className={INPUT}>
                                {PAYMENT_METHOD.values.map((value) => <option key={value} value={value}>{PAYMENT_METHOD.labels[value]}</option>)}
                            </select>
                        </label>
                        <label className="space-y-1.5">
                            <span className="text-xs font-semibold text-slate-500">วันเวลา <span className="text-slate-400">(เว้นว่าง = ตอนนี้)</span></span>
                            <input type="datetime-local" value={receivedAt} onChange={(event) => setReceivedAt(event.target.value)} className={INPUT} />
                        </label>
                        <label className="space-y-1.5 sm:col-span-2">
                            <span className="text-xs font-semibold text-slate-500">{form === "refund" ? "เหตุผล/หมายเหตุ" : "หมายเหตุ"}</span>
                            <input type="text" maxLength={PAYMENT_NOTE_MAX} value={note} onChange={(event) => setNote(event.target.value)} className={INPUT} />
                        </label>
                    </div>
                    {error && <p className="text-xs font-bold text-red-600">{error}</p>}
                    <button
                        onClick={submit}
                        disabled={saving}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white transition-all disabled:opacity-40 ${form === "refund" ? "bg-amber-600 hover:bg-amber-700" : "bg-slate-900 hover:bg-blue-600"}`}
                    >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {form === "refund" ? "บันทึกคืนเงิน" : "บันทึกรับเงิน"}
                    </button>
                </div>
            )}

            {payments.length === 0 ? (
                <p className="text-xs font-semibold text-slate-400">ยังไม่มีรายการรับเงิน</p>
            ) : (
                <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-100">
                    {payments.map((entry) => {
                        const voided = Boolean(entry.voidedAt);
                        return (
                            <li key={entry._id} className={`space-y-2 p-3 ${voided ? "bg-slate-50/60" : ""}`}>
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className={`min-w-0 space-y-1 ${voided ? "opacity-60" : ""}`}>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${KIND_STYLE[entry.kind] ?? "bg-slate-100 text-slate-600"}`}>{PAYMENT_KIND.labels[entry.kind] ?? entry.kind}</span>
                                            <span className="font-mono text-[11px] font-bold text-slate-700">{entry.receiptNo}</span>
                                            <span className="text-[11px] font-semibold text-slate-500">{PAYMENT_METHOD.labels[entry.method] ?? entry.method}</span>
                                        </div>
                                        <p className="text-[11px] text-slate-400">{formatDateTime(entry.receivedAt)} · บันทึกโดย {entry.recordedBy}</p>
                                        {entry.note && <p className="break-words text-[11px] text-slate-500">{entry.note}</p>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm font-black ${voided ? "text-slate-400 line-through" : entry.kind === "refund" ? "text-amber-700" : "text-slate-900"}`}>
                                            {entry.kind === "refund" ? "−" : ""}{formatBaht(entry.amount)}
                                        </span>
                                        {!voided && (
                                            <button onClick={() => onPrint({ mode: "receipt", paymentId: entry._id })} title="พิมพ์ใบเสร็จ" aria-label={`พิมพ์ใบเสร็จ ${entry.receiptNo}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                                                <Printer size={14} />
                                            </button>
                                        )}
                                        {!voided && canRefund && (
                                            <button
                                                onClick={() => { setVoidingId(entry._id); setVoidReason(""); setError(""); }}
                                                title="ยกเลิกรายการ"
                                                aria-label={`ยกเลิกรายการ ${entry.receiptNo}`}
                                                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                            >
                                                <Ban size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {voided && (
                                    <p className="text-[11px] font-semibold text-red-600">
                                        ยกเลิกแล้ว · {entry.voidedBy || "-"} · {formatDateTime(entry.voidedAt)} · เหตุผล: {entry.voidReason || "-"}
                                    </p>
                                )}
                                {voidingId === entry._id && (
                                    <div className="space-y-2 rounded-xl border border-red-100 bg-red-50/50 p-3">
                                        <label className="block space-y-1.5">
                                            <span className="text-xs font-semibold text-red-700">เหตุผลที่ยกเลิกใบเสร็จ {entry.receiptNo}</span>
                                            <input type="text" maxLength={VOID_REASON_MAX} value={voidReason} onChange={(event) => setVoidReason(event.target.value)} className={INPUT} autoFocus />
                                        </label>
                                        {error && <p className="text-xs font-bold text-red-600">{error}</p>}
                                        <div className="flex gap-2">
                                            <button onClick={() => confirmVoid(entry._id)} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-red-700 disabled:opacity-40">
                                                {saving ? <Loader2 size={12} className="animate-spin" /> : <Ban size={12} />} ยืนยันยกเลิกรายการ
                                            </button>
                                            <button onClick={() => setVoidingId(null)} className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-100">ไม่ยกเลิก</button>
                                        </div>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

function SummaryCard({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "danger" | "success" | "muted" }) {
    const color = { default: "text-slate-900", danger: "text-red-600", success: "text-emerald-600", muted: "text-slate-400" }[tone];
    return (
        <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
            <p className="text-[10px] font-semibold text-slate-500">{label}</p>
            <p className={`mt-1 text-sm font-black ${color}`}>{value}</p>
        </div>
    );
}
