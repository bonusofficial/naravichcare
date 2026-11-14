"use client";

import { useState } from "react";
import { AlertCircle, ClipboardCheck, Loader2, Lock, Pencil, Save, Smartphone, Wrench, X } from "lucide-react";
import { DEVICE_TYPES, DEVICE_TYPE_LABELS, deviceTypeLabel } from "@/lib/repair/options";
import type { RepairJobSectionProps, RepairJobView } from "@/lib/repair/types";
import { AccessoriesInput, TechnicianSelect } from "./DeviceInputs";
import { patchJob } from "./format";
import { inputClass, primaryButtonClass } from "./job-actions";

interface DeviceForm {
    deviceType: string;
    brand: string;
    deviceModel: string;
    imei: string;
    serialNumber: string;
    color: string;
    deviceCondition: string;
    accessories: string[];
    reportedSymptom: string;
    diagnosticResult: string;
    assignedTechnician: string;
    internalNotes: string;
}

const toForm = (job: RepairJobView): DeviceForm => ({
    deviceType: job.deviceType || "Smartphone",
    brand: job.brand ?? "",
    deviceModel: job.deviceModel ?? "",
    imei: job.imei ?? "",
    serialNumber: job.serialNumber ?? "",
    color: job.color ?? "",
    deviceCondition: job.deviceCondition ?? "",
    accessories: job.accessories ?? [],
    reportedSymptom: job.reportedSymptom ?? "",
    diagnosticResult: job.diagnosticResult ?? "",
    assignedTechnician: job.assignedTechnician?._id ?? "",
    internalNotes: job.internalNotes ?? "",
});

/** Only the fields that changed, so the audit log lists real edits. */
function changes(form: DeviceForm, job: RepairJobView): Record<string, unknown> {
    const before = toForm(job);
    const body: Record<string, unknown> = {};
    for (const key of Object.keys(form) as (keyof DeviceForm)[]) {
        if (JSON.stringify(form[key]) === JSON.stringify(before[key])) continue;
        body[key] = key === "assignedTechnician" ? form[key] || null : form[key];
    }
    return body;
}

function Field({ label, value, wide }: { label: string; value?: string | null; wide?: boolean }) {
    return (
        <div className={wide ? "sm:col-span-2" : undefined}>
            <dt className="text-[11px] font-semibold text-slate-400">{label}</dt>
            <dd className="whitespace-pre-wrap break-words text-xs font-bold text-slate-800">{value || "-"}</dd>
        </div>
    );
}

/**
 * Everything recorded about the device at intake (type, IMEI/serial, colour,
 * condition, accessories, symptom), the technician in charge, the inspection
 * result and internal notes. Editable while the job is open by anyone with
 * edit_repair_jobs; internal notes never appear on customer documents.
 */
