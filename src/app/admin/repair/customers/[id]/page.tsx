"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, ClipboardList, Loader2, Pencil, Save, User, X } from "lucide-react";
import { statusLabelForOutcome } from "@/lib/repair/workflow";
import { formatBaht, formatDateTime } from "@/components/admin/repair/format";
import { inputClass, primaryButtonClass } from "@/components/admin/repair/job-actions";

interface CustomerDetail {
    _id: string;
    customerId?: string;
    firstName: string;
    lastName: string;
    phone: string;
    lineId?: string;
    address?: string;
    notes?: string;
    createdAt?: string;
}

interface CustomerJob {
    _id: string;
    jobId: string;
    jobType: "repair" | "claim";
    status: string;
    outcome?: string;
    brand: string;
    deviceModel: string;
    imei?: string;
    serialNumber?: string;
    reportedSymptom?: string;
    totalPrice?: number;
    receivedAt: string;
    branchId?: { name: string } | null;
}

const FIELDS = [
    { key: "firstName", label: "ชื่อ", max: 100 },
    { key: "lastName", label: "นามสกุล", max: 100 },
    { key: "phone", label: "เบอร์โทร", max: 20 },
    { key: "lineId", label: "LINE ID", max: 100 },
] as const;

type FormState = Record<"firstName" | "lastName" | "phone" | "lineId" | "address" | "notes", string>;

const toForm = (c: CustomerDetail): FormState => ({
    firstName: c.firstName ?? "",
    lastName: c.lastName ?? "",
    phone: c.phone ?? "",
    lineId: c.lineId ?? "",
    address: c.address ?? "",
    notes: c.notes ?? "",
});

