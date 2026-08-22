"use client";
/* eslint-disable @next/next/no-img-element -- authenticated private files are not compatible with the image optimizer */

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Download, FileImage, RefreshCcw, XCircle } from "lucide-react";
import { useAdminSession } from "@/components/admin/AdminSession";

interface BuybackDetail {
    _id: string;
    status: "pending_approval" | "processing" | "approved" | "rejected";
    customerSnapshot: { fullName: string; idCard: string; imei: string; policyNumber: string; packageName: string; packagePrice: string; coverageStartAt: string; coverageEndAt: string; totalCoverageDays: number };
    transactionAt: string;
    remainingCoverageDays: number;
    recommendedAmount: string;
    actualAmount: string;
    note: string;
    payment: { method: string; otherLabel?: string; reference?: string };
    confirmation: { text: string };
    createdBy: { id: string; name: string; username: string };
    approvedBy?: { name: string };
    rejectedBy?: { name: string };
    branchSnapshot: { name: string; location?: string };
    documentNumber?: string;
    completedAt?: string;
    rejectedAt?: string;
    rejectionReason?: string;
    lastProcessingError?: string;
    receiptUrl?: string;
    files: Record<string, { available: boolean; url?: string; deletedAt?: string } | null>;
    statusHistory: Array<{ status: string; changedAt: string; changedBy: { name: string }; note?: string }>;
}

const labels: Record<string, string> = { pending_approval: "รออนุมัติ", processing: "กำลังดำเนินการ", approved: "อนุมัติแล้ว", rejected: "ปฏิเสธ" };
const paymentLabels: Record<string, string> = { cash: "เงินสด", transfer: "โอนเงิน", cheque: "เช็ค", other: "อื่น ๆ" };

