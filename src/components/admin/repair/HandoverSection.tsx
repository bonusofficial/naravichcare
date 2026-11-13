"use client";

import { useState } from "react";
import { ArrowRightCircle, HandHelping, Loader2, Printer } from "lucide-react";
import { REPAIR_OUTCOME, type RepairOutcome } from "@/lib/repair/options";
import { NOT_REPAIRED_FROM, repairStatusLabel } from "@/lib/repair/status";
import type { RepairJobSectionProps, RepairJobView } from "@/lib/repair/types";
import { qcPassedForCurrentRepair, statusLabelForOutcome } from "@/lib/repair/workflow";
import { formatDateTime, fromDateTimeLocal, patchJob } from "./format";
import { inputClass, postJobAction, primaryButtonClass } from "./job-actions";

const REPAIRED_FROM = ["in_progress", "testing"];

function OutcomeBadge({ outcome }: { outcome?: RepairOutcome }) {
    const value = outcome ?? "repaired";
    return (
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${value === "repaired" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
            {REPAIR_OUTCOME.labels[value]}
        </span>
    );
}

/** Choose the outcome and move the job to ready_pickup (repaired needs a passing QC). */
function OutcomeControl({ job, onChanged }: Pick<RepairJobSectionProps, "job" | "onChanged">) {
    const [outcome, setOutcome] = useState<RepairOutcome>("repaired");
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const qcOk = qcPassedForCurrentRepair(job);
    const blocker = outcome === "repaired"
        ? !REPAIRED_FROM.includes(job.status)
            ? `งานต้องอยู่ในสถานะ "${repairStatusLabel("in_progress")}" หรือ "${repairStatusLabel("testing")}" ก่อน`
            : !qcOk ? "ต้องบันทึก QC ผลผ่านในส่วน \"QC ก่อนส่งคืน\" ก่อน" : ""
        : !NOT_REPAIRED_FROM.includes(job.status as (typeof NOT_REPAIRED_FROM)[number]) ? "สถานะปัจจุบันเปลี่ยนไม่ได้" : "";

    const save = async () => {
        if (outcome === "not_repaired" && !window.confirm("ยืนยันว่าลูกค้าไม่ซ่อม และจะคืนเครื่องโดยไม่ซ่อม?")) return;
        setSaving(true);
        setError("");
        try {
            const updated = await patchJob<RepairJobView>(job._id, { status: "ready_pickup", outcome, statusNote: note });
            setNote("");
            onChanged(updated);
        } catch (err) {
            setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-3 rounded-xl border border-slate-100 p-4">
            <p className="text-xs font-bold text-slate-700">ผลการซ่อม → พร้อมคืนเครื่อง</p>
            <div className="flex gap-2">
                {REPAIR_OUTCOME.values.map((value) => (
                    <button
                        key={value}
                        type="button"
                        onClick={() => setOutcome(value)}
                        className={`flex-1 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                            outcome === value
                                ? value === "repaired" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-amber-500 bg-amber-50 text-amber-700"
                                : "border-slate-100 bg-white text-slate-500 hover:border-slate-300"
                        }`}
                    >
                        {REPAIR_OUTCOME.labels[value]}
                    </button>
                ))}
            </div>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} className={inputClass}
                placeholder={outcome === "not_repaired" ? "เหตุผลที่ไม่ซ่อม (บันทึกในประวัติงาน)" : "หมายเหตุ (บันทึกในประวัติงาน)"} />
            {blocker && <p className="text-[11px] font-semibold text-amber-700">{blocker}</p>}
            {error && <p className="text-xs font-bold text-red-600">{error}</p>}
            <button onClick={save} disabled={saving || Boolean(blocker)} className={primaryButtonClass}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <ArrowRightCircle size={14} />}
                เปลี่ยนเป็น &ldquo;{statusLabelForOutcome("ready_pickup", outcome)}&rdquo;
            </button>
        </div>
    );
}

