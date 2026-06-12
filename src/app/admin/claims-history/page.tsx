"use client";
import { useEffect, useState } from "react";
import { ClipboardList, Search, Eye, CheckCircle, Wrench, Calendar, CreditCard, Package, AlertCircle, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";

interface Claim {
    _id: string;
    customerName: string;
    imei: string;
    brand: string;
    model: string;
    policyNumber: string;
    deductibleItem: string;
    deductibleAmount: number;
    parts: { name: string; qty: number; unitCost: number }[];
    status: string;
    createdAt: string;
    preRepairImages: string[];
    postRepairImages: string[];
    preRepairNote: string;
    postRepairNote: string;
}

const statusColor: Record<string, string> = {
    completed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    pending: "bg-amber-50 text-amber-700 border border-amber-200",
    rejected: "bg-red-50 text-red-700 border border-red-200",
    draft: "bg-slate-100 text-slate-700 border border-slate-300",
};
const statusLabel: Record<string, string> = {
    completed: "✓ เสร็จสิ้น",
    pending: "⏳ รอดำเนินการ",
    rejected: "✗ ปฏิเสธ",
    draft: "📝 กำลังบันทึก",
};

export default function ClaimsHistoryPage() {
    const [claims, setClaims] = useState<Claim[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Claim | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const loadClaims = () => {
        setLoading(true);
        fetch("/api/admin/claims")
            .then(r => r.json())
            .then(d => {
                if (d.success) setClaims(d.data);
                else setError("โหลดข้อมูลไม่สำเร็จ");
            })
            .catch(() => setError("เกิดข้อผิดพลาดในการเชื่อมต่อ"))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadClaims();
    }, []);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`ยืนยันการลบรายการเคลมของ "${name}" ใช่หรือไม่?\nการลบจะไม่คืนโควต้าสิทธิ์ (หากรายการเสร็จสิ้นไปแล้ว)`)) return;

        setDeletingId(id);
        try {
            const r = await fetch(`/api/admin/claims?id=${id}`, { method: "DELETE" });
            const d = await r.json();
            if (d.success) {
                setClaims(prev => prev.filter(c => c._id !== id));
            } else {
                alert("ลบไม่สำเร็จ: " + d.error);
            }
        } catch (e) {
            alert("เกิดข้อผิดพลาดในการลบ");
        } finally {
            setDeletingId(null);
        }
    };

    const filtered = claims.filter(c =>
        c.customerName?.includes(search) ||
        c.imei?.includes(search) ||
        c.model?.includes(search) ||
        c.policyNumber?.includes(search)
    );

    const totalDeductible = claims.filter(c => c.status === "completed").reduce((s, c) => s + (c.deductibleAmount || 0), 0);
    const totalParts = claims.filter(c => c.status === "completed").reduce((s, c) => s + (c.parts || []).reduce((ps, p) => ps + p.qty * p.unitCost, 0), 0);


    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-900">ประวัติการเคลม</h2>
                    <p className="text-slate-500 text-sm mt-1">รายการเคลมทั้งหมดที่ดำเนินการแล้ว</p>
                </div>
                <Link href="/admin/claims" className="bg-slate-900 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-blue-600 transition-all shadow-md flex items-center gap-2">
                    + เปิดเคสเคลมใหม่
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "เคลมทั้งหมด", value: claims.length, icon: <ClipboardList size={20} />, color: "text-blue-600", bg: "bg-blue-50" },
                    { label: "เสร็จสิ้น", value: claims.filter(c => c.status === "completed").length, icon: <CheckCircle size={20} />, color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: "Deductible รวม", value: `฿${totalDeductible.toLocaleString()}`, icon: <CreditCard size={20} />, color: "text-purple-600", bg: "bg-purple-50" },
                    { label: "ต้นทุนอะไหล่รวม", value: `฿${totalParts.toLocaleString()}`, icon: <Package size={20} />, color: "text-orange-600", bg: "bg-orange-50" },
                ].map(stat => (
                    <div key={stat.label} className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                        <div className={`w-12 h-12 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center shrink-0`}>
                            {stat.icon}
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                            <p className="text-xl font-black text-slate-900">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                    type="text"
                    placeholder="ค้นหาจากชื่อ, IMEI, รุ่น, เลขกรมธรรม์..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-500 shadow-sm"
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-slate-400 gap-3">
                        <Loader2 size={24} className="animate-spin" />
                        <span className="font-bold">กำลังโหลดข้อมูล...</span>
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center py-20 text-red-500 gap-3">
                        <AlertCircle size={24} />
                        <span className="font-bold">{error}</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                        <ClipboardList size={48} strokeWidth={1.5} className="mb-4" />
                        <p className="font-black text-slate-500 text-lg">ยังไม่มีรายการเคลม</p>
                        <p className="text-sm text-slate-400 mt-1">ไปที่ "งานเคลม" เพื่อเริ่มเปิดเคสใหม่ครับ</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50">
                                    <th className="text-left p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">ลูกค้า / อุปกรณ์</th>
                                    <th className="text-left p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell">IMEI</th>
                                    <th className="text-left p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden lg:table-cell">รายการซ่อม</th>
                                    <th className="text-right p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">ค่าใช้จ่าย</th>
                                    <th className="text-center p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">สถานะ</th>
                                    <th className="text-left p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:table-cell">วันที่</th>
                                    <th className="p-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.map(claim => {
                                    const partsCost = (claim.parts || []).reduce((s, p) => s + p.qty * p.unitCost, 0);
                                    return (
                                        <tr key={claim._id} className="hover:bg-blue-50/30 transition-colors group">
                                            <td className="p-4">
                                                <div className="font-black text-slate-900 text-sm">{claim.customerName || "—"}</div>
                                                <div className="text-xs text-slate-400 font-medium">{claim.brand} {claim.model}</div>
                                                {claim.policyNumber && <div className="text-[10px] text-blue-500 font-bold mt-0.5">{claim.policyNumber}</div>}
                                            </td>
                                            <td className="p-4 hidden md:table-cell">
                                                <span className="text-xs font-mono text-slate-500">{claim.imei || "—"}</span>
                                            </td>
                                            <td className="p-4 hidden lg:table-cell">
                                                <div className="text-sm font-bold text-slate-700">{claim.deductibleItem || "—"}</div>
                                                {(claim.parts || []).length > 0 && (
                                                    <div className="flex gap-1 mt-1 flex-wrap">
                                                        {claim.parts.slice(0, 2).map((p, i) => (
                                                            <span key={i} className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-md">{p.name}</span>
                                                        ))}
                                                        {claim.parts.length > 2 && <span className="text-[10px] text-slate-400 font-bold">+{claim.parts.length - 2}</span>}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="font-black text-slate-900 text-sm">฿{(partsCost + (claim.deductibleAmount || 0)).toLocaleString()}</div>
                                                {claim.deductibleAmount > 0 && <div className="text-[10px] text-blue-500 font-bold">Deduct: ฿{claim.deductibleAmount.toLocaleString()}</div>}
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className={`text-[10px] font-black px-3 py-1.5 rounded-full ${statusColor[claim.status] || ""}`}>
                                                        {statusLabel[claim.status] || claim.status}
                                                    </span>
                                                    {claim.status === "draft" && (
                                                        <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-md">
                                                            ค้างที่ขั้นตอน {(claim as any).currentStep || 1}/6
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 hidden sm:table-cell">
                                                <div className="text-xs font-bold text-slate-500">{new Date(claim.createdAt).toLocaleDateString("th-TH")}</div>
                                                <div className="text-[10px] text-slate-300">{new Date(claim.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</div>
                                            </td>
                                            <td className="p-4 flex justify-end gap-2">
                                                {claim.status === "draft" && (
                                                    <Link
                                                        href={`/admin/claims?imei=${claim.imei}`}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg"
                                                        title="ทำรายการต่อ"
                                                    >
                                                        <Wrench size={15} />
                                                    </Link>
                                                )}
                                                <button
                                                    onClick={() => setSelected(claim)}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-800 hover:text-white text-slate-500 rounded-lg"
                                                    title="ดูรายละเอียด"
                                                >
                                                    <Eye size={15} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(claim._id, claim.customerName)}
                                                    disabled={deletingId === claim._id}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 flex items-center justify-center bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-lg disabled:opacity-50"
                                                    title="ลบรายการ"
                                                >
                                                    {deletingId === claim._id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={15} />}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selected && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelected(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900">รายละเอียดการเคลม</h3>
                                    <p className="text-sm text-slate-500 mt-1">{new Date(selected.createdAt).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}</p>
                                </div>
                                <span className={`text-xs font-black px-3 py-1.5 rounded-full ${statusColor[selected.status] || ""}`}>{statusLabel[selected.status]}</span>
                            </div>
                        </div>
                        <div className="p-6 space-y-5">
                            {/* Customer */}
                            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">ข้อมูลลูกค้า</p>
                                <p className="font-black text-slate-900">{selected.customerName}</p>
                                <p className="text-sm text-slate-500">{selected.brand} {selected.model}</p>
                                <p className="text-xs font-mono text-slate-400">IMEI: {selected.imei}</p>
                                {selected.policyNumber && <p className="text-xs font-bold text-blue-500">กรมธรรม์: {selected.policyNumber}</p>}
                            </div>
                            {/* Deductible */}
                            {selected.deductibleItem && (
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">ค่าธรรมเนียม (Deductible)</p>
                                    <p className="font-bold text-slate-800">{selected.deductibleItem}</p>
                                    <p className="text-xl font-black text-blue-600">฿{(selected.deductibleAmount || 0).toLocaleString()}</p>
                                </div>
                            )}
                            {/* Parts */}
                            {selected.parts && selected.parts.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">อะไหล่ที่ใช้</p>
                                    <div className="space-y-2">
                                        {selected.parts.map((p, i) => (
                                            <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg text-sm">
                                                <span className="font-bold text-slate-700">{p.name} <span className="text-slate-400 font-normal">× {p.qty}</span></span>
                                                <span className="font-black text-slate-900">฿{(p.qty * p.unitCost).toLocaleString()}</span>
                                            </div>
                                        ))}
                                        <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                                            <span className="font-black text-slate-700 text-sm">รวมต้นทุนอะไหล่</span>
                                            <span className="font-black text-blue-700">฿{selected.parts.reduce((s, p) => s + p.qty * p.unitCost, 0).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {/* Notes */}
                            {selected.postRepairNote && (
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">บันทึกผลการซ่อม</p>
                                    <p className="text-sm text-slate-700 bg-emerald-50 p-3 rounded-xl border border-emerald-100">{selected.postRepairNote}</p>
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-slate-100 flex gap-3">
                            <button onClick={() => setSelected(null)} className="flex-1 bg-slate-100 text-slate-700 font-black py-3 rounded-xl hover:bg-slate-200 transition-all">
                                ปิด
                            </button>
                            {selected.status === "draft" && (
                                <Link
                                    href={`/admin/claims?imei=${selected.imei}`}
                                    className="flex-1 text-center bg-blue-600 text-white font-black py-3 rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-200"
                                >
                                    ทำรายการต่อ →
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
