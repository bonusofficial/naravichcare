"use client";
import React, { useEffect, useState } from "react";
import { Wallet, Loader2, CheckCircle2, X, XCircle, Upload } from "lucide-react";
import { useCurrentAdmin } from "@/hooks/useCurrentAdmin";

type Status = "pending" | "paid" | "rejected";

const TABS: { key: Status; label: string }[] = [
    { key: "pending", label: "รอโอน" },
    { key: "paid", label: "โอนแล้ว" },
    { key: "rejected", label: "ไม่อนุมัติ" },
];

const formatBaht = (n: number) => `฿${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "-";

export default function AgentWithdrawalsPage() {
    const { permissions } = useCurrentAdmin();
    const canSettle = permissions.includes("edit_agents");

    const [status, setStatus] = useState<Status>("pending");
    const [withdrawals, setWithdrawals] = useState<any[]>([]);
    const [summary, setSummary] = useState<Record<string, { count: number; total: number }>>({});
    const [loading, setLoading] = useState(true);

    // Settle modal
    const [settling, setSettling] = useState<{ withdrawal: any; action: "paid" | "rejected" } | null>(null);
    const [slip, setSlip] = useState<File | null>(null);
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");

    useEffect(() => {
        fetchWithdrawals(status);
    }, [status]);

    const fetchWithdrawals = async (s: Status) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/agent-withdrawals?status=${s}`);
            const data = await res.json();
            if (data.success) {
                setWithdrawals(data.withdrawals);
                setSummary(data.summary);
            }
        } catch (err) {
            console.error("Fetch withdrawals failed", err);
        } finally {
            setLoading(false);
        }
    };

    const openSettle = (withdrawal: any, action: "paid" | "rejected") => {
        setSettling({ withdrawal, action });
        setSlip(null);
        setNote("");
        setFormError("");
    };

    const handleSettle = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!settling) return;
        setFormError("");
        setSaving(true);
        try {
            const form = new FormData();
            form.append("action", settling.action);
            form.append("note", note);
            if (slip) form.append("slip", slip);
            const res = await fetch(`/api/admin/agent-withdrawals/${settling.withdrawal._id}`, { method: "PATCH", body: form });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setSettling(null);
                fetchWithdrawals(status);
            } else {
                setFormError(data.error || "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
            }
        } catch {
            setFormError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-2xl font-black text-gray-800">ถอนค่าคอมตัวแทน (Withdrawals)</h2>
                <p className="text-gray-500 text-sm mt-1">ตรวจสอบคำขอถอน โอนเข้าบัญชีตัวแทน แล้วแนบสลิปยืนยัน</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-full sm:w-fit">
                {TABS.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setStatus(t.key)}
                        className={`flex-1 sm:flex-none px-5 py-2 rounded-lg text-xs font-black transition-all ${status === t.key ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"}`}
                    >
                        {t.label}
                        <span className="ml-1.5 text-[10px] opacity-60">{summary[t.key]?.count ?? 0}</span>
                    </button>
                ))}
            </div>
            {status === "pending" && (summary.pending?.count || 0) > 0 && (
                <p className="text-sm font-bold text-amber-600">ยอดรอโอนรวม {formatBaht(summary.pending.total)}</p>
            )}

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                {["วันที่ขอ", "ตัวแทน", "จำนวนเงิน", "บัญชีปลายทาง", status === "pending" ? "จัดการ" : "ดำเนินการโดย"].map(h => (
                                    <th key={h} className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-24 text-center">
                                        <Loader2 className="animate-spin text-blue-500 mx-auto" size={32} />
                                    </td>
                                </tr>
                            ) : withdrawals.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-24 text-center opacity-40">
                                        <Wallet size={28} className="mx-auto text-gray-400 mb-3" />
                                        <p className="text-sm font-black uppercase tracking-widest">ไม่มีรายการ</p>
                                    </td>
                                </tr>
                            ) : withdrawals.map(w => (
                                <tr key={w._id} className="hover:bg-blue-50/30 transition-colors align-top">
                                    <td className="px-6 py-4 text-xs font-bold text-gray-600 whitespace-nowrap">{formatDate(w.createdAt)}</td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-black text-gray-900">{w.agentId?.name || "-"}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-1.5 py-0.5 rounded">{w.agentCode}</span>
                                            {w.agentId?.phone && <span className="text-[10px] text-gray-400">{w.agentId.phone}</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-lg font-black text-emerald-600 whitespace-nowrap">{formatBaht(w.amount)}</td>
                                    <td className="px-6 py-4 text-xs text-gray-600">
                                        <p className="font-bold">{w.bankName}</p>
                                        <p className="font-mono text-gray-900 select-all">{w.bankAccount}</p>
                                        <p className="text-[10px] text-gray-400">{w.bankAccountName}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        {w.status === "pending" ? (
                                            canSettle ? (
                                                <div className="flex gap-2">
                                                    <button onClick={() => openSettle(w, "paid")} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors whitespace-nowrap">
                                                        <CheckCircle2 size={14} /> โอนแล้ว
                                                    </button>
                                                    <button onClick={() => openSettle(w, "rejected")} className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 text-red-500 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors whitespace-nowrap">
                                                        <XCircle size={14} /> ปฏิเสธ
                                                    </button>
                                                </div>
                                            ) : <span className="text-xs text-gray-400">ไม่มีสิทธิ์ดำเนินการ</span>
                                        ) : (
                                            <div className="text-xs text-gray-600 space-y-0.5">
                                                <p className="font-bold">{w.processedBy?.name || w.processedBy?.username || "-"}</p>
                                                <p className="text-[10px] text-gray-400">{formatDate(w.processedAt)}</p>
                                                {w.note && <p className={`text-[11px] ${w.status === "rejected" ? "text-red-500" : "text-gray-500"}`}>{w.note}</p>}
                                                {w.hasSlip && (
                                                    <a href={`/api/admin/agent-withdrawals/${w._id}/slip`} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-blue-600 hover:underline">
                                                        ดูสลิป
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Settle Modal */}
            {settling && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-[2px]">
                    <form onSubmit={handleSettle} className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 animate-in zoom-in-95">
                        <button type="button" onClick={() => setSettling(null)} className="absolute top-5 right-5 text-gray-300 hover:text-gray-900 transition-colors">
                            <X size={20} />
                        </button>
                        <div>
                            <h3 className="text-lg font-black text-gray-900">
                                {settling.action === "paid" ? "ยืนยันการโอนค่าคอม" : "ปฏิเสธคำขอถอน"}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                                {settling.withdrawal.agentId?.name} ({settling.withdrawal.agentCode}) · <span className="font-black text-emerald-600">{formatBaht(settling.withdrawal.amount)}</span>
                            </p>
                        </div>

                        {settling.action === "paid" && (
                            <>
                                <div className="rounded-xl bg-gray-50 p-4 text-xs text-gray-600 space-y-0.5">
                                    <p className="font-bold">{settling.withdrawal.bankName}</p>
                                    <p className="font-mono text-base text-gray-900 select-all">{settling.withdrawal.bankAccount}</p>
                                    <p>{settling.withdrawal.bankAccountName}</p>
                                </div>
                                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-5 cursor-pointer hover:border-blue-400 transition-colors">
                                    <Upload size={20} className="text-gray-400" />
                                    <span className="text-xs font-bold text-gray-600">{slip ? slip.name : "แนบสลิปการโอน (รูปภาพ)"}</span>
                                    <input type="file" accept="image/*" required className="hidden" onChange={(e) => setSlip(e.target.files?.[0] || null)} />
                                </label>
                            </>
                        )}

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                {settling.action === "paid" ? "หมายเหตุ (ไม่บังคับ)" : "เหตุผลที่ปฏิเสธ (ตัวแทนจะเห็นข้อความนี้)"}
                            </label>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                required={settling.action === "rejected"}
                                rows={3}
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm outline-none focus:border-blue-500"
                            />
                        </div>

                        {formError && (
                            <p role="alert" className="rounded-xl bg-red-50 border border-red-100 p-3 text-xs font-bold text-red-600">{formError}</p>
                        )}

                        <button
                            type="submit"
                            disabled={saving}
                            className={`w-full py-3 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-60 ${settling.action === "paid" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-500 hover:bg-red-600"}`}
                        >
                            {saving && <Loader2 size={16} className="animate-spin" />}
                            {settling.action === "paid" ? "ยืนยันโอนแล้ว" : "ยืนยันปฏิเสธ"}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