/** Record who took the device back and close the job. */
function HandoverForm({ job, onChanged }: Pick<RepairJobSectionProps, "job" | "onChanged">) {
    const [receiverName, setReceiverName] = useState(job.customer ? `${job.customer.firstName} ${job.customer.lastName}`.trim() : "");
    const [receiverPhone, setReceiverPhone] = useState(job.customer?.phone ?? "");
    const [receiverRelation, setReceiverRelation] = useState(job.customer ? "เจ้าของเครื่อง" : "");
    const [handedOverAt, setHandedOverAt] = useState("");
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const save = async () => {
        setSaving(true);
        setError("");
        try {
            const updated = await postJobAction<RepairJobView>(job._id, "handover", {
                receiverName,
                receiverPhone,
                receiverRelation,
                ...(handedOverAt ? { handedOverAt: fromDateTimeLocal(handedOverAt) } : {}),
                note,
            });
            onChanged(updated);
        } catch (err) {
            setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-3 rounded-xl border border-slate-100 p-4">
            <p className="text-xs font-bold text-slate-700">บันทึกการส่งมอบเครื่องและปิดงาน</p>
            <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500">ชื่อผู้รับเครื่อง *</span>
                    <input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} maxLength={120} className={inputClass} />
                </label>
                <label className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500">เบอร์โทรผู้รับ</span>
                    <input value={receiverPhone} onChange={(e) => setReceiverPhone(e.target.value)} maxLength={20} inputMode="tel" className={inputClass} />
                </label>
                <label className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500">ความเกี่ยวข้องกับเจ้าของ</span>
                    <input value={receiverRelation} onChange={(e) => setReceiverRelation(e.target.value)} maxLength={100} className={inputClass} placeholder="เช่น เจ้าของเครื่อง / ญาติ / รับแทน" />
                </label>
                <label className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500">เวลาส่งมอบ (เว้นว่าง = ตอนนี้)</span>
                    <input type="datetime-local" value={handedOverAt} onChange={(e) => setHandedOverAt(e.target.value)} className={inputClass} />
                </label>
            </div>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} className={inputClass} placeholder="หมายเหตุการส่งมอบ" />
            <p className="text-[11px] text-slate-400">ผู้ส่งมอบจะบันทึกเป็นผู้ใช้ที่เข้าสู่ระบบอยู่</p>
            {error && <p className="text-xs font-bold text-red-600">{error}</p>}
            <button onClick={save} disabled={saving || !receiverName.trim()} className={primaryButtonClass}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <HandHelping size={14} />} บันทึกส่งมอบและปิดงาน
            </button>
        </div>
    );
}

/**
 * Handover and closing (พัฒนา 2): the outcome (repaired, or refused by the
 * customer), then who took the device back, who handed it over and when.
 * The job closes only through this record, for both outcomes.
 */
export default function HandoverSection({ job, onChanged, onPrint }: RepairJobSectionProps) {
    if (job.status === "cancelled") return null;
    const ready = job.status === "ready_pickup";
    const completed = job.status === "completed";
    const handover = job.handover;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="flex items-center gap-1.5 text-sm font-bold text-slate-900"><HandHelping size={14} /> ส่งมอบเครื่องและปิดงาน</h4>
                <div className="flex items-center gap-2">
                    {(ready || completed) && <OutcomeBadge outcome={job.outcome} />}
                    {(ready || completed) && (
                        <button onClick={() => onPrint({ mode: "handover" })} className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-200">
                            <Printer size={12} /> พิมพ์ใบส่งมอบ
                        </button>
                    )}
                </div>
            </div>

            {!ready && !completed && <OutcomeControl job={job} onChanged={onChanged} />}
            {ready && <HandoverForm key={job._id} job={job} onChanged={onChanged} />}
            {completed && (
                handover ? (
                    <dl className="grid gap-3 rounded-xl bg-slate-50 p-4 text-xs sm:grid-cols-2">
                        <div><dt className="font-semibold text-slate-500">ผู้รับเครื่อง</dt><dd className="font-bold text-slate-900">{handover.receiverName}{handover.receiverRelation ? ` (${handover.receiverRelation})` : ""}</dd></div>
                        <div><dt className="font-semibold text-slate-500">เบอร์โทรผู้รับ</dt><dd className="font-bold text-slate-900">{handover.receiverPhone || "-"}</dd></div>
                        <div><dt className="font-semibold text-slate-500">ผู้ส่งมอบ</dt><dd className="font-bold text-slate-900">{handover.handedOverBy}</dd></div>
                        <div><dt className="font-semibold text-slate-500">เวลาส่งมอบ</dt><dd className="font-bold text-slate-900">{formatDateTime(handover.handedOverAt)}</dd></div>
                        {handover.note && <div className="sm:col-span-2"><dt className="font-semibold text-slate-500">หมายเหตุ</dt><dd className="font-bold text-slate-900">{handover.note}</dd></div>}
                    </dl>
                ) : (
                    <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">ปิดงานก่อนมีระบบบันทึกการส่งมอบ ({formatDateTime(job.handedOverAt)})</p>
                )
            )}
        </div>
    );
}
