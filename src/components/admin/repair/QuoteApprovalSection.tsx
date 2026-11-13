"use client";

import { useState } from "react";
import { BadgeCheck, Loader2, MessageSquareQuote } from "lucide-react";
import { APPROVAL_CHANNEL, APPROVAL_DECISION, type ApprovalChannel, type ApprovalDecision } from "@/lib/repair/options";
import type { RepairJobSectionProps, RepairJobView } from "@/lib/repair/types";
import { currentCostsVersion, needsQuoteApproval } from "@/lib/repair/workflow";
import { formatBaht, formatDateTime, fromDateTimeLocal } from "./format";
import { inputClass, postJobAction, primaryButtonClass } from "./job-actions";

/**
 * Customer approval of each quotation round (พัฒนา 4): amount, time and
 * channel per round, kept for every price change. A customer job with a price
 * needs an approved round for the current prices before repair can start.
 */
export default function QuoteApprovalSection({ job, onChanged }: RepairJobSectionProps) {
    const defaultApprover = job.customer ? `${job.customer.firstName} ${job.customer.lastName}`.trim() : "";
    const [decision, setDecision] = useState<ApprovalDecision>("approved");
    const [channel, setChannel] = useState<ApprovalChannel>("in_store");
    const [approverName, setApproverName] = useState(defaultApprover);
    const [decidedAt, setDecidedAt] = useState("");
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const closed = job.status === "completed" || job.status === "cancelled";
    const version = currentCostsVersion(job);
    const rounds = [...(job.quoteApprovals ?? [])].sort((a, b) => b.round - a.round);
    const pending = needsQuoteApproval(job);
    const approvedCurrent = rounds.find((r) => r.decision === "approved" && r.costsVersion === version);
    const isStore = job.ownerType === "store";

    const save = async () => {
        setSaving(true);
        setError("");
        try {
            const updated = await postJobAction<RepairJobView>(job._id, "quote-approvals", {
                decision,
                channel,
                approverName,
                ...(decidedAt ? { decidedAt: fromDateTimeLocal(decidedAt) } : {}),
                note,
            });
            setNote("");
            setDecidedAt("");
            onChanged(updated);
        } catch (err) {
            setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="flex items-center gap-1.5 text-sm font-bold text-slate-900"><MessageSquareQuote size={14} /> อนุมัติราคาจากลูกค้า</h4>
                {isStore ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">เครื่องของร้าน ไม่ต้องอนุมัติ</span>
                ) : pending ? (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">รออนุมัติราคาใหม่</span>
                ) : approvedCurrent ? (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700"><BadgeCheck size={12} /> อนุมัติราคาปัจจุบันแล้ว (รอบ {approvedCurrent.round})</span>
                ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">ยังไม่มีราคาที่ต้องอนุมัติ</span>
                )}
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-xs">
                <span className="font-semibold text-slate-500">ราคาปัจจุบัน (ชุดราคาที่ {version})</span>
                <span className="text-sm font-black text-slate-900">{formatBaht(job.totalPrice)}</span>
            </div>

            {!closed && (
                <div className="space-y-3 rounded-xl border border-slate-100 p-4">
                    <p className="text-xs font-bold text-slate-700">บันทึกคำตอบของลูกค้าสำหรับราคานี้</p>
                    <div className="flex gap-2">
                        {APPROVAL_DECISION.values.map((value) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setDecision(value)}
                                className={`flex-1 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                                    decision === value
                                        ? value === "approved" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-red-400 bg-red-50 text-red-600"
                                        : "border-slate-100 bg-white text-slate-500 hover:border-slate-300"
                                }`}
                            >
                                {APPROVAL_DECISION.labels[value]}
                            </button>
                        ))}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="space-y-1">
                            <span className="text-[11px] font-semibold text-slate-500">ช่องทางที่ลูกค้าแจ้ง</span>
                            <select value={channel} onChange={(e) => setChannel(e.target.value as ApprovalChannel)} className={inputClass}>
                                {APPROVAL_CHANNEL.values.map((value) => <option key={value} value={value}>{APPROVAL_CHANNEL.labels[value]}</option>)}
                            </select>
                        </label>
                        <label className="space-y-1">
                            <span className="text-[11px] font-semibold text-slate-500">ชื่อผู้อนุมัติ</span>
                            <input value={approverName} onChange={(e) => setApproverName(e.target.value)} maxLength={120} className={inputClass} placeholder="ชื่อลูกค้าหรือผู้แทน" />
                        </label>
                        <label className="space-y-1">
                            <span className="text-[11px] font-semibold text-slate-500">เวลาที่ลูกค้าแจ้ง (เว้นว่าง = ตอนนี้)</span>
                            <input type="datetime-local" value={decidedAt} onChange={(e) => setDecidedAt(e.target.value)} className={inputClass} />
                        </label>
                        <label className="space-y-1">
                            <span className="text-[11px] font-semibold text-slate-500">หมายเหตุ</span>
                            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} className={inputClass} placeholder="เช่น ขอใช้อะไหล่แท้" />
                        </label>
                    </div>
                    {error && <p className="text-xs font-bold text-red-600">{error}</p>}
                    <button onClick={save} disabled={saving || !approverName.trim()} className={primaryButtonClass}>
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <BadgeCheck size={14} />} บันทึกผลรอบที่ {Math.max(0, ...rounds.map((r) => r.round)) + 1} ({formatBaht(job.totalPrice)})
                    </button>
                </div>
            )}

            {rounds.length > 0 && (
                <ul className="space-y-2">
                    {rounds.map((round) => (
                        <li key={round._id} className="rounded-xl border border-slate-100 p-3 text-xs">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-bold text-slate-900">
                                    รอบที่ {round.round} · {formatBaht(round.totalPrice)}
                                    {round.costsVersion !== version && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">ราคาเปลี่ยนแล้ว</span>}
                                </span>
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${round.decision === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                                    {APPROVAL_DECISION.labels[round.decision]}
                                </span>
                            </div>
                            <p className="mt-1 text-slate-500">
                                ค่าแรง {formatBaht(round.laborCost)} + ค่าอะไหล่ {formatBaht(round.partsCost)} · {APPROVAL_CHANNEL.labels[round.channel]} · {round.approverName} · {formatDateTime(round.decidedAt)}
                            </p>
                            {round.note && <p className="mt-1 text-slate-600">&ldquo;{round.note}&rdquo;</p>}
                            <p className="mt-1 text-[11px] text-slate-400">บันทึกโดย {round.recordedBy}</p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