export default function DeviceSection({ job, onChanged }: RepairJobSectionProps) {
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState<DeviceForm>(() => toForm(job));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const closed = job.status === "completed" || job.status === "cancelled";
    const set = <K extends keyof DeviceForm>(key: K, value: DeviceForm[K]) => setForm((prev) => ({ ...prev, [key]: value }));

    const startEdit = () => {
        setForm(toForm(job));
        setError("");
        setEditing(true);
    };

    const save = async () => {
        const body = changes(form, job);
        if (!Object.keys(body).length) {
            setEditing(false);
            return;
        }
        if (!form.brand.trim() || !form.deviceModel.trim() || !form.reportedSymptom.trim()) {
            setError("กรุณากรอกแบรนด์ รุ่น และอาการที่แจ้งให้ครบ");
            return;
        }
        setSaving(true);
        setError("");
        try {
            const updated = await patchJob<RepairJobView>(job._id, body);
            setEditing(false);
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
                <h4 className="flex items-center gap-1.5 text-sm font-bold text-slate-900"><Smartphone size={14} /> ข้อมูลเครื่องและการตรวจเช็ก</h4>
                {!closed && !editing && (
                    <button onClick={startEdit} className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200">
                        <Pencil size={12} /> แก้ไข
                    </button>
                )}
                {editing && (
                    <button onClick={() => setEditing(false)} className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200">
                        <X size={12} /> ยกเลิก
                    </button>
                )}
            </div>

            {!editing ? (
                <div className="space-y-4">
                    <dl className="grid gap-3 sm:grid-cols-3">
                        <Field label="ประเภทอุปกรณ์" value={deviceTypeLabel(job.deviceType)} />
                        <Field label="แบรนด์ / รุ่น" value={`${job.brand} ${job.deviceModel}`} />
                        <Field label="สีเครื่อง" value={job.color} />
                        <Field label="IMEI" value={job.imei} />
                        <Field label="Serial Number" value={job.serialNumber} />
                        <Field label="อุปกรณ์ที่ฝากมา" value={(job.accessories ?? []).join(", ")} />
                        <div className="sm:col-span-3"><Field label="สภาพเครื่องตอนรับ" value={job.deviceCondition} /></div>
                    </dl>
                    <div className="rounded-xl border border-red-100 bg-red-50/40 p-3">
                        <p className="flex items-center gap-1 text-[11px] font-bold text-red-600"><AlertCircle size={12} /> อาการที่ลูกค้าแจ้ง</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm font-bold text-slate-800">{job.reportedSymptom}</p>
                    </div>
                    <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                        <p className="flex items-center gap-1 text-[11px] font-bold text-blue-700"><ClipboardCheck size={12} /> ผลตรวจเช็ก</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm font-bold text-slate-800">{job.diagnosticResult || <span className="text-xs font-semibold text-slate-400">ยังไม่ได้บันทึกผลตรวจ</span>}</p>
                    </div>
                    <dl className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
                        <div>
                            <dt className="flex items-center gap-1 text-[11px] font-semibold text-slate-400"><Wrench size={11} /> ช่างผู้รับผิดชอบ</dt>
                            <dd className="text-xs font-bold text-slate-800">{job.assignedTechnician ? job.assignedTechnician.name || job.assignedTechnician.username : "-"}</dd>
                        </div>
                        <div>
                            <dt className="flex items-center gap-1 text-[11px] font-semibold text-slate-400"><Lock size={11} /> หมายเหตุภายใน (ลูกค้าไม่เห็น)</dt>
                            <dd className="whitespace-pre-wrap text-xs font-bold text-slate-800">{job.internalNotes || "-"}</dd>
                        </div>
                    </dl>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                        <label className="space-y-1">
                            <span className="text-[11px] font-semibold text-slate-500">ประเภทอุปกรณ์</span>
                            <select value={form.deviceType} onChange={(e) => set("deviceType", e.target.value)} className={inputClass}>
                                {!(DEVICE_TYPES as readonly string[]).includes(form.deviceType) && <option value={form.deviceType}>{form.deviceType}</option>}
                                {DEVICE_TYPES.map((type) => <option key={type} value={type}>{DEVICE_TYPE_LABELS[type]}</option>)}
                            </select>
                        </label>
                        <label className="space-y-1">
                            <span className="text-[11px] font-semibold text-slate-500">แบรนด์</span>
                            <input value={form.brand} maxLength={80} onChange={(e) => set("brand", e.target.value)} className={inputClass} />
                        </label>
                        <label className="space-y-1">
                            <span className="text-[11px] font-semibold text-slate-500">รุ่น</span>
                            <input value={form.deviceModel} maxLength={120} onChange={(e) => set("deviceModel", e.target.value)} className={inputClass} />
                        </label>
                        <label className="space-y-1">
                            <span className="text-[11px] font-semibold text-slate-500">IMEI</span>
                            <input value={form.imei} maxLength={32} onChange={(e) => set("imei", e.target.value)} className={inputClass} />
                        </label>
                        <label className="space-y-1">
                            <span className="text-[11px] font-semibold text-slate-500">Serial Number</span>
                            <input value={form.serialNumber} maxLength={64} onChange={(e) => set("serialNumber", e.target.value)} className={inputClass} />
                        </label>
                        <label className="space-y-1">
                            <span className="text-[11px] font-semibold text-slate-500">สีเครื่อง</span>
                            <input value={form.color} maxLength={50} onChange={(e) => set("color", e.target.value)} className={inputClass} />
                        </label>
                    </div>
                    <label className="block space-y-1">
                        <span className="text-[11px] font-semibold text-slate-500">สภาพเครื่องตอนรับ</span>
                        <textarea rows={2} value={form.deviceCondition} maxLength={1000} onChange={(e) => set("deviceCondition", e.target.value)} className={inputClass} />
                    </label>
                    <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-slate-500">อุปกรณ์ที่ฝากมากับเครื่อง</span>
                        <AccessoriesInput value={form.accessories} onChange={(accessories) => set("accessories", accessories)} />
                    </div>
                    <label className="block space-y-1">
                        <span className="text-[11px] font-semibold text-red-600">อาการที่ลูกค้าแจ้ง</span>
                        <textarea rows={2} value={form.reportedSymptom} maxLength={4000} onChange={(e) => set("reportedSymptom", e.target.value)} className={inputClass} />
                    </label>
                    <label className="block space-y-1">
                        <span className="text-[11px] font-semibold text-blue-700">ผลตรวจเช็ก</span>
                        <textarea rows={3} value={form.diagnosticResult} maxLength={4000} onChange={(e) => set("diagnosticResult", e.target.value)} className={inputClass} placeholder="เช่น จอเสีย ทัชไม่ติดครึ่งจอ ต้องเปลี่ยนชุดจอ" />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="space-y-1">
                            <span className="text-[11px] font-semibold text-slate-500">ช่างผู้รับผิดชอบ</span>
                            <TechnicianSelect
                                value={form.assignedTechnician}
                                onChange={(id) => set("assignedTechnician", id)}
                                branchId={job.branchId?._id ?? null}
                                currentLabel={job.assignedTechnician?.name || job.assignedTechnician?.username}
                                className={inputClass}
                            />
                        </label>
                        <label className="space-y-1">
                            <span className="text-[11px] font-semibold text-slate-500">หมายเหตุภายใน (ลูกค้าไม่เห็น)</span>
                            <textarea rows={2} value={form.internalNotes} maxLength={4000} onChange={(e) => set("internalNotes", e.target.value)} className={inputClass} />
                        </label>
                    </div>
                    {error && <p className="text-xs font-bold text-red-600">{error}</p>}
                    <button onClick={save} disabled={saving} className={primaryButtonClass}>
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} บันทึกข้อมูลเครื่อง
                    </button>
                </div>
            )}
        </div>
    );
}
