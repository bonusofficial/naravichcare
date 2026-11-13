"use client";

import { useState } from "react";
import { ClipboardCheck, Loader2 } from "lucide-react";
import { QC_CHECKLIST, QC_RESULT, type QcResult } from "@/lib/repair/options";
import type { RepairJobSectionProps, RepairJobView, RepairQcCheckView } from "@/lib/repair/types";
import { latestQcCheck, qcPassedForCurrentRepair } from "@/lib/repair/workflow";
import { formatDateTime } from "./format";
import { inputClass, postJobAction, primaryButtonClass } from "./job-actions";

const RESULT_STYLE: Record<QcResult, string> = {
    pass: "border-emerald-500 bg-emerald-50 text-emerald-700",
    fail: "border-red-400 bg-red-50 text-red-600",
    na: "border-slate-400 bg-slate-100 text-slate-600",
};

const labelOf = (key: string) => QC_CHECKLIST.find((item) => item.key === key)?.label ?? key;

/** "QC ผ่าน" etc. for the latest check, shared with HandoverSection. */
export function qcStatus(job: RepairJobView): { label: string; tone: "ok" | "bad" | "warn" | "none" } {
    const latest = latestQcCheck<RepairQcCheckView>(job);
    if (!latest) return { label: "ยังไม่ได้ตรวจ QC", tone: "none" };
    if (latest.overall === "fail") return { label: "QC ล่าสุดไม่ผ่าน", tone: "bad" };
    if (!qcPassedForCurrentRepair(job)) return { label: "ต้องตรวจ QC ใหม่ (มีการซ่อมรอบใหม่)", tone: "warn" };
    return { label: "QC ผ่าน", tone: "ok" };
}

const TONE: Record<ReturnType<typeof qcStatus>["tone"], string> = {
    ok: "bg-emerald-50 text-emerald-700",
    bad: "bg-red-50 text-red-600",
    warn: "bg-amber-50 text-amber-700",
    none: "bg-slate-100 text-slate-500",
};

/**
 * QC before the device goes back (พัฒนา 4): the fixed QC_CHECKLIST with
 * pass/fail/na per item and a note. A repaired job can move to "รอรับคืน"
 * only after a passing QC recorded since it last entered "กำลังซ่อม".
 */
export default function QcSection({ job, onChanged }: RepairJobSectionProps) {
    const [results, setResults] = useState<Partial<Record<string, QcResult>>>({});
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const closed = job.status === "completed" || job.status === "cancelled";
    const status = qcStatus(job);
    const history = [...(job.qcChecks ?? [])].reverse();
    const complete = QC_CHECKLIST.every((item) => results[item.key]);
    const willPass = complete && QC_CHECKLIST.every((item) => results[item.key] !== "fail");

    const save = async () => {
        setSaving(true);
        setError("");
        try {
            const items = QC_CHECKLIST.map((item) => ({ key: item.key, result: results[item.key] }));
            const updated = await postJobAction<RepairJobView>(job._id, "qc", { items, note });
            setResults({});
            setNote("");
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
                <h4 className="flex items-center gap-1.5 text-sm font-bold text-slate-900"><ClipboardCheck size={14} /> QC ก่อนส่งคืน</h4>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${TONE[status.tone]}`}>{status.label}</span>
            </div>

            {!closed && (
                <div className="space-y-3 rounded-xl border border-slate-100 p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-700">ตรวจเช็กเครื่องหลังซ่อม</p>
                        <button
                            type="button"
                            onClick={() => setResults(Object.fromEntries(QC_CHECKLIST.map((item) => [item.key, "pass"])))}
                            className="text-[11px] font-bold text-blue-600 hover:underline"
                        >
                            ผ่านทั้งหมด
                        </button>
                    </div>
                    <ul className="divide-y divide-slate-50">
                        {QC_CHECKLIST.map((item) => (
                            <li key={item.key} className="flex flex-wrap items-center justify-between gap-2 py-2">
                                <span className="text-xs font-semibold text-slate-700">{item.label}</span>
                                <div className="flex gap-1" role="radiogroup" aria-label={item.label}>
                                    {QC_RESULT.values.map((value) => (
                                        <button
                                            key={value}
                                            type="button"
                                            role="radio"
                                            aria-checked={results[item.key] === value}
                                            onClick={() => setResults((prev) => ({ ...prev, [item.key]: value }))}
                                            className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-all ${
                                                results[item.key] === value ? RESULT_STYLE[value] : "border-slate-100 bg-white text-slate-400 hover:border-slate-300"
                                            }`}
                                        >
                                            {QC_RESULT.labels[value]}
                                        </button>
                                    ))}
                                </div>
                            </li>
                        ))}
                    </ul>
                    <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} className={inputClass} placeholder="หมายเหตุ QC (ถ้ามี)" />
                    {error && <p className="text-xs font-bold text-red-600">{error}</p>}
                    <button onClick={save} disabled={saving || !complete} className={primaryButtonClass}>
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <ClipboardCheck size={14} />}
                        {complete ? `บันทึก QC (${willPass ? "ผ่าน" : "ไม่ผ่าน"})` : "เลือกผลให้ครบทุกรายการ"}
                    </button>
                </div>
            )}

            {history.length > 0 && (
                <ul className="space-y-2">
                    {history.map((check) => {
                        const failed = check.items.filter((i) => i.result === "fail");
                        const na = check.items.filter((i) => i.result === "na");
                        return (
                            <li key={check._id} className="rounded-xl border border-slate-100 p-3 text-xs">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="font-semibold text-slate-500">{check.checkedBy} · {formatDateTime(check.checkedAt)}</span>
                                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${check.overall === "pass" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                                        {check.overall === "pass" ? "ผ่าน" : "ไม่ผ่าน"}
                                    </span>
                                </div>
                                {failed.length > 0 && <p className="mt-1 font-semibold text-red-600">ไม่ผ่าน: {failed.map((i) => labelOf(i.key)).join(", ")}</p>}
                                {na.length > 0 && <p className="mt-1 text-slate-400">ไม่เกี่ยวข้อง: {na.map((i) => labelOf(i.key)).join(", ")}</p>}
                                {check.note && <p className="mt-1 text-slate-600">&ldquo;{check.note}&rdquo;</p>}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