export default function BuybackDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAdminSession();
    const [data, setData] = useState<BuybackDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState("");
    const [rejectReason, setRejectReason] = useState("");
    const [showReject, setShowReject] = useState(false);

    const load = useCallback(async () => {
        const response = await fetch(`/api/admin/buybacks/${id}`, { cache: "no-store" });
        const payload = await response.json();
        if (response.ok) setData(payload.data); else setError(payload.error || "โหลดข้อมูลไม่สำเร็จ");
        setLoading(false);
    }, [id]);
    useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

    const approve = async () => {
        if (!confirm("ยืนยันอนุมัติรายการซื้อคืนและปิดสิทธิ์เคลม?")) return;
        setActionLoading(true); setError("");
        const response = await fetch(`/api/admin/buybacks/${id}/approve`, { method: "POST" });
        const payload = await response.json();
        if (response.ok) setData(payload.data); else setError(payload.error || "อนุมัติไม่สำเร็จ");
        setActionLoading(false);
    };

    const reject = async () => {
        setActionLoading(true); setError("");
        const response = await fetch(`/api/admin/buybacks/${id}/reject`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: rejectReason }) });
        const payload = await response.json();
        if (response.ok) { setData(payload.data); setShowReject(false); } else setError(payload.error || "ปฏิเสธไม่สำเร็จ");
        setActionLoading(false);
    };

    if (loading) return <div className="p-12 text-center font-bold text-slate-400">กำลังโหลด...</div>;
    if (!data) return <div className="rounded-xl bg-red-50 p-6 font-bold text-red-600">{error || "ไม่พบรายการ"}</div>;
    // super_admin may act on their own request; everyone else needs a second person.
    const isSuperAdmin = user?.role === "super_admin";
    const ownRequest = user?.id === data.createdBy.id && !isSuperAdmin;
    const canApprove = !ownRequest && (data.status === "pending_approval" || (data.status === "processing" && Boolean(data.lastProcessingError)));
    const canReject = !ownRequest && data.status === "pending_approval";

    return (
        <div className="mx-auto max-w-5xl space-y-6 pb-16">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-black text-slate-900">รายละเอียดซื้อคืน</h1><span className={`rounded-full px-3 py-1 text-xs font-black ${data.status === "approved" ? "bg-emerald-50 text-emerald-600" : data.status === "rejected" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>{labels[data.status]}</span></div><p className="break-all text-sm text-slate-500">{data.documentNumber || `รายการ ${data._id.slice(-8).toUpperCase()}`}</p></div>{data.receiptUrl && <a href={data.receiptUrl} target="_blank" className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white"><Download size={17} /> เปิดใบรับคืน PDF</a>}</div>
            {error && <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-4 font-bold text-red-600"><AlertCircle size={18} />{error}</div>}
            {ownRequest && data.status === "pending_approval" && <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold text-amber-700">คุณเป็นผู้สร้างรายการนี้ ต้องให้ admin คนอื่นอนุมัติหรือปฏิเสธ</div>}
            {data.lastProcessingError && <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"><b>การประมวลผลครั้งก่อนล้มเหลว:</b> {data.lastProcessingError}</div>}
            <div className="grid gap-6 lg:grid-cols-3"><section className="space-y-5 rounded-2xl bg-white p-6 shadow-sm lg:col-span-2"><h2 className="font-black text-slate-800">ข้อมูลลูกค้าและแพ็ก</h2><div className="grid gap-4 text-sm md:grid-cols-2">{[["ชื่อ-นามสกุล", data.customerSnapshot.fullName], ["เลขบัตรประชาชน", data.customerSnapshot.idCard], ["เลขที่แพ็ก", data.customerSnapshot.policyNumber], ["IMEI", data.customerSnapshot.imei], ["แพ็กคุ้มครอง", data.customerSnapshot.packageName], ["สาขา", data.branchSnapshot.name]].map(([label, value]) => <div key={label}><p className="text-xs font-bold text-slate-400">{label}</p><p className="font-black text-slate-700">{value || "-"}</p></div>)}</div><div className="grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-3"><div><p className="text-xs text-slate-400">ราคาแพ็ก</p><b>฿{Number(data.customerSnapshot.packagePrice).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</b></div><div><p className="text-xs text-slate-400">วันคงเหลือ</p><b>{data.remainingCoverageDays} วัน</b></div><div><p className="text-xs text-slate-400">วันหมดอายุ</p><b>{new Date(data.customerSnapshot.coverageEndAt).toLocaleDateString("th-TH")}</b></div></div></section><section className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm"><p className="text-xs font-bold text-slate-400">ยอดแนะนำ</p><p className="mb-5 text-2xl font-black">฿{Number(data.recommendedAmount).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</p><p className="text-xs font-bold text-cyan-300">ยอดที่ตกลงจริง</p><p className="text-3xl font-black text-cyan-300">฿{Number(data.actualAmount).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</p><div className="mt-6 border-t border-slate-700 pt-4 text-xs text-slate-300"><p>ช่องทาง: {paymentLabels[data.payment.method]} {data.payment.otherLabel}</p><p>อ้างอิง: {data.payment.reference || "-"}</p></div></section></div>
            <section className="rounded-2xl bg-white p-6 shadow-sm"><h2 className="mb-4 font-black text-slate-800">หมายเหตุและคำยืนยัน</h2><p className="mb-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{data.note || "ไม่มีหมายเหตุ"}</p><p className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">{data.confirmation.text}</p></section>
            <section className="rounded-2xl bg-white p-6 shadow-sm"><h2 className="mb-4 flex items-center gap-2 font-black text-slate-800"><FileImage size={18} /> หลักฐานและลายเซ็น</h2><div className="grid gap-4 md:grid-cols-3">{[["customerSignature", "ลายเซ็นลูกค้า"], ["employeeSignature", "ลายเซ็นพนักงาน"], ["paymentProof", "หลักฐานการจ่าย"]].map(([key, label]) => { const file = data.files[key]; return <div key={key} className="rounded-xl border border-slate-100 p-3"><p className="mb-2 text-xs font-bold text-slate-500">{label}</p>{file?.available && file.url ? <img src={file.url} alt={label} className="h-36 w-full rounded-lg object-contain" /> : <div className="flex h-36 items-center justify-center rounded-lg bg-slate-50 text-xs font-bold text-slate-400">{file?.deletedAt ? "ลบตามนโยบายแล้ว" : "ไม่มีไฟล์"}</div>}</div>; })}</div></section>
            <section className="rounded-2xl bg-white p-6 shadow-sm"><h2 className="mb-4 font-black text-slate-800">ประวัติสถานะ</h2><div className="space-y-3">{data.statusHistory.map((history, index) => <div key={`${history.changedAt}-${index}`} className="flex gap-3 border-l-2 border-blue-200 pl-4"><div><p className="text-sm font-black text-slate-700">{labels[history.status] || history.status}</p><p className="text-xs text-slate-400">{new Date(history.changedAt).toLocaleString("th-TH")} · {history.changedBy.name}</p>{history.note && <p className="mt-1 text-xs text-slate-500">{history.note}</p>}</div></div>)}</div></section>
            {(canApprove || canReject) && <div className="sticky bottom-3 flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-2xl sm:bottom-5 sm:flex-row sm:p-4">{canReject && <button onClick={() => setShowReject(true)} disabled={actionLoading} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-50 px-3 py-3 font-black text-red-600"><XCircle size={18} /> ปฏิเสธ</button>}{canApprove && <button onClick={approve} disabled={actionLoading} className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-3 font-black text-white"><CheckCircle2 size={18} /> {data.status === "processing" ? "ลองประมวลผลอีกครั้ง" : "อนุมัติและปิดสิทธิ์เคลม"}</button>}</div>}
            {showReject && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6"><h3 className="text-lg font-black text-slate-800">ปฏิเสธรายการซื้อคืน</h3><p className="mt-1 text-sm text-slate-500">รายการนี้จะถูกปิด แต่สามารถเปิดรายการซื้อคืนใหม่สำหรับแพ็กนี้ได้ภายหลัง</p><textarea value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} rows={4} placeholder="ระบุเหตุผลที่ปฏิเสธ" className="mt-4 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-red-400" /><div className="mt-4 flex gap-3"><button onClick={() => setShowReject(false)} className="flex-1 rounded-xl bg-slate-100 py-3 font-bold text-slate-500">ยกเลิก</button><button onClick={reject} disabled={!rejectReason.trim() || actionLoading} className="flex-1 rounded-xl bg-red-600 py-3 font-black text-white disabled:opacity-40"><RefreshCcw className="mr-1 inline" size={15} />ยืนยันปฏิเสธ</button></div></div></div>}
        </div>
    );
}
