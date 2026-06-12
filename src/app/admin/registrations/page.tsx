"use client";
import { useEffect, useState, useRef } from "react";
import {
    CheckCircle, XCircle, Clock,
    FileText, CreditCard, Search,
    Smartphone, ArrowUpRight,
    Upload, Printer, Download, Shield,
    Trash2
} from "lucide-react";

type Registration = {
    _id: string;
    firstName: string;
    lastName: string;
    phone: string;
    imei: string;
    brand: string;
    model: string;
    devicePrice: number;
    packageType: string;
    status: "pending" | "paid" | "approved" | "rejected";
    createdAt: string;
    approvedAt?: string;
    idCard?: string;
    email?: string;
    postCode?: string;
    province?: string;
    district?: string;
    subDistrict?: string;
    addressDetails?: string;
    images?: { [key: string]: string };
    policyNumber?: string;
    referenceNumber?: string;
    paymentReceipt?: string;
};

const STATUS_CONFIG = {
    pending: { label: "รอชำระเงิน", dot: "bg-amber-400", badge: "bg-amber-50 text-amber-700 ring-amber-200", icon: Clock },
    paid: { label: "ชำระเงินแล้ว", dot: "bg-blue-500", badge: "bg-blue-50 text-blue-700 ring-blue-200", icon: CreditCard },
    approved: { label: "อนุมัติแล้ว", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", icon: CheckCircle },
    rejected: { label: "ปฏิเสธ", dot: "bg-red-400", badge: "bg-red-50 text-red-600 ring-red-200", icon: XCircle },
};

export default function AdminRegistrations() {
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Registration | null>(null);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [policyNumber, setPolicyNumber] = useState("");
    const [referenceNumber, setReferenceNumber] = useState("");
    const [receiptFile, setReceiptFile] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [showCertificate, setShowCertificate] = useState(false);
    const [showTransaction, setShowTransaction] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<{ type: "bulk"; count: number; error?: string } | { type: "one"; reg: Registration; error?: string } | null>(null);
    const [packageMapping, setPackageMapping] = useState<Record<string, string>>({});
    const certRef = useRef<HTMLDivElement>(null);

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filtered.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(filtered.map(r => r._id)));
    };

    const openDeleteBulkConfirm = () => {
        if (selectedIds.size > 0) setDeleteConfirm({ type: "bulk", count: selectedIds.size });
    };

    const openDeleteOneConfirm = (r: Registration) => {
        setDeleteConfirm({ type: "one", reg: r });
    };

    const executeDeleteBulk = async () => {
        if (selectedIds.size === 0) return;
        setDeleteLoading(true);
        try {
            const res = await fetch("/api/admin/registrations", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: Array.from(selectedIds) }),
            });
            if (res.ok) {
                setSelectedIds(new Set());
                if (selected && selectedIds.has(selected._id)) setSelected(null);
                setDeleteConfirm(null);
                fetchAll();
            } else setDeleteConfirm(prev => (prev ? { ...prev, error: "ลบไม่สำเร็จ" } : null));
        } catch (e) {
            console.error(e);
            setDeleteConfirm(prev => (prev ? { ...prev, error: "เกิดข้อผิดพลาด" } : null));
        } finally {
            setDeleteLoading(false);
        }
    };

    const executeDeleteOne = async () => {
        if (!deleteConfirm || deleteConfirm.type !== "one") return;
        const r = deleteConfirm.reg;
        setDeleteLoading(true);
        try {
            const res = await fetch(`/api/admin/registrations/${r._id}`, { method: "DELETE" });
            if (res.ok) {
                setSelectedIds(prev => { const next = new Set(prev); next.delete(r._id); return next; });
                if (selected?._id === r._id) setSelected(null);
                setDeleteConfirm(null);
                fetchAll();
            } else setDeleteConfirm(prev => (prev ? { ...prev, error: "ลบไม่สำเร็จ" } : null));
        } catch (e) {
            console.error(e);
            setDeleteConfirm(prev => (prev ? { ...prev, error: "เกิดข้อผิดพลาด" } : null));
        } finally {
            setDeleteLoading(false);
        }
    };

    const loadAndSelect = async (r: Registration, onLoaded?: (full: Registration) => void) => {
        setDetailLoading(true);
        try {
            const res = await fetch(`/api/admin/registrations/${r._id}`);
            const json = await res.json();
            if (json.data) {
                setSelected(json.data);
                setPolicyNumber(json.data.policyNumber || "");
                setReferenceNumber(json.data.referenceNumber || "");
                setReceiptFile(null);
                onLoaded?.(json.data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setDetailLoading(false);
        }
    };

    const fetchAll = async () => {
        try {
            const res = await fetch("/api/admin/registrations");
            const data = await res.json();
            setRegistrations(data.data || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        const fetchMappingData = async () => {
            try {
                const [pkgRes, planRes] = await Promise.all([
                    fetch("/api/packages"),
                    fetch("/api/coverage-plans")
                ]);
                const pkgs = await pkgRes.json();
                const plans = await planRes.json();

                const mapping: Record<string, string> = {};
                if (Array.isArray(pkgs)) pkgs.forEach((p: any) => mapping[p._id] = p.name);
                if (Array.isArray(plans)) plans.forEach((p: any) => mapping[p._id] = p.name);
                setPackageMapping(mapping);
            } catch (e) {
                console.error("Failed to fetch package mapping:", e);
            }
        };

        fetchMappingData();
        fetchAll();
    }, []);

    const handleUpdate = async (status: string) => {
        if (!selected) return;
        if (!confirm(`เปลี่ยนสถานะเป็น "${STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.label}" ใช่หรือไม่?`)) return;
        setActionLoading(true);
        try {
            const res = await fetch("/api/admin/registrations", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: selected._id, status, paymentReceipt: receiptFile, policyNumber, referenceNumber })
            });
            if (res.ok) {
                const data = await res.json();
                setSelected(data.data);
                setPolicyNumber(data.data.policyNumber || "");
                setReferenceNumber(data.data.referenceNumber || "");
                setReceiptFile(null);
                fetchAll();
            }
        } catch (e) { alert("เกิดข้อผิดพลาด"); }
        finally { setActionLoading(false); }
    };

    const handleSavePolicyNumber = async () => {
        if (!selected) return;
        setActionLoading(true);
        try {
            const res = await fetch("/api/admin/registrations", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: selected._id, status: selected.status, policyNumber, referenceNumber })
            });
            if (res.ok) {
                const data = await res.json();
                setSelected(data.data);
                setPolicyNumber(data.data.policyNumber || "");
                setReferenceNumber(data.data.referenceNumber || "");
                fetchAll();
            } else {
                alert("เกิดข้อผิดพลาดในการบันทึก");
            }
        } catch (e) { alert("เกิดข้อผิดพลาด"); }
        finally { setActionLoading(false); }
    };

    const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setReceiptFile(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handlePrint = () => window.print();

    const filtered = registrations.filter(r => {
        const term = search.toLowerCase().replace("#", "");
        const refId = r._id.toString().slice(-6).toLowerCase();
        const matchSearch = `${r.firstName}${r.lastName}${r.phone}${r.imei}${refId}${r._id}`.toLowerCase().includes(term);
        const matchStatus = filterStatus === "all" || r.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const counts = {
        all: registrations.length,
        pending: registrations.filter(r => r.status === "pending").length,
        paid: registrations.filter(r => r.status === "paid").length,
        approved: registrations.filter(r => r.status === "approved").length,
        rejected: registrations.filter(r => r.status === "rejected").length,
    };

    // ---- Certificate Overlay ----
    if (showCertificate && selected) {
        return (
            <div className="fixed inset-0 z-[100] bg-slate-100 flex flex-col items-center py-10 overflow-auto print:bg-white print:py-0">
                <div className="mb-6 flex gap-3 print:hidden">
                    <button
                        onClick={() => setShowCertificate(false)}
                        className="px-5 py-2.5 bg-white border border-gray-200 rounded-md font-semibold text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2 transition-all shadow-sm"
                    >
                        ← ย้อนกลับ
                    </button>
                    <button
                        onClick={handlePrint}
                        className="px-5 py-2.5 bg-gray-900 text-white rounded-md font-semibold text-sm hover:bg-gray-800 flex items-center gap-2 transition-all shadow-sm"
                    >
                        <Printer size={16} /> พิมพ์กรมธรรม์
                    </button>
                    <button
                        onClick={handlePrint}
                        className="px-5 py-2.5 bg-blue-600 text-white rounded-md font-semibold text-sm hover:bg-blue-700 flex items-center gap-2 transition-all shadow-sm"
                    >
                        <Download size={16} /> บันทึก PDF
                    </button>
                </div>

                {/* Certificate Document */}
                <div
                    ref={certRef}
                    className="w-[794px] bg-white shadow-2xl print:shadow-none print:w-full"
                    style={{ minHeight: "1123px" }}
                >
                    {/* Header Bar */}
                    <div className="bg-gray-900 px-14 py-8 flex justify-between items-center">
                        <div>
                            <div className="text-[10px] font-semibold tracking-[0.3em] text-gray-400 uppercase mb-1">กรมธรรม์คุ้มครองโทรศัพท์</div>
                            <h1 className="text-2xl font-black text-white tracking-tight">NARAVICH CARE</h1>
                            <div className="text-[11px] text-blue-400 font-semibold tracking-widest mt-0.5">MOBILE PROTECTION POLICY</div>
                        </div>
                        <div className="text-right space-y-2">
                            <div className="flex flex-col items-end border-b border-gray-800 pb-2 mb-2">
                                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">เลขอ้างอิง (Ref No.)</div>
                                <div className="flex items-center gap-2 group relative">
                                    {referenceNumber !== (selected.referenceNumber || "") && (
                                        <button
                                            onClick={handleSavePolicyNumber}
                                            disabled={actionLoading}
                                            className="absolute right-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-blue-500 hover:bg-blue-400 rounded-md text-white shadow-sm print:hidden disabled:opacity-50"
                                            title="บันทึก"
                                        >
                                            <CheckCircle size={14} />
                                        </button>
                                    )}
                                    <input
                                        type="text"
                                        value={referenceNumber}
                                        onChange={e => setReferenceNumber(e.target.value)}
                                        placeholder={`#${selected._id.toString().slice(-6).toUpperCase()}`}
                                        className="text-sm font-bold text-gray-400 font-mono tracking-widest bg-transparent border-b border-dashed border-transparent hover:border-gray-500 focus:border-blue-400 focus:outline-none text-right w-24 transition-colors print:w-auto overflow-hidden print:border-none"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">เลขกรมธรรม์</div>
                                <div className="flex items-center gap-2 group relative">
                                    {policyNumber !== (selected.policyNumber || "") && (
                                        <button
                                            onClick={handleSavePolicyNumber}
                                            disabled={actionLoading}
                                            className="absolute right-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-blue-500 hover:bg-blue-400 rounded-md text-white shadow-sm print:hidden disabled:opacity-50"
                                            title="บันทึก"
                                        >
                                            <CheckCircle size={14} />
                                        </button>
                                    )}
                                    <input
                                        type="text"
                                        value={policyNumber}
                                        onChange={e => setPolicyNumber(e.target.value)}
                                        placeholder={`#${selected._id.toString().slice(-6).toUpperCase()}`}
                                        className="text-lg font-black text-white font-mono tracking-widest bg-transparent border-b border-dashed border-transparent hover:border-gray-500 focus:border-blue-400 focus:outline-none text-right w-36 transition-colors print:w-auto overflow-hidden print:border-none"
                                    />
                                </div>
                            </div>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 rounded text-emerald-400 text-xs font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> อนุมัติแล้ว
                            </div>
                        </div>
                    </div>

                    {/* Gold Accent Line */}
                    <div className="h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400" />

                    <div className="px-14 py-10 space-y-10">
                        {/* Holder Info */}
                        <div className="grid grid-cols-2 gap-10">
                            <div className="space-y-5">
                                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                                    <div className="w-1 h-4 bg-gray-900 rounded-full" />
                                    <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">ข้อมูลผู้รับความคุ้มครอง</h2>
                                </div>
                                {[
                                    { label: "ชื่อ-นามสกุล", value: `${selected.firstName} ${selected.lastName}` },
                                    { label: "เลขบัตรประชาชน", value: selected.idCard || "—" },
                                    { label: "เบอร์โทรศัพท์", value: selected.phone },
                                    { label: "อีเมล", value: selected.email || "—" },
                                ].map(item => (
                                    <div key={item.label}>
                                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{item.label}</div>
                                        <div className="text-sm font-semibold text-gray-800 border-b border-dotted border-gray-200 pb-1">{item.value}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-5">
                                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                                    <div className="w-1 h-4 bg-gray-900 rounded-full" />
                                    <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">รายละเอียดอุปกรณ์</h2>
                                </div>
                                {[
                                    { label: "ยี่ห้อ / รุ่น", value: `${selected.brand} ${selected.model}`.toUpperCase() },
                                    { label: "IMEI", value: selected.imei, mono: true },
                                    { label: "ราคาเครื่อง", value: `${selected.devicePrice?.toLocaleString()} บาท` },
                                    { label: "แพ็กเกจ", value: packageMapping[selected.packageType] || selected.packageType || "—" },
                                ].map(item => (
                                    <div key={item.label}>
                                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{item.label}</div>
                                        <div className={`text-sm font-semibold text-gray-800 border-b border-dotted border-gray-200 pb-1 ${(item as any).mono ? "font-mono text-xs tracking-widest" : ""}`}>{item.value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Policy Terms Box */}
                        <div className="border border-gray-200 rounded-sm p-6 bg-gray-50 space-y-3">
                            <div className="flex items-center gap-2 mb-4">
                                <Shield size={16} className="text-gray-500" />
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">เงื่อนไขความคุ้มครองเบื้องต้น</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-x-10 gap-y-2 text-[11px] text-gray-600">
                                {[
                                    "ความคุ้มครองอุบัติเหตุจากการตกกระแทก",
                                    "ความคุ้มครองจอแตกแบบไม่ตั้งใจ",
                                    "ความคุ้มครองน้ำเข้าเครื่อง (ตามเงื่อนไข)",
                                    "ไม่คุ้มครองความเสียหายจากเจตนา",
                                    "ไม่คุ้มครองกรณีขาดทุน/การสูญหาย",
                                    "ต้องแจ้งเคลมภายใน 48 ชั่วโมง",
                                ].map((term, i) => (
                                    <div key={i} className="flex items-start gap-2">
                                        <span className="text-gray-400 mt-0.5">•</span>
                                        <span>{term}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-4 gap-6 pt-4">
                            {[
                                { label: "วันที่สมัคร", value: new Date(selected.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) },
                                { label: "วันที่อนุมัติ", value: selected.approvedAt ? new Date(selected.approvedAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) },
                                { label: "เลขอ้างอิง", value: referenceNumber || `#${selected._id.toString().slice(-6).toUpperCase()}` },
                                { label: "เลขกรมธรรม์", value: policyNumber || "รอดำเนินการ" },
                            ].map(item => (
                                <div key={item.label} className="text-center p-4 border border-gray-200 rounded-sm bg-white">
                                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">{item.label}</div>
                                    <div className="text-sm font-bold text-gray-900">{item.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Signatures */}
                        <div className="grid grid-cols-2 gap-20 pt-10">
                            <div className="text-center">
                                <div className="border-t border-gray-300 pt-3">
                                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-3">ลายมือชื่อผู้รับความคุ้มครอง</div>
                                    <div className="text-xs text-gray-500 mt-1">({selected.firstName} {selected.lastName})</div>
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="italic font-serif text-blue-900 text-base font-bold -mb-1">Naravich S.</div>
                                <div className="border-t border-gray-300 pt-3">
                                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-3">ลายมือชื่อผู้ให้ความคุ้มครอง</div>
                                    <div className="text-xs text-gray-500 mt-1">(Naravich Care Co., Ltd.)</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-100 px-14 py-5 flex justify-between items-center bg-gray-50">
                        <div className="text-[10px] text-gray-400">Naravich Care Co., Ltd. | naravichcare.com</div>
                        <div className="text-[10px] text-gray-400 font-mono">Policy #{policyNumber || "PENDING"}</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="bg-gray-50 min-h-screen py-8 px-6 lg:px-10">
                <div className="max-w-[1400px] mx-auto space-y-7">

                    {/* Page Header */}
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">รายการลงทะเบียน</h1>
                            <p className="text-sm text-gray-400 mt-0.5">ตรวจสอบ อนุมัติ และออกกรมธรรม์ทั้งหมด</p>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900">{registrations.length}</div>
                            <div className="text-xs text-gray-400 font-medium">รายการทั้งหมด</div>
                        </div>
                    </div>

                    {/* Stat Tabs */}
                    <div className="flex gap-2 flex-wrap">
                        {(["all", "pending", "paid", "approved", "rejected"] as const).map(s => {
                            const cfg = s === "all" ? null : STATUS_CONFIG[s];
                            const active = filterStatus === s;
                            return (
                                <button
                                    key={s}
                                    onClick={() => setFilterStatus(s)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold border transition-all ${active
                                        ? "bg-gray-900 text-white border-gray-900 shadow-sm"
                                        : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700"}`}
                                >
                                    {cfg && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />}
                                    {s === "all" ? "ทั้งหมด" : cfg!.label}
                                    <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                                        {counts[s]}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Toolbar */}
                    <div className="flex gap-3 items-center flex-wrap">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="ค้นหาชื่อ, เบอร์, IMEI, เลขที่ใบสมัคร..."
                                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-300"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        {selectedIds.size > 0 && (
                            <button
                                onClick={openDeleteBulkConfirm}
                                disabled={deleteLoading}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all disabled:opacity-50"
                            >
                                <Trash2 size={16} /> ลบที่เลือก ({selectedIds.size})
                            </button>
                        )}
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="w-10 px-4 py-3.5">
                                        <input
                                            type="checkbox"
                                            checked={filtered.length > 0 && selectedIds.size === filtered.length}
                                            onChange={toggleSelectAll}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                    </th>
                                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-8">#</th>
                                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">ผู้สมัคร</th>
                                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">อุปกรณ์</th>
                                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">แพ็กเกจ</th>
                                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">วันที่สมัคร</th>
                                    <th className="text-center px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">สถานะ</th>
                                    <th className="text-center px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan={8} className="py-20 text-center text-sm text-gray-400">กำลังโหลดข้อมูล...</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={8} className="py-20 text-center text-sm text-gray-400">ไม่พบรายการข้อมูล</td></tr>
                                ) : filtered.map((r, idx) => {
                                    const cfg = STATUS_CONFIG[r.status];
                                    const checked = selectedIds.has(r._id);
                                    return (
                                        <tr key={r._id} className={`hover:bg-gray-50/70 transition-colors ${checked ? "bg-red-50/50" : ""}`}>
                                            <td className="w-10 px-4 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleSelect(r._id)}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-300 font-medium">{idx + 1}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                                                        {r.firstName?.[0]}{r.lastName?.[0]}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-gray-800">{r.firstName} {r.lastName}</div>
                                                        <div className="text-xs text-gray-400 mt-0.5">{r.phone} · <span className="font-mono text-[10px]">#{r._id.toString().slice(-6).toUpperCase()}</span></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-800 uppercase text-xs tracking-wide">{r.brand} {r.model}</div>
                                                <div className="text-xs text-gray-400 font-mono mt-0.5">{r.imei}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-gray-700 font-medium">{packageMapping[r.packageType] || r.packageType || "—"}</div>
                                                <div className="text-xs text-gray-400">{r.devicePrice?.toLocaleString()} บาท</div>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                                                {new Date(r.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ring-1 ring-inset ${cfg.badge}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                                    {cfg.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2 flex-wrap">
                                                    <button
                                                        onClick={() => loadAndSelect(r)}
                                                        disabled={detailLoading}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-900 hover:text-white transition-all disabled:opacity-50"
                                                    >
                                                        ดูข้อมูล <ArrowUpRight size={13} />
                                                    </button>
                                                    <button
                                                        onClick={() => openDeleteOneConfirm(r)}
                                                        disabled={deleteLoading}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"
                                                        title="ลบรายการ"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                    {r.status === "approved" ? (
                                                        <button
                                                            onClick={() => loadAndSelect(r, () => setShowCertificate(true))}
                                                            disabled={detailLoading}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all whitespace-nowrap shadow-sm disabled:opacity-50"
                                                        >
                                                            ดูกรมธรรม์ <FileText size={13} />
                                                        </button>
                                                    ) : null}
                                                    {(r.status === "paid" || r.status === "approved") ? (
                                                        <button
                                                            onClick={() => loadAndSelect(r, () => setShowTransaction(true))}
                                                            disabled={detailLoading}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all whitespace-nowrap shadow-sm disabled:opacity-50"
                                                        >
                                                            ดูสลิป <CreditCard size={13} />
                                                        </button>
                                                    ) : r.status === "pending" ? (
                                                        <div className="px-3 py-1.5 text-xs font-medium text-amber-400 italic">รอชำระ</div>
                                                    ) : null}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Delete Confirm Modal */}
                {deleteConfirm && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                        <Trash2 size={24} className="text-red-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">
                                            {deleteConfirm.type === "bulk" ? "ลบหลายรายการ" : "ลบรายการ"}
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-0.5">
                                            {deleteConfirm.type === "bulk"
                                                ? `ต้องการลบ ${deleteConfirm.count} รายการที่เลือกใช่หรือไม่? การลบไม่สามารถกู้คืนได้`
                                                : `ลบรายการ ${deleteConfirm.reg.firstName} ${deleteConfirm.reg.lastName} (#${deleteConfirm.reg._id.toString().slice(-6).toUpperCase()}) ใช่หรือไม่? การลบไม่สามารถกู้คืนได้`}
                                        </p>
                                    </div>
                                </div>
                                {deleteConfirm.error && (
                                    <p className="text-sm text-red-600 font-medium mb-4 px-3 py-2 bg-red-50 rounded-lg">{deleteConfirm.error}</p>
                                )}
                                <div className="flex gap-3 justify-end">
                                    <button
                                        onClick={() => setDeleteConfirm(null)}
                                        disabled={deleteLoading}
                                        className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all disabled:opacity-50"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        onClick={() => deleteConfirm.type === "bulk" ? executeDeleteBulk() : executeDeleteOne()}
                                        disabled={deleteLoading}
                                        className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-all disabled:opacity-50 inline-flex items-center gap-2"
                                    >
                                        {deleteLoading ? (
                                            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <Trash2 size={16} />
                                        )}
                                        ลบ
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Detail Modal */}
                {selected && !showCertificate && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]">
                        <div className="bg-white w-full max-w-[1000px] max-h-[92vh] rounded-xl shadow-2xl flex flex-col border border-gray-200 overflow-hidden">

                            {/* Modal Header */}
                            <div className="px-7 py-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-md bg-gray-900 flex items-center justify-center text-white text-sm font-bold">
                                        {selected.firstName?.[0]}{selected.lastName?.[0]}
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-gray-900">{selected.firstName} {selected.lastName}</h2>
                                        <p className="text-xs text-gray-400 font-mono">#{selected._id.toString().toUpperCase()}</p>
                                    </div>
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ring-1 ring-inset ml-2 ${STATUS_CONFIG[selected.status].badge}`}>
                                        {STATUS_CONFIG[selected.status].label}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {selected.status === "approved" && (
                                        <button
                                            onClick={() => setShowCertificate(true)}
                                            className="flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all shadow-sm"
                                        >
                                            <FileText size={14} /> ดูกรมธรรม์
                                        </button>
                                    )}
                                    <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-all">
                                        <XCircle size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 overflow-y-auto">
                                <div className="grid grid-cols-[1fr_340px] divide-x divide-gray-100 h-full">

                                    {/* Left: Info & Photos */}
                                    <div className="p-7 space-y-7 overflow-y-auto">
                                        <div className="grid grid-cols-2 gap-4">
                                            {[
                                                { label: "ชื่อ-นามสกุล", value: `${selected.firstName} ${selected.lastName}` },
                                                { label: "เบอร์โทรศัพท์", value: selected.phone },
                                                { label: "เลขบัตรประชาชน", value: selected.idCard || "—" },
                                                { label: "อีเมล", value: selected.email || "—" },
                                                { label: "ยี่ห้อ / รุ่น", value: `${selected.brand} ${selected.model}` },
                                                { label: "IMEI", value: selected.imei, mono: true },
                                                { label: "แพ็กเกจ", value: packageMapping[selected.packageType] || selected.packageType || "—" },
                                                { label: "ราคาเครื่อง", value: `${selected.devicePrice?.toLocaleString()} บาท` },
                                            ].map(item => (
                                                <div key={item.label} className="space-y-1 p-4 bg-gray-50 rounded-lg">
                                                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{item.label}</div>
                                                    <div className={`text-sm font-semibold text-gray-800 ${(item as any).mono ? "font-mono text-xs" : ""}`}>{item.value}</div>
                                                </div>
                                            ))}
                                            <div className="col-span-2 p-4 bg-gray-50 rounded-lg space-y-1">
                                                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">ที่อยู่</div>
                                                <div className="text-sm font-semibold text-gray-800">
                                                    {[selected.addressDetails, `ต.${selected.subDistrict}`, `อ.${selected.district}`, `จ.${selected.province}`, selected.postCode].filter(x => x && x !== "ต.undefined" && x !== "อ.undefined" && x !== "จ.undefined").join(" ")}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                                <Smartphone size={13} /> รูปภาพตัวเครื่อง
                                            </h4>
                                            {selected.images ? (
                                                <div className="grid grid-cols-3 gap-2">
                                                    {Object.entries(selected.images).filter(([k]) => k !== 'receipt').map(([side, url]) => (
                                                        <div key={side} className="aspect-[3/4] bg-gray-100 rounded-md overflow-hidden relative border border-gray-200">
                                                            <img src={url} alt={side} className="w-full h-full object-cover" />
                                                            <div className="absolute inset-x-0 bottom-0 bg-black/50 py-1 text-center text-[9px] text-white font-semibold uppercase">{side}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="p-8 bg-gray-50 rounded-lg text-center text-sm text-gray-400 border border-dashed border-gray-200">ไม่ได้อัปโหลดรูปภาพ</div>
                                            )}
                                        </div>

                                        <div className="space-y-3">
                                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                                <FileText size={13} /> ใบเสร็จการซื้อเครื่อง
                                            </h4>
                                            {selected.images?.receipt ? (
                                                <div className="bg-gray-50 rounded-md overflow-hidden border border-gray-200 p-3 flex items-center justify-center max-h-48">
                                                    <img src={selected.images.receipt} alt="receipt" className="max-h-44 object-contain" />
                                                </div>
                                            ) : (
                                                <div className="p-8 bg-gray-50 rounded-lg text-center text-sm text-gray-400 border border-dashed border-gray-200">ไม่มีรูปใบเสร็จ</div>
                                            )}
                                        </div>

                                        {/* Payment Receipt Slip Section */}
                                        {(selected.paymentReceipt || selected.status === "paid" || selected.status === "approved") && (
                                            <div className="space-y-3">
                                                <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-2">
                                                    <CreditCard size={13} /> สลิปโอนเงิน (ชำระแล้ว)
                                                </h4>
                                                {selected.paymentReceipt ? (
                                                    <div className="bg-blue-50 rounded-md overflow-hidden border border-blue-100 p-3 flex items-center justify-center">
                                                        <img
                                                            src={selected.paymentReceipt}
                                                            alt="payment-slip"
                                                            className="max-h-64 w-full object-contain rounded-md cursor-pointer"
                                                            onClick={() => setShowTransaction(true)}
                                                            title="คลิกเพื่อดูแบบเต็ม"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="p-6 bg-blue-50/50 rounded-lg border border-dashed border-blue-200 text-center text-sm text-blue-400">
                                                        สถานะ: <span className="font-bold">ชำระแล้ว</span> — รอแอดมินอัปโหลดสลิป
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: Actions */}
                                    <div className="p-7 space-y-6 bg-gray-50/50 flex flex-col">
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-800">อนุมัติ / จัดการ</h3>
                                            <p className="text-xs text-gray-400 mt-0.5">อัปโหลดหลักฐานและออกเลขกรมธรรม์</p>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">หลักฐานการชำระเงิน (สลิป)</label>
                                            <div className="relative">
                                                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleReceiptUpload} />
                                                <div className={`flex items-center gap-3 px-4 py-3 rounded-md border-2 border-dashed text-sm transition-colors ${receiptFile ? "border-blue-300 bg-blue-50 text-blue-600" : "border-gray-200 bg-white text-gray-400 hover:border-gray-300"}`}>
                                                    <Upload size={16} />
                                                    <span className="font-medium">{receiptFile ? "✓ อัปโหลดสลิปแล้ว" : "คลิกเพื่อเลือกรูปสลิป"}</span>
                                                </div>
                                            </div>
                                            {receiptFile && <img src={receiptFile} alt="slip" className="w-full max-h-36 object-contain rounded-md border border-gray-200 bg-white p-2" />}
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">เลขอ้างอิง (Ref No.)</label>
                                                <input
                                                    type="text"
                                                    placeholder={`#${selected._id.toString().slice(-6).toUpperCase()}`}
                                                    className="w-full px-4 py-3 rounded-md border border-gray-200 bg-white text-sm font-bold text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-300 placeholder:font-normal font-mono"
                                                    value={referenceNumber}
                                                    onChange={e => setReferenceNumber(e.target.value)}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">เลขที่กรมธรรม์</label>
                                                <input
                                                    type="text"
                                                    placeholder="ระบุเลขกรมธรรม์..."
                                                    className="w-full px-4 py-3 rounded-md border border-gray-200 bg-white text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-300 placeholder:font-normal font-mono tracking-wider"
                                                    value={policyNumber}
                                                    onChange={e => setPolicyNumber(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex-1" />

                                        <div className="space-y-3 pt-4 border-t border-gray-200">
                                            <button onClick={() => handleUpdate("approved")} disabled={actionLoading}
                                                className="w-full flex items-center justify-center gap-2 py-3 rounded-md bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-50">
                                                <CheckCircle size={16} />
                                                {actionLoading ? "กำลังดำเนินการ..." : "อนุมัติกรมธรรม์"}
                                            </button>
                                            <button onClick={() => handleUpdate("paid")} disabled={actionLoading}
                                                className="w-full flex items-center justify-center gap-2 py-3 rounded-md bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
                                                <CreditCard size={16} /> ยืนยันการชำระเงิน
                                            </button>
                                            <button onClick={() => handleUpdate("rejected")} disabled={actionLoading}
                                                className="w-full flex items-center justify-center gap-2 py-3 rounded-md bg-white border border-gray-200 text-red-500 text-sm font-semibold hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-50">
                                                <XCircle size={16} /> ปฏิเสธ / ยกเลิก
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Transaction Modal */}
            {showTransaction && selected && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-xl shadow-2xl flex flex-col border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                            <div className="flex items-center gap-2">
                                <FileText size={18} className="text-blue-600" />
                                <h2 className="text-base font-bold text-gray-900">หลักฐานการชำระเงิน</h2>
                            </div>
                            <button onClick={() => setShowTransaction(false)} className="w-8 h-8 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-all">
                                <XCircle size={16} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-start border-b border-gray-50 pb-4">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ผู้ทำรายการ</p>
                                    <p className="text-sm font-semibold text-gray-800">{selected.firstName} {selected.lastName}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">เลขที่ใบสมัคร</p>
                                    <p className="text-sm font-mono font-bold text-blue-600">#{selected._id.toString().slice(-6).toUpperCase()}</p>
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">หลักฐานการโอนเงิน (Slip)</p>
                                {selected.paymentReceipt ? (
                                    <div className="bg-gray-50 rounded-lg border border-gray-100 p-2 flex items-center justify-center overflow-hidden">
                                        <img
                                            src={selected.paymentReceipt}
                                            alt="payment-receipt"
                                            className="max-h-[400px] w-full object-contain rounded-md"
                                        />
                                    </div>
                                ) : (
                                    <div className="p-12 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-center flex flex-col items-center gap-2">
                                        <Clock size={32} className="text-gray-300" />
                                        <p className="text-sm text-gray-400 font-medium">ยังไม่มีข้อมูลการชำระเงิน</p>
                                        <p className="text-[10px] text-gray-300">รอแอดมินอัปโหลดหลักฐานในขั้นตอนอนุมัติ</p>
                                    </div>
                                )}
                            </div>

                            {selected.policyNumber && (
                                <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">เลขที่กรมธรรม์ที่ออกให้</p>
                                    <p className="text-sm font-mono font-bold text-blue-700">{selected.policyNumber}</p>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                            <button
                                onClick={() => setShowTransaction(false)}
                                className="w-full py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-100 transition-all shadow-sm"
                            >
                                ปิดหน้าต่าง
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
