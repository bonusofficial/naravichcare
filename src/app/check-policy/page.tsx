"use client";
import { useEffect, useState, useRef } from "react";
import {
    Search, Smartphone, ShieldCheck,
    Printer, Download, Shield,
    FileText, User, CreditCard,
    CheckCircle, Loader2, Home
} from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";

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
    status: string;
    createdAt: string;
    approvedAt?: string;
    idCard?: string;
    policyNumber?: string;
    referenceNumber?: string;
    paymentReceipt?: string;
    email?: string;
};

export default function CheckPolicy() {
    const [searchType, setSearchType] = useState<"idCard" | "imei">("idCard");
    const [searchValue, setSearchValue] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<Registration | null>(null);
    const [error, setError] = useState("");
    const [showCert, setShowCert] = useState(false);
    const [packageMapping, setPackageMapping] = useState<Record<string, string>>({});

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
                console.error("Failed to fetch mapping:", e);
            }
        };
        fetchMappingData();
    }, []);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setResult(null);
        try {
            const res = await fetch("/api/check-policy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ searchType, searchValue })
            });
            const data = await res.json();
            if (res.ok) {
                setResult(data.data);
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่ภายหลัง");
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => window.print();

    if (showCert && result) {
        return (
            <div className="fixed inset-0 z-[100] bg-slate-100 flex flex-col items-center py-10 overflow-auto print:bg-white print:py-0">
                <div className="mb-6 flex gap-3 print:hidden">
                    <button
                        onClick={() => setShowCert(false)}
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
                </div>

                {/* Certificate Document (Copied from Admin) */}
                <div className="w-[794px] bg-white shadow-2xl print:shadow-none print:w-full" style={{ minHeight: "1123px" }}>
                    <div className="bg-gray-900 px-14 py-8 flex justify-between items-center">
                        <div>
                            <div className="text-[10px] font-semibold tracking-[0.3em] text-gray-400 uppercase mb-1">กรมธรรม์คุ้มครองโทรศัพท์</div>
                            <h1 className="text-2xl font-black text-white tracking-tight">NARAVICH CARE</h1>
                            <div className="text-[11px] text-blue-400 font-semibold tracking-widest mt-0.5">MOBILE PROTECTION POLICY</div>
                        </div>
                        <div className="text-right">
                            <div className="flex flex-col items-end border-b border-gray-800 pb-2 mb-2">
                                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">เลขอ้างอิง (Ref No.)</div>
                                <div className="text-sm font-bold text-gray-400 font-mono tracking-widest">{result.referenceNumber || `#${result._id.toString().slice(-6).toUpperCase()}`}</div>
                            </div>
                            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">เลขกรมธรรม์</div>
                            <div className="text-lg font-black text-white font-mono tracking-widest">{result.policyNumber || "รอดำเนินการ"}</div>
                            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 rounded text-emerald-400 text-xs font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> {result.status === "approved" ? "อนุมัติแล้ว" : "รอดำเนินการ"}
                            </div>
                        </div>
                    </div>
                    <div className="h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400" />
                    <div className="px-14 py-10 space-y-10">
                        <div className="grid grid-cols-2 gap-10">
                            <div className="space-y-5">
                                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                                    <div className="w-1 h-4 bg-gray-900 rounded-full" />
                                    <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">ข้อมูลผู้รับความคุ้มครอง</h2>
                                </div>
                                {[
                                    { label: "ชื่อ-นามสกุล", value: `${result.firstName} ${result.lastName}` },
                                    { label: "เลขบัตรประชาชน", value: result.idCard || "—" },
                                    { label: "เบอร์โทรศัพท์", value: result.phone },
                                    { label: "อีเมล", value: result.email || "—" },
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
                                    { label: "ยี่ห้อ / รุ่น", value: `${result.brand} ${result.model}`.toUpperCase() },
                                    { label: "IMEI", value: result.imei, mono: true },
                                    { label: "ราคาเครื่อง", value: `${result.devicePrice?.toLocaleString()} บาท` },
                                    { label: "แพ็กเกจ", value: packageMapping[result.packageType] || result.packageType || "—" },
                                ].map(item => (
                                    <div key={item.label}>
                                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{item.label}</div>
                                        <div className={`text-sm font-semibold text-gray-800 border-b border-dotted border-gray-200 pb-1 ${(item as any).mono ? "font-mono text-xs tracking-widest" : ""}`}>{item.value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
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
                        <div className="grid grid-cols-4 gap-6 pt-4">
                            {[
                                { label: "วันที่สมัคร", value: new Date(result.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) },
                                { label: "วันที่อนุมัติ", value: result.approvedAt ? new Date(result.approvedAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) : "-" },
                                { label: "เลขอ้างอิง", value: result.referenceNumber || `#${result._id.toString().slice(-6).toUpperCase()}` },
                                { label: "เลขกรมธรรม์", value: result.policyNumber || `รอดำเนินการ` },
                            ].map(item => (
                                <div key={item.label} className="text-center p-4 border border-gray-200 rounded-sm bg-white">
                                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">{item.label}</div>
                                    <div className="text-sm font-bold text-gray-900">{item.value}</div>
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 gap-20 pt-10">
                            <div className="text-center">
                                <div className="border-t border-gray-300 pt-3">
                                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-3">ลายมือชื่อผู้รับความคุ้มครอง</div>
                                    <div className="text-xs text-gray-500 mt-1">({result.firstName} {result.lastName})</div>
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
                    <div className="border-t border-gray-100 px-14 py-5 flex justify-between items-center bg-gray-50">
                        <div className="text-[10px] text-gray-400">Naravich Care Co., Ltd. | naravichcare.com</div>
                        <div className="text-[10px] text-gray-400 font-mono">Policy #{result.policyNumber || "PENDING"} | Ref {result.referenceNumber || `#${result._id.toString().slice(-6).toUpperCase()}`}</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <Header />
            <main className="flex-grow flex flex-col items-center py-16 px-6">
                <div className="w-full max-w-xl space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
                    <div className="text-center space-y-3">
                        <div className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-200 mb-2">
                            <ShieldCheck size={32} />
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">ดาวน์โหลดกรมธรรม์</h1>
                        <p className="text-slate-500 text-sm font-medium">กรอกข้อมูลเพื่อตรวจสอบสถานะความคุ้มครองและรับเอกสาร</p>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-100 space-y-8">
                        <div className="flex p-1 bg-slate-100 rounded-xl">
                            <button
                                onClick={() => setSearchType("idCard")}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all ${searchType === "idCard" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                            >
                                <User size={14} /> เลขบัตรประชาชน
                            </button>
                            <button
                                onClick={() => setSearchType("imei")}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold rounded-lg transition-all ${searchType === "imei" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                            >
                                <Smartphone size={14} /> หมายเลข IMEI
                            </button>
                        </div>

                        <form onSubmit={handleSearch} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    {searchType === "idCard" ? "เลขบัตรประจำตัวประชาชน" : "หมายเลข IMEI 15 หลัก"}
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder={searchType === "idCard" ? "1-XXXX-XXXXX-XX-X" : "35XXXXXXXXXXXXX"}
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-lg font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all placeholder:text-slate-300"
                                />
                            </div>

                            {error && (
                                <div className="p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2 border border-red-100 animate-in fade-in duration-300">
                                    <Shield size={16} /> {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-5 bg-slate-900 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-blue-600 disabled:bg-slate-300 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2 group"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} className="group-hover:scale-110 transition-transform" />}
                                ตรวจสอบข้อมูล
                            </button>
                        </form>
                    </div>

                    {result && (
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-blue-100 animate-in zoom-in-95 duration-500">
                            <div className="flex items-start justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                                        <CheckCircle size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 leading-tight">{result.firstName} {result.lastName}</h3>
                                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mt-1 italic">Coverage Active</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">เลขกรมธรรม์</p>
                                    <p className="text-sm font-mono font-bold text-blue-600">{result.policyNumber}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">อุปกรณ์ที่คุ้มครอง</p>
                                    <p className="text-sm font-bold text-slate-900">{result.brand} {result.model}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">แพ็กเกจ</p>
                                    <p className="text-sm font-bold text-slate-900">{packageMapping[result.packageType] || result.packageType || "-"}</p>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowCert(true)}
                                className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-2"
                            >
                                <Download size={20} /> ดาวน์โหลดกรมธรรม์แบบเต็ม
                            </button>
                        </div>
                    )}
                </div>
            </main>

            <footer className="py-8 text-center border-t border-slate-100">
                <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-all font-bold text-xs uppercase tracking-widest">
                    <Home size={14} /> กลับหน้าหลัก
                </Link>
            </footer>
        </div>
    );
}
