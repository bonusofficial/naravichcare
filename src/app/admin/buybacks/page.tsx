"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock3, Plus, RefreshCcw, Search, XCircle } from "lucide-react";
import { useAdminSession } from "@/components/admin/AdminSession";

interface BuybackListItem {
    _id: string;
    status: "pending_approval" | "processing" | "approved" | "rejected";
    customerSnapshot: { fullName: string; policyNumber: string; imei: string };
    actualAmount: string;
    documentNumber?: string;
    transactionAt: string;
    branchSnapshot: { name: string };
}

interface SummaryItem { status: string; count: number; actualAmount: string }

const statusLabel: Record<BuybackListItem["status"], string> = {
    pending_approval: "รออนุมัติ",
    processing: "กำลังดำเนินการ",
    approved: "อนุมัติแล้ว",
    rejected: "ปฏิเสธ",
};

export default function BuybacksPage() {
    const { user } = useAdminSession();
    const [items, setItems] = useState<BuybackListItem[]>([]);
    const [summary, setSummary] = useState<SummaryItem[]>([]);
    const [status, setStatus] = useState("all");
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (status !== "all") params.set("status", status);
        if (query.trim()) params.set("q", query.trim());
        const response = await fetch(`/api/admin/buybacks?${params}`, { cache: "no-store" });
        const payload = await response.json();
        if (response.ok) {
            setItems(payload.items || []);
            setSummary(payload.summary || []);
        }
        setLoading(false);
    }, [query, status]);

    useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
    const approvedTotal = summary.find((item) => item.status === "approved")?.actualAmount || "0.00";
    const count = (key: string) => summary.find((item) => item.status === key)?.count || 0;

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div><h1 className="text-2xl font-black text-slate-900">ซื้อคืนแพ็กคุ้มครอง</h1><p className="text-sm text-slate-500">ติดตามรายการซื้อคืนและเอกสารรับคืนเงิน</p></div>
                <div className="grid w-full gap-2 sm:flex sm:w-auto">{user?.role === "super_admin" && <Link href="/admin/buybacks/coverage-data" className="rounded-xl bg-white px-4 py-3 text-center text-sm font-black text-slate-600 shadow-sm">แก้ข้อมูลแพ็กเก่า</Link>}<Link href="/admin/buybacks/new" className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-200"><Plus size={17} /> สร้างรายการซื้อคืน</Link></div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-white p-5 shadow-sm"><Clock3 className="mb-3 text-amber-500" /><p className="text-xs font-bold text-slate-400">รออนุมัติ</p><p className="text-2xl font-black">{count("pending_approval") + count("processing")}</p></div>
                <div className="rounded-2xl bg-white p-5 shadow-sm"><CheckCircle2 className="mb-3 text-emerald-500" /><p className="text-xs font-bold text-slate-400">อนุมัติแล้ว</p><p className="text-2xl font-black">{count("approved")}</p></div>
                <div className="rounded-2xl bg-slate-900 p-5 text-white shadow-sm"><RefreshCcw className="mb-3 text-cyan-300" /><p className="text-xs font-bold text-slate-400">ยอดซื้อคืนจริงสะสม</p><p className="text-2xl font-black">฿{Number(approvedTotal).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</p></div>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row">
                    <div className="flex flex-1 items-center gap-2 rounded-xl bg-slate-50 px-4"><Search size={16} className="text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาชื่อ เลขแพ็ก IMEI หรือเลขเอกสาร" className="w-full bg-transparent py-3 text-sm outline-none" /></div>
                    <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none">
                        <option value="all">ทุกสถานะ</option><option value="pending_approval">รออนุมัติ</option><option value="processing">กำลังดำเนินการ</option><option value="approved">อนุมัติ</option><option value="rejected">ปฏิเสธ</option>
                    </select>
                </div>
            </div>
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
                {loading ? <div className="p-12 text-center text-sm font-bold text-slate-400">กำลังโหลด...</div> : items.length === 0 ? <div className="p-12 text-center"><XCircle className="mx-auto mb-3 text-slate-200" /><p className="font-bold text-slate-400">ยังไม่มีรายการ</p></div> : (
                    <div className="divide-y divide-slate-100">{items.map((item) => (
                        <Link key={item._id} href={`/admin/buybacks/${item._id}`} className="grid gap-3 p-5 transition hover:bg-slate-50 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-center">
                            <div className="min-w-0"><p className="font-black text-slate-800">{item.customerSnapshot.fullName || "ไม่ระบุชื่อ"}</p><p className="break-words text-xs text-slate-400">{item.customerSnapshot.policyNumber} · IMEI {item.customerSnapshot.imei}</p></div>
                            <div><p className="text-xs font-bold text-slate-400">ยอดจริง</p><p className="font-black text-blue-600">฿{Number(item.actualAmount).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</p></div>
                            <div><p className="text-xs font-bold text-slate-400">สาขา / วันที่</p><p className="text-sm font-bold text-slate-600">{item.branchSnapshot.name} · {new Date(item.transactionAt).toLocaleDateString("th-TH")}</p></div>
                            <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${item.status === "approved" ? "bg-emerald-50 text-emerald-600" : item.status === "rejected" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>{statusLabel[item.status]}</span>
                        </Link>
                    ))}</div>
                )}
            </div>
        </div>
    );
}
