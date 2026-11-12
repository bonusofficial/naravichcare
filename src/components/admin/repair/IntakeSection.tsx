"use client";

import { useState } from "react";
import { CalendarClock, HardDrive, Loader2, MapPin, Save } from "lucide-react";
import { DATA_BACKUP, type DataBackupStatus } from "@/lib/repair/options";
import { isOverdue } from "@/lib/repair/summary";
import type { RepairJobSectionProps, RepairJobView } from "@/lib/repair/types";
import { formatDateTime, fromDateTimeLocal, patchJob, toDateTimeLocal } from "./format";

/**
 * Receiving branch, the promised completion date (งานเพิ่ม 3) and what the
 * customer chose for the data on the device (งานเพิ่ม 4). The server stamps
 * who recorded the data choice and when.
 */
export default function IntakeSection({ job, onChanged }: RepairJobSectionProps) {
    const [appointment, setAppointment] = useState(toDateTimeLocal(job.appointmentDate));
    const [backup, setBackup] = useState<DataBackupStatus | "">(job.dataBackup?.status ?? "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const closed = job.status === "completed" || job.status === "cancelled";
    const dirty = appointment !== toDateTimeLocal(job.appointmentDate) || backup !== (job.dataBackup?.status ?? "");
    const overdue = isOverdue({ appointmentDate: job.appointmentDate, status: job.status });

    const save = async () => {
        setSaving(true);
        setError("");
        try {
            const body: Record<string, unknown> = { appointmentDate: fromDateTimeLocal(appointment) };
            if (backup) body.dataBackupStatus = backup;
            const updated = await patchJob<RepairJobView>(job._id, body);
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
                <h4 className="text-sm font-bold text-slate-900">ข้อมูลรับงาน</h4>
                <span className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                    <MapPin size={12} />
                    {job.branchId ? job.branchId.name : <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">ยังไม่ผูกสาขา</span>}
                </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5">
                    <span className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                        <CalendarClock size={12} /> วันนัดซ่อมเสร็จ
                        {overdue && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">เกินนัด</span>}
                    </span>
                    <input
                        type="datetime-local"
                        value={appointment}
                        disabled={closed}
                        onChange={(event) => setAppointment(event.target.value)}
                        className="w-full rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-xs font-bold outline-none focus:border-blue-500 disabled:opacity-60"
                    />
                </label>
                <label className="space-y-1.5">
                    <span className="flex items-center gap-1 text-xs font-semibold text-slate-500"><HardDrive size={12} /> ข้อมูลในเครื่องลูกค้า</span>
                    <select
                        value={backup}
                        disabled={closed}
                        onChange={(event) => setBackup(event.target.value as DataBackupStatus | "")}
                        className="w-full rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-xs font-bold outline-none focus:border-blue-500 disabled:opacity-60"
                    >
                        {!job.dataBackup && <option value="">ยังไม่ได้บันทึก</option>}
                        {DATA_BACKUP.values.map((value) => <option key={value} value={value}>{DATA_BACKUP.labels[value]}</option>)}
                    </select>
                    {job.dataBackup && (
                        <span className="block text-[11px] text-slate-400">บันทึกโดย {job.dataBackup.recordedBy} · {formatDateTime(job.dataBackup.recordedAt)}</span>
                    )}
                </label>
            </div>

            {error && <p className="text-xs font-bold text-red-600">{error}</p>}
            {!closed && (
                <button
                    onClick={save}
                    disabled={!dirty || saving}
                    className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-blue-600 disabled:opacity-40"
                >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} บันทึกข้อมูลรับงาน
                </button>
            )}
        </div>
    );
}