/** A repair customer's contact details (editable) and every job of theirs the user may see. */
export default function RepairCustomerDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [customer, setCustomer] = useState<CustomerDetail | null>(null);
    const [jobs, setJobs] = useState<CustomerJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState<FormState | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [saved, setSaved] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError("");
        try {
            const res = await fetch(`/api/admin/repair/customers/${id}`, { cache: "no-store" });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "โหลดข้อมูลลูกค้าไม่สำเร็จ");
            setCustomer(data.customer);
            setJobs(data.jobs ?? []);
            setForm(toForm(data.customer));
        } catch (err) {
            setLoadError(err instanceof Error ? err.message : "โหลดข้อมูลลูกค้าไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        load();
    }, [load]);

    const save = async () => {
        if (!form) return;
        setSaving(true);
        setError("");
        try {
            const res = await fetch(`/api/admin/repair/customers/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
            setCustomer(data);
            setForm(toForm(data));
            setEditing(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 text-gray-400">
                <Loader2 className="animate-spin mb-4" size={36} />
                <p className="text-sm font-bold">กำลังโหลดข้อมูลลูกค้า...</p>
            </div>
        );
    }

    if (!customer || !form) {
        return (
            <div className="flex flex-col items-center justify-center py-32 text-gray-400">
                <p className="text-sm font-bold">{loadError || "ไม่พบข้อมูลลูกค้า"}</p>
                <Link href="/admin/repair/customers" className="mt-4 rounded-lg bg-slate-100 px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200">กลับไปทะเบียนลูกค้า</Link>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            <div className="flex items-center gap-4 border-b border-gray-100 pb-5">
                <Link href="/admin/repair/customers" className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-100 bg-white text-gray-400 shadow-sm hover:text-blue-600">
                    <ArrowLeft size={16} />
                </Link>
                <div>
                    <p className="text-[11px] font-bold text-blue-600">{customer.customerId}</p>
                    <h1 className="text-xl font-black text-slate-800">{customer.firstName} {customer.lastName}</h1>
                </div>
            </div>

            {saved && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">บันทึกข้อมูลลูกค้าแล้ว</p>}

            <div className="grid gap-6 lg:grid-cols-12">
                {/* Contact details */}
                <section className="lg:col-span-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-900"><User size={14} /> ข้อมูลลูกค้า</h2>
                        {!editing ? (
                            <button onClick={() => setEditing(true)} className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200">
                                <Pencil size={12} /> แก้ไข
                            </button>
                        ) : (
                            <button onClick={() => { setEditing(false); setForm(toForm(customer)); setError(""); }} className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200">
                                <X size={12} /> ยกเลิก
                            </button>
                        )}
                    </div>

                    {editing ? (
                        <div className="space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                                {FIELDS.map((field) => (
                                    <label key={field.key} className="space-y-1">
                                        <span className="text-[11px] font-semibold text-slate-500">{field.label}</span>
                                        <input
                                            value={form[field.key]}
                                            maxLength={field.max}
                                            onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                                            className={inputClass}
                                        />
                                    </label>
                                ))}
                            </div>
                            <label className="block space-y-1">
                                <span className="text-[11px] font-semibold text-slate-500">ที่อยู่</span>
                                <textarea rows={2} maxLength={500} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputClass} />
                            </label>
                            <label className="block space-y-1">
                                <span className="text-[11px] font-semibold text-slate-500">หมายเหตุ</span>
                                <textarea rows={2} maxLength={1000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} />
                            </label>
                            {error && <p className="text-xs font-bold text-red-600">{error}</p>}
                            <button onClick={save} disabled={saving} className={primaryButtonClass}>
                                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} บันทึกข้อมูลลูกค้า
                            </button>
                        </div>
                    ) : (
                        <dl className="space-y-3 text-sm">
                            {[
                                ["เบอร์โทร", customer.phone],
                                ["LINE ID", customer.lineId],
                                ["ที่อยู่", customer.address],
                                ["หมายเหตุ", customer.notes],
                            ].map(([label, value]) => (
                                <div key={label}>
                                    <dt className="text-[11px] font-semibold text-slate-400">{label}</dt>
                                    <dd className="whitespace-pre-wrap font-bold text-slate-800">{value || "-"}</dd>
                                </div>
                            ))}
                            <div>
                                <dt className="text-[11px] font-semibold text-slate-400">ลงทะเบียนเมื่อ</dt>
                                <dd className="font-bold text-slate-800">{formatDateTime(customer.createdAt)}</dd>
                            </div>
                        </dl>
                    )}
                </section>

                {/* Repair history */}
                <section className="lg:col-span-7 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
                    <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-900"><ClipboardList size={14} /> ประวัติการซ่อม ({jobs.length} งาน)</h2>
                    {jobs.length === 0 ? (
                        <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-xs font-semibold text-slate-400">ยังไม่มีงานซ่อมในสาขาที่คุณดูได้</p>
                    ) : (
                        <ul className="space-y-2">
                            {jobs.map((job) => (
                                <li key={job._id}>
                                    <Link href={`/admin/repair/jobs/${job._id}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 text-xs transition-all hover:border-blue-300 hover:bg-blue-50/30">
                                        <div className="min-w-0 space-y-1">
                                            <p className="font-black text-slate-900">
                                                {job.jobId}
                                                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{statusLabelForOutcome(job.status, job.outcome)}</span>
                                                {job.jobType === "claim" && <span className="ml-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-600">เคลม</span>}
                                            </p>
                                            <p className="font-semibold text-slate-600">{job.brand} {job.deviceModel}{job.imei ? ` · IMEI ${job.imei}` : ""}{job.serialNumber ? ` · S/N ${job.serialNumber}` : ""}</p>
                                            {job.reportedSymptom && <p className="truncate text-slate-400">{job.reportedSymptom}</p>}
                                            <p className="text-[11px] text-slate-400">รับเครื่อง {formatDateTime(job.receivedAt)}{job.branchId ? ` · ${job.branchId.name}` : ""}</p>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                            {(job.totalPrice ?? 0) > 0 && <span className="font-black text-slate-900">{formatBaht(job.totalPrice)}</span>}
                                            <ChevronRight size={14} className="text-slate-300" />
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    );
}
