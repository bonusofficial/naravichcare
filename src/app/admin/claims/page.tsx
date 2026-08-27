"use client";
import React, { useState, useEffect, Suspense } from "react";
import { Search, ShieldCheck, CheckSquare, CreditCard, Wrench, ClipboardList, FileCheck, ChevronRight, Monitor, Droplets, Battery, ImageIcon, AlertCircle, Plus, Trash2, Camera, UploadCloud, Receipt, Wallet, FileText, Package, Tag, Hash, ExternalLink, Loader2, Cpu, Settings } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const steps = [
    { n: 1, title: "ค้นหาด้วย IMEI/บัตรประชาชน", icon: <Search size={16} /> },
    { n: 2, title: "ตรวจ Void", icon: <ShieldCheck size={16} /> },
    { n: 3, title: "Deductible", icon: <CreditCard size={16} /> },
    { n: 4, title: "ระบุอะไหล่", icon: <Wrench size={16} /> },
    { n: 5, title: "รูปหลังซ่อม", icon: <ImageIcon size={16} /> },
    { n: 6, title: "ตัดสิทธิ์", icon: <FileCheck size={16} /> },
];

// Helper to get Icon Component from string
const QuotaIcon = ({ name, size = 18 }: { name: string; size?: number }) => {
    switch (name) {
        case "Monitor": return <Monitor size={size} />;
        case "Droplets": return <Droplets size={size} />;
        case "Battery": return <Battery size={size} />;
        case "Cpu": return <Cpu size={size} />;
        default: return <Settings size={size} />;
    }
};

function ClaimsContent() {
    const searchParams = useSearchParams();
    const [activeStep, setActiveStep] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [showNew, setShowNew] = useState(false);

    // Auto-load if opened from history
    useEffect(() => {
        const imeiParam = searchParams?.get("imei");
        if (imeiParam) {
            setSearchQuery(imeiParam);
            setShowNew(true);
            setTimeout(() => {
                document.getElementById('search-claim-btn')?.click();
            }, 500);
        }
    }, [searchParams]);

    // API States
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [customerData, setCustomerData] = useState<any>(null);
    const [selectedQuotaName, setSelectedQuotaName] = useState("");

    // Void Check States (Step 2)
    const [voidChecklist, setVoidChecklist] = useState([
        { id: 1, label: "เครื่องไม่มีร่องรอย Jailbreak", checked: false },
        { id: 2, label: "ไม่มีการดัดแปลงชิ้นส่วน", checked: false },
        { id: 3, label: "ไม่ใช่ความเสียหายจากการตั้งใจ", checked: false },
        { id: 4, label: "ลูกค้าแสดงบัตรประจำตัว", checked: false }
    ]);
    const [newVoidItem, setNewVoidItem] = useState("");
    const [preRepairNote, setPreRepairNote] = useState("");
    const [preRepairImages, setPreRepairImages] = useState<string[]>([]);

    // Deductible States (Step 3)
    const [deductibleItem, setDeductibleItem] = useState("ค่าบริการเปลี่ยนจอ");
    const [deductibleDetail, setDeductibleDetail] = useState("");
    const [deductibleAmount, setDeductibleAmount] = useState("");
    const [paymentSlip, setPaymentSlip] = useState<string | null>(null);

    // Parts States (Step 4)
    interface Part { id: number; name: string; partNumber: string; qty: number; unitCost: number; }
    const COMMON_PARTS = ["หน้าจอ LCD/OLED", "ทัชสกรีน", "แบตเตอรี่", "กล้องหลัง", "กล้องหน้า", "ลำโพง", "ไมโครโฟน", "ปุ่มเปิด-ปิด", "ปุ่มระดับเสียง", "ฝาหลัง", "บอร์หลัก", "ชาร์จพอร์ต"];
    const [parts, setParts] = useState<Part[]>([{ id: 1, name: "", partNumber: "", qty: 1, unitCost: 0 }]);
    const addPart = () => setParts([...parts, { id: Date.now(), name: "", partNumber: "", qty: 1, unitCost: 0 }]);
    const removePart = (id: number) => setParts(parts.filter(p => p.id !== id));
    const updatePart = (id: number, field: keyof Part, value: string | number) => setParts(parts.map(p => p.id === id ? { ...p, [field]: value } : p));
    const totalPartsCost = parts.reduce((sum, p) => sum + (p.qty * p.unitCost), 0);

    // Step 5: Post-repair photos
    const [postRepairImages, setPostRepairImages] = useState<string[]>([]);
    const [postRepairNote, setPostRepairNote] = useState("");
    const handlePostRepairUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const imgs = Array.from(e.target.files).map(f => URL.createObjectURL(f));
            setPostRepairImages(prev => [...prev, ...imgs]);
        }
    };
    const removePostImage = (idx: number) => setPostRepairImages(p => p.filter((_, i) => i !== idx));

    // Step 6: claim done state
    const [claimDone, setClaimDone] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savedClaimId, setSavedClaimId] = useState<string | null>(null);
    const [currentClaimId, setCurrentClaimId] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ msg: string, type: 'success' | 'error' | 'info' } | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ show: boolean, draft: any } | null>(null);

    // Auto-hide notification
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const handleSaveDraft = async () => {
        setSaving(true);
        try {
            const payload = {
                _id: currentClaimId,
                customerName: customerData ? `${customerData.firstName} ${customerData.lastName}` : "",
                idCard: customerData?.idCard || "",
                imei: customerData?.imei || searchQuery,
                brand: customerData?.brand || "",
                deviceModel: customerData?.model || "",
                policyNumber: customerData?.policyNumber || "",
                registrationId: customerData?._id || null,
                voidChecklist,
                preRepairNote,
                preRepairImages,
                deductibleItem,
                deductibleDetail,
                deductibleAmount: Number(deductibleAmount) || 0,
                paymentSlip,
                parts,
                postRepairNote,
                postRepairImages,
                consumedQuotaName: selectedQuotaName,
                status: "draft",
                currentStep: activeStep
            };

            const isUpdate = !!currentClaimId;
            const res = await fetch("/api/admin/claims", {
                method: isUpdate ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.success) {
                setCurrentClaimId(data.data._id);
                setNotification({ msg: "บันทึกฉบับร่างเรียบร้อยแล้ว", type: "success" });
            } else {
                setNotification({ msg: "เกิดข้อผิดพลาด: " + data.error, type: "error" });
            }
        } catch (error) {
            console.error(error);
            setNotification({ msg: "เกิดข้อผิดพลาดในการบันทึก", type: "error" });
        } finally {
            setSaving(false);
        }
    };

    const handleConfirmClaim = async () => {
        setSaving(true);
        try {
            const payload = {
                _id: currentClaimId,
                customerName: customerData ? `${customerData.firstName} ${customerData.lastName}` : "",
                idCard: customerData?.idCard || "",
                imei: customerData?.imei || searchQuery,
                brand: customerData?.brand || "",
                deviceModel: customerData?.model || "",
                policyNumber: customerData?.policyNumber || "",
                registrationId: customerData?._id || null,
                voidChecklist,
                preRepairNote,
                preRepairImages,
                deductibleItem,
                deductibleDetail,
                deductibleAmount: Number(deductibleAmount) || 0,
                paymentSlip,
                parts,
                postRepairNote,
                postRepairImages,
                consumedQuotaName: selectedQuotaName,
                status: "completed",
            };
            const isUpdate = !!currentClaimId;
            const res = await fetch("/api/admin/claims", {
                method: isUpdate ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.success) {
                setSavedClaimId(data.data._id);
                setNotification({ msg: "บันทึกข้อมูลและตัดสิทธิ์เรียบร้อยแล้ว", type: "success" });
            } else {
                setNotification({ msg: "เกิดข้อผิดพลาด: " + data.error, type: "error" });
            }
        } catch {
            setNotification({ msg: "เกิดข้อผิดพลาดในการบันทึก", type: "error" });
        } finally {
            setSaving(false);
            setClaimDone(true);
        }
    };

    const handleSearch = async () => {
        if (searchQuery.length < 5) return;
        setLoading(true);
        setErrorMsg("");
        setCustomerData(null);
        setCurrentClaimId(null);
        setActiveStep(1);

        try {
            const res = await fetch("/api/admin/claims/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: searchQuery }),
            });
            const data = await res.json();

            if (!res.ok) {
                setErrorMsg(data.error);
            } else {
                setCustomerData(data.data);

                if (data.data.draftClaim) {
                    setConfirmModal({ show: true, draft: data.data.draftClaim });
                } else {
                    if (data.data.coveragePlan?.quotas?.length > 0) {
                        setSelectedQuotaName(data.data.coveragePlan.quotas[0].name);
                        setDeductibleItem(`ค่าบริการ${data.data.coveragePlan.quotas[0].name}`);
                    }
                }
            }
        } catch (error) {
            setErrorMsg("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
        } finally {
            setLoading(false);
        }
    };

    // Calculate Dynamic Quotas
    const getDynamicQuotas = () => {
        if (!customerData || !customerData.coveragePlan) return [];

        const planQuotas = customerData.coveragePlan.quotas || [];
        const prevClaims = customerData.previousClaims || [];

        return planQuotas.map((q: any) => {
            const usedCount = prevClaims.filter((c: any) => c.consumedQuotaName === q.name).length;
            return {
                ...q,
                remaining: Math.max(0, q.maxLimit - usedCount),
                total: q.maxLimit
            };
        });
    };

    const currentQuotas = getDynamicQuotas();
    const selectedQuota = currentQuotas.find((q: any) => q.name === selectedQuotaName);

    const toggleVoidCheck = (id: number) => {
        setVoidChecklist(voidChecklist.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
    };

    const addVoidItem = () => {
        if (newVoidItem.trim()) {
            setVoidChecklist([...voidChecklist, { id: Date.now(), label: newVoidItem.trim(), checked: true }]);
            setNewVoidItem("");
        }
    };

    const removeVoidItem = (id: number) => {
        setVoidChecklist(voidChecklist.filter(item => item.id !== id));
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newImages = Array.from(e.target.files).map(file => URL.createObjectURL(file));
            setPreRepairImages([...preRepairImages, ...newImages]);
        }
    };

    const removeImage = (index: number) => {
        setPreRepairImages(preRepairImages.filter((_, i) => i !== index));
    };

    const handleSlipUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setPaymentSlip(URL.createObjectURL(e.target.files[0]));
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-gray-800">งานเคลม (Insurance Claims)</h2>
                    <p className="text-gray-500 text-sm mt-1">ระบบเคลมประกัน 6 ขั้นตอน พร้อมตัดสิทธิ์ Quota อัตโนมัติ</p>
                </div>
                {!showNew && (
                    <button
                        onClick={() => { setShowNew(true); setCustomerData(null); setSearchQuery(""); setErrorMsg(""); setActiveStep(1); }}
                        className="bg-blue-600 text-white font-bold px-5 py-2.5 rounded-lg text-sm hover:bg-blue-700 shadow-md"
                    >
                        + เปิดเคสใหม่
                    </button>
                )}
            </div>

            {showNew ? (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
                        {steps.map((s, i) => (
                            <React.Fragment key={`step-${s.n}`}>
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeStep === s.n ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-100" : activeStep > s.n ? "bg-emerald-500 text-white" : "bg-white border border-gray-200 text-gray-400"}`}>
                                    {activeStep > s.n ? <CheckSquare size={14} /> : s.icon}
                                    <span className="hidden sm:inline">{s.title}</span>
                                </div>
                                {i < steps.length - 1 && <ChevronRight size={14} className="text-gray-300 shrink-0" />}
                            </React.Fragment>
                        ))}
                    </div>

                    <div className="p-6 md:p-8 min-h-[400px]">
                        {/* Step 1: Search */}
                        {activeStep === 1 && (
                            <div className="space-y-6 max-w-2xl">
                                <div><h3 className="text-xl font-black text-slate-900 mb-1">ระบุหมายเลขเครื่อง (IMEI) หรือเลขบัตรประชาชน</h3>
                                    <p className="text-slate-500 text-sm">ค้นหาสิทธิ์ประกันด้วย IMEI หรือ เลขบัตรประจำตัวประชาชน เพื่อดึงข้อมูลกรมธรรม์</p>
                                </div>

                                <div className="flex flex-col gap-3 sm:flex-row">
                                    <div className="relative flex-1"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="text"
                                            placeholder="กรอก IMEI หรือ เลขบัตรประชาชน..."
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-4 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm"
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                            disabled={loading}
                                        />
                                    </div>
                                    <button
                                        id="search-claim-btn"
                                        onClick={handleSearch}
                                        disabled={loading || searchQuery.length < 5}
                                        className={`min-h-12 px-8 font-black rounded-xl text-sm transition-all shadow-sm sm:min-h-0 ${loading || searchQuery.length < 5 ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white hover:bg-blue-600 hover:shadow-blue-200 hover:shadow-lg'}`}
                                    >
                                        {loading ? "กำลังค้นหา..." : "ค้นหา"}
                                    </button>
                                </div>

                                {errorMsg && (
                                    <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-bold flex items-start gap-3">
                                        <AlertCircle size={20} className="shrink-0 mt-0.5" />
                                        {errorMsg}
                                    </div>
                                )}

                                {customerData && (
                                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50/30 border border-blue-200 p-6 rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 shadow-sm">
                                        <div className="flex items-start gap-4 mb-6 pb-6 border-b border-blue-100/50">
                                            <div className="w-16 h-16 bg-white rounded-[1rem] shadow-sm flex flex-col items-center justify-center font-black text-xs border border-blue-100 text-blue-700 text-center leading-tight p-2 shrink-0">
                                                <span className="text-slate-400 text-[9px] uppercase tracking-widest mb-1">ยี่ห้อ</span>
                                                <span className="truncate w-full block text-sm">{customerData.brand}</span>
                                            </div>
                                            <div className="flex-1 space-y-1.5">
                                                <h4 className="font-black text-slate-900 text-xl">{customerData.model}</h4>
                                                <p className="text-sm font-bold text-slate-600 flex items-center gap-2">
                                                    <span className="text-slate-400">ชื่อลูกค้า:</span> {customerData.firstName} {customerData.lastName}
                                                </p>
                                                <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-slate-500 mt-2 bg-white/60 p-2.5 rounded-lg border border-white">
                                                    <p>IMEI: <span className="text-slate-800">{customerData.imei}</span></p>
                                                    <p>บัตรประชาชน: <span className="text-slate-800">{customerData.idCard || "ไม่ระบุ"}</span></p>
                                                    <p>เลขกรมธรรม์: <span className="text-blue-600 font-bold">{customerData.policyNumber || "รอนำเข้าระบบ"}</span></p>
                                                    <p>แพ็กเกจ: <span className="text-blue-600 font-bold">{customerData.coveragePlan?.name || "ไม่ทราบชื่อแพ็กเกจ"}</span></p>
                                                </div>
                                                <p className="text-xs text-emerald-600 font-bold mt-2 bg-emerald-50 inline-block px-3 py-1 rounded-md border border-emerald-100">
                                                    {/* The coverage window is the one the admin set at approval, not the
                                                        approval date itself — a policy can be backdated or start later. */}
                                                    ✓ ประกันใช้งานปกติ (คุ้มครอง: {new Date(customerData.coverageSnapshot?.coverageStartAt || customerData.approvedAt || customerData.createdAt).toLocaleDateString("th-TH")}
                                                    {customerData.coverageSnapshot?.coverageEndAt && ` – ${new Date(customerData.coverageSnapshot.coverageEndAt).toLocaleDateString("th-TH")}`})
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <div className="h-px bg-slate-200 flex-1"></div>
                                            โควต้าสิทธิ์การเคลมคงเหลือ (ตัวอย่างระบบ)
                                            <div className="h-px bg-slate-200 flex-1"></div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {currentQuotas.map((q: any) => (
                                                <div key={`quota-s1-${q.name}`} className="bg-white p-4 rounded-xl border border-blue-100 text-center shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                                                    {q.remaining === 0 && (
                                                        <div className="absolute inset-0 bg-slate-100/60 backdrop-blur-[1px] flex items-center justify-center z-10">
                                                            <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full rotate-[-10deg]">หมดสิทธิ์</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-center mb-2 text-blue-500">
                                                        <QuotaIcon name={q.icon} />
                                                    </div>
                                                    <p className="text-xs font-black text-slate-600 uppercase mb-1">{q.name}</p>
                                                    <p className={`text-2xl font-black ${q.remaining > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                                                        {q.remaining}<span className="text-sm text-slate-300 font-medium">/{q.total}</span>
                                                    </p>
                                                </div>
                                            ))}
                                            {currentQuotas.length === 0 && (
                                                <div className="col-span-full py-6 text-center text-slate-400 text-xs font-bold border border-dashed border-slate-200 rounded-xl">
                                                    — ไม่มีข้อมูลโควต้าสำหรับแผนนี้ —
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 2: Void Check */}
                        {activeStep === 2 && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-right-4 duration-300">

                                {/* Left Column: Checklist */}
                                <div className="space-y-6">
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-black text-slate-900 border-l-4 border-blue-600 pl-3">ตรวจสอบเงื่อนไขความคุ้มครอง (Void)</h3>
                                        <p className="text-sm font-medium text-slate-500 pl-4">ตรวจเช็คสภาพเครื่องก่อนรับเข้าซ่อม</p>
                                    </div>

                                    <div className="space-y-3">
                                        {voidChecklist.map((c) => (
                                            <div key={`void-${c.id}`} className={`flex items-start justify-between p-4 border rounded-xl transition-all ${c.checked ? 'bg-blue-50/50 border-blue-200' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
                                                <label className="flex items-start gap-3 cursor-pointer flex-1">
                                                    <input
                                                        type="checkbox"
                                                        className="w-5 h-5 accent-blue-600 mt-0.5 shrink-0"
                                                        checked={c.checked}
                                                        onChange={() => toggleVoidCheck(c.id)}
                                                    />
                                                    <span className={`text-sm font-bold ${c.checked ? 'text-blue-900' : 'text-slate-700'}`}>{c.label}</span>
                                                </label>
                                                {c.id > 4 && (
                                                    <button onClick={() => removeVoidItem(c.id)} className="text-red-400 hover:text-red-600 p-1">
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add custom void item */}
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="เพิ่มเงื่อนไขอื่นๆ ที่ตรวจพบ..."
                                            className="flex-1 text-sm border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500 bg-slate-50 focus:bg-white"
                                            value={newVoidItem}
                                            onChange={e => setNewVoidItem(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && addVoidItem()}
                                        />
                                        <button
                                            onClick={addVoidItem}
                                            disabled={!newVoidItem.trim()}
                                            className="bg-slate-900 text-white px-4 rounded-lg flex items-center justify-center disabled:opacity-50 hover:bg-blue-600 transition-colors"
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* Right Column: Comments & Photos */}
                                <div className="space-y-6">
                                    <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                            <ClipboardList size={18} className="text-blue-600" />
                                            รายละเอียดก่อนส่งซ่อม
                                        </h4>
                                        <textarea
                                            rows={4}
                                            placeholder="ระบุรายละเอียดอาการเสีย, ร่องรอยเดิมรอบตัวเครื่อง, หรือคอมเมนต์เพิ่มเติม..."
                                            className="w-full text-sm border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 resize-none font-medium text-slate-700"
                                            value={preRepairNote}
                                            onChange={e => setPreRepairNote(e.target.value)}
                                        ></textarea>
                                    </div>

                                    <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                                <Camera size={18} className="text-blue-600" />
                                                แนบรูปภาพก่อนซ่อม
                                            </h4>
                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-200 px-2 py-1 rounded">{preRepairImages.length} ภาพ</span>
                                        </div>

                                        {/* Image Gallery */}
                                        {preRepairImages.length > 0 && (
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                {preRepairImages.map((src, idx) => (
                                                    <div key={`preimg-${idx}`} className="relative aspect-square rounded-xl border border-slate-200 bg-white overflow-hidden group">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img src={src} alt="Pre-repair" className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <button
                                                                onClick={() => removeImage(idx)}
                                                                className="bg-red-500 text-white rounded-full p-2 hover:bg-red-600 hover:scale-110 transition-all shadow-lg"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Upload Button */}
                                        <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl flex flex-col items-center justify-center py-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50/50 transition-all cursor-pointer">
                                            <UploadCloud size={32} className="mb-2" />
                                            <span className="text-sm font-bold">คลิกเพื่ออัปโหลดรูปภาพ</span>
                                            <span className="text-xs font-medium opacity-70 mt-1">รองรับ JPG, PNG, ถ่ายจากกล้อง (Max 5MB)</span>
                                            <input
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleImageUpload}
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Deductible Payment */}
                        {activeStep === 3 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-right-4 duration-300">

                                <div className="space-y-6">
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-black text-slate-900 border-l-4 border-blue-600 pl-3">การชำระค่าธรรมเนียม (Deductible)</h3>
                                        <p className="text-sm font-medium text-slate-500 pl-4">เลือกประเภทการเคลมและระบุข้อมูลการชำระเงิน</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2 tracking-widest">
                                                <Tag size={14} className="text-blue-600" /> ประเภทสิทธิ์ที่ใช้เคลม
                                            </label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {currentQuotas.map((q: any) => (
                                                    <button
                                                        key={`quota-s3-${q.name}`}
                                                        disabled={q.remaining === 0}
                                                        onClick={() => {
                                                            setSelectedQuotaName(q.name);
                                                            setDeductibleItem(`ค่าบริการ${q.name}`);
                                                        }}
                                                        className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${selectedQuotaName === q.name ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-100' : q.remaining === 0 ? 'border-slate-100 bg-slate-50 opacity-40 grayscale cursor-not-allowed' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`${selectedQuotaName === q.name ? 'text-blue-600' : 'text-slate-400'}`}>
                                                                <QuotaIcon name={q.icon} size={16} />
                                                            </div>
                                                            <div className="text-left">
                                                                <p className="text-xs font-black text-slate-800">{q.name}</p>
                                                                <p className="text-[10px] font-bold text-slate-400">เหลือ {q.remaining}/{q.total} ครั้ง</p>
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2 tracking-widest">
                                                <FileText size={14} className="text-blue-600" /> ชื่อรายการ / แจกแจงค่าใช้จ่าย
                                            </label>
                                            <input
                                                type="text"
                                                value={deductibleItem}
                                                onChange={e => setDeductibleItem(e.target.value)}
                                                className="w-full text-base font-bold text-slate-800 border-2 border-slate-200 rounded-xl px-5 py-4 outline-none focus:border-blue-500 transition-all"
                                                placeholder="เช่น ค่าบริการเปลี่ยนหน้าจอ, ค่าบริการเปลี่ยนแบตเตอรี่"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2 tracking-widest">
                                                <ClipboardList size={14} className="text-blue-600" /> รายละเอียดเพิ่มเติม (ถ้ามี)
                                            </label>
                                            <textarea
                                                rows={3}
                                                value={deductibleDetail}
                                                onChange={e => setDeductibleDetail(e.target.value)}
                                                className="w-full text-sm font-medium text-slate-700 border-2 border-slate-200 rounded-xl px-5 py-3 outline-none focus:border-blue-500 transition-all resize-none bg-slate-50"
                                                placeholder="หมายเหตุ หรือรายละเอียดอื่นๆ ในการเบิกจ่าย"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2 tracking-widest">
                                                <Wallet size={14} className="text-blue-600" /> จำนวนเงินรวม (บาท)
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">฿</span>
                                                <input
                                                    type="number"
                                                    value={deductibleAmount}
                                                    onChange={e => setDeductibleAmount(e.target.value)}
                                                    className="w-full text-2xl font-black text-blue-700 border-2 border-blue-200 rounded-xl py-4 pl-10 pr-5 outline-none focus:border-blue-500 focus:bg-blue-50/50 transition-all"
                                                    placeholder="1,000"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Slip Upload */}
                                <div className="space-y-4 h-full flex flex-col">
                                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-2">
                                        <Receipt size={18} className="text-emerald-500" /> แนบหลักฐานการโอน (สลิป)
                                    </h4>

                                    <div className="flex-1 min-h-[300px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 transition-all group overflow-hidden relative
                                        ${paymentSlip ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-300 hover:border-blue-500 hover:bg-slate-50'}">

                                        {paymentSlip ? (
                                            <>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={paymentSlip} alt="Payment Slip" className="max-h-full object-contain z-10 rounded-lg shadow-sm" />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all z-20 flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
                                                    <span className="text-white font-bold tracking-widest uppercase text-sm">อัปโหลดสลิปใหม่</span>
                                                    <div className="flex gap-4">
                                                        <label className="bg-blue-600 text-white px-5 py-2 rounded-lg text-xs font-bold cursor-pointer hover:bg-blue-700 shadow-xl">
                                                            เปลี่ยนรูป
                                                            <input type="file" accept="image/*" className="hidden" onChange={handleSlipUpload} />
                                                        </label>
                                                        <button
                                                            onClick={() => setPaymentSlip(null)}
                                                            className="bg-red-500 text-white px-5 py-2 rounded-lg text-xs font-bold hover:bg-red-600 shadow-xl"
                                                        >
                                                            ลบสลิป
                                                        </button>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                                                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-blue-100 transition-all duration-300 shadow-sm">
                                                    <UploadCloud size={30} />
                                                </div>
                                                <p className="font-bold text-slate-700 text-base">ลากและวางไฟล์ หรือคลิกเพื่ออัปโหลด</p>
                                                <p className="text-xs font-semibold text-slate-400 mt-2 text-center max-w-[200px]">
                                                    รองรับไฟล์ JPG, PNG หรือภาพสลิปที่แคปเจอร์จากแอปธนาคาร
                                                </p>
                                                <input type="file" accept="image/*" className="hidden" onChange={handleSlipUpload} />
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeStep === 4 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 border-l-4 border-blue-600 pl-3">ระบุอะไหล่ที่ใช้ซ่อม</h3>
                                        <p className="text-sm font-medium text-slate-500 pl-4 mt-1">กรอกชื่อ, จำนวน และต้นทุนอะไหล่แต่ละชิ้นที่ใช้ในการซ่อม</p>
                                    </div>
                                    <button onClick={addPart} className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-black text-sm hover:bg-blue-600 transition-all shadow-md">
                                        <Plus size={16} /> เพิ่มอะไหล่
                                    </button>
                                </div>

                                {/* Parts table header */}
                                <div className="hidden md:grid grid-cols-[2fr_1.2fr_0.7fr_0.9fr_auto] gap-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <span className="flex items-center gap-1.5"><Package size={12} />ชื่ออะไหล่</span>
                                    <span className="flex items-center gap-1.5"><Tag size={12} />รหัสอะไหล่ (Part No.)</span>
                                    <span className="flex items-center gap-1.5"><Hash size={12} />จำนวน</span>
                                    <span className="flex items-center gap-1.5"><Wallet size={12} />ต้นทุน/ชิ้น (฿)</span>
                                    <span></span>
                                </div>

                                <div className="space-y-3">
                                    {parts.map((part, idx) => (
                                        <div key={`part-${part.id}`} className="grid grid-cols-1 md:grid-cols-[2fr_1.2fr_0.7fr_0.9fr_auto] gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
                                            {/* Part Name */}
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest md:hidden">ชื่ออะไหล่</label>
                                                <input
                                                    list={`parts-list-${part.id}`}
                                                    value={part.name}
                                                    onChange={e => updatePart(part.id, 'name', e.target.value)}
                                                    placeholder="เช่น หน้าจอ OLED..."
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 transition-all"
                                                />
                                                <datalist id={`parts-list-${part.id}`}>
                                                    {COMMON_PARTS.map((p, pIdx) => <option key={`opt-${part.id}-${pIdx}`} value={p} />)}
                                                </datalist>
                                            </div>
                                            {/* Part Number */}
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest md:hidden">รหัสอะไหล่</label>
                                                <input
                                                    value={part.partNumber}
                                                    onChange={e => updatePart(part.id, 'partNumber', e.target.value)}
                                                    placeholder="เช่น AP-LCD-001"
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-600 outline-none focus:border-blue-500 transition-all"
                                                />
                                            </div>
                                            {/* Qty */}
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest md:hidden">จำนวน</label>
                                                <input
                                                    type="number" min={1}
                                                    value={part.qty}
                                                    onChange={e => updatePart(part.id, 'qty', Number(e.target.value))}
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-800 outline-none focus:border-blue-500 transition-all text-center"
                                                />
                                            </div>
                                            {/* Unit Cost */}
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest md:hidden">ต้นทุน/ชิ้น (฿)</label>
                                                <input
                                                    type="number" min={0}
                                                    value={part.unitCost}
                                                    onChange={e => updatePart(part.id, 'unitCost', Number(e.target.value))}
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-blue-600 outline-none focus:border-blue-500 transition-all"
                                                />
                                            </div>
                                            {/* Delete */}
                                            <div className="flex items-center justify-end">
                                                <button onClick={() => removePart(part.id)} disabled={parts.length === 1} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 text-red-400 rounded-xl hover:bg-red-500 hover:text-white hover:border-red-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Summary */}
                                <div className="flex justify-end">
                                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-5 rounded-2xl min-w-[260px] space-y-2 shadow-xl shadow-blue-200">
                                        <p className="text-xs font-black uppercase tracking-widest text-blue-200">ต้นทุนอะไหล่รวมทั้งหมด</p>
                                        <p className="text-3xl font-black">฿{totalPartsCost.toLocaleString()}</p>
                                        <p className="text-xs text-blue-200 font-medium">{parts.length} รายการ • {parts.reduce((s, p) => s + p.qty, 0)} ชิ้น</p>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeStep === 5 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 border-l-4 border-blue-600 pl-3">รูปภาพหลังการซ่อม</h3>
                                    <p className="text-sm font-medium text-slate-500 pl-4 mt-1">แนบหลักฐานรูปภาพสภาพเครื่องหลังซ่อมเสร็จเรียบร้อย เพื่อรับรองคุณภาพงาน</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Left - upload area */}
                                    <div className="space-y-3">
                                        <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl flex flex-col items-center justify-center py-10 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50/40 transition-all cursor-pointer">
                                            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mb-3 group-hover:scale-110"><UploadCloud size={28} className="text-emerald-500" /></div>
                                            <span className="text-sm font-bold">อัปโหลดรูปหลังซ่อม</span>
                                            <span className="text-xs text-slate-400 mt-1">เลือกได้หลายรูปประกอบ (JPG, PNG)</span>
                                            <input type="file" multiple accept="image/*" className="hidden" onChange={handlePostRepairUpload} />
                                        </label>

                                        {postRepairImages.length === 0 && (
                                            <div className="text-center py-4 text-slate-300 text-xs font-bold uppercase tracking-widest">— ยังไม่มีรูปภาพที่อัปโหลด —</div>
                                        )}

                                        {postRepairImages.length > 0 && (
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                {postRepairImages.map((src, i) => (
                                                    <div key={`postimg-${i}`} className="relative aspect-square rounded-xl overflow-hidden group border border-slate-100">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img src={src} alt="post-repair" className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <button onClick={() => removePostImage(i)} className="bg-red-500 text-white rounded-full p-2 hover:scale-110 transition-transform shadow-lg"><Trash2 size={16} /></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Right - note */}
                                    <div className="space-y-4">
                                        <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl space-y-3">
                                            <h4 className="text-xs font-black uppercase tracking-widest text-emerald-700 flex items-center gap-2">
                                                <ClipboardList size={16} />
                                                บันทึกสรุปผลการซ่อม
                                            </h4>
                                            <textarea
                                                rows={5}
                                                value={postRepairNote}
                                                onChange={e => setPostRepairNote(e.target.value)}
                                                placeholder="สรุปผลการซ่อม, อาการสุดท้าย, หมายเหตุสำหรับช่างหรือนักบัญชี..."
                                                className="w-full text-sm font-medium text-slate-700 border border-emerald-200 focus:border-emerald-500 rounded-xl px-4 py-3 outline-none resize-none bg-white transition-all"
                                            />
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs font-bold text-slate-500 space-y-2">
                                            <p className="font-black text-slate-700 uppercase tracking-widest">สิ่งที่ควรถ่ายรูปให้ครบถ้วน:</p>
                                            <ul className="list-disc pl-4 space-y-1 text-slate-400">
                                                <li>หน้าจอเครื่องหลังซ่อม (4 มุม)</li>
                                                <li>สิทธิ์จอที่ชัดเจน เคลื่อนไหว ไม่สะดุด</li>
                                                <li>เปิดแอปในหน้าอุปกรณ์เพื่อแสดงสถานะเครื่อง (ถ้ามี)</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeStep === 6 && !claimDone && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <h3 className="text-xl font-black text-emerald-800 border-l-4 border-emerald-500 pl-3">ตัดสิทธิ์และยืนยันอนุมัติเคลม</h3>
                                    <p className="text-sm font-medium text-slate-500 pl-4 mt-1">ตรวจสอบรายการทั้งหมดเพื่อยืนยัน — หลังจากนี้โควต้าสิทธิ์ของลูกค้าจะถูกหักออกทันที</p>
                                </div>

                                {/* Summary cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Customer Summary */}
                                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">ข้อมูลลูกค้า</p>
                                        <div className="space-y-2">
                                            <p className="font-black text-slate-900 text-lg">{customerData?.model || '—'}</p>
                                            <p className="text-sm text-slate-500 font-bold">{customerData?.firstName} {customerData?.lastName}</p>
                                            <p className="text-xs font-mono text-slate-400">IMEI: {customerData?.imei || '—'}</p>
                                            <p className="text-xs font-mono text-slate-400">บัตรประชาชน: {customerData?.idCard || '—'}</p>
                                        </div>
                                    </div>

                                    {/* Quota to deduct */}
                                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">โควต้าที่จะถูกตัดออก</p>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center">
                                                <QuotaIcon name={selectedQuota?.icon || "Settings"} size={20} />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900">{selectedQuotaName || "—"}</p>
                                                <p className="text-sm text-orange-500 font-black">-1 สิทธิ์ (เหลือ {Math.max(0, (selectedQuota?.remaining || 1) - 1)}/{selectedQuota?.total || 1})</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Cost Summary */}
                                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">สรุปค่าใช้จ่าย</p>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between text-slate-500 font-medium">
                                                <span>ต้นทุนอะไหล่</span>
                                                <span className="font-black text-slate-800">฿{totalPartsCost.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-slate-500 font-medium">
                                                <span>Deductible (ลูกค้าจ่าย)</span>
                                                <span className="font-black text-blue-600">฿{Number(deductibleAmount || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between pt-2 border-t border-slate-100">
                                                <span className="font-black text-slate-900">รวมค่าใช้จ่ายทั้งสิ้น</span>
                                                <span className="font-black text-emerald-600 text-lg">฿{(totalPartsCost + Number(deductibleAmount || 0)).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Evidence summary */}
                                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">หลักฐานที่แนบ</p>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex items-center gap-2 text-slate-600 font-bold">
                                                <span className={preRepairImages.length > 0 ? 'text-emerald-500' : 'text-slate-300'}>✓</span>
                                                รูปก่อนซ่อม ({preRepairImages.length} ภาพ)
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-600 font-bold">
                                                <span className={paymentSlip ? 'text-emerald-500' : 'text-slate-300'}>✓</span>
                                                สลิปการโอน ({paymentSlip ? 'แนบแล้ว' : 'ยังไม่แนบ'})
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-600 font-bold">
                                                <span className={postRepairImages.length > 0 ? 'text-emerald-500' : 'text-slate-300'}>✓</span>
                                                รูปหลังซ่อม ({postRepairImages.length} ภาพ)
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Final confirm button */}
                                <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                                    <div>
                                        <p className="font-black text-emerald-900">ยืนยันเคลมและตัดโควต้าสิทธิ์</p>
                                        <p className="text-sm text-emerald-600 font-medium mt-0.5">หลังกดยืนยันแล้วไม่สามารถย้อนกลับได้</p>
                                    </div>
                                    <button
                                        onClick={handleConfirmClaim}
                                        disabled={saving}
                                        className="flex items-center gap-2 bg-emerald-600 text-white font-black px-10 py-4 rounded-2xl hover:bg-emerald-700 active:scale-95 transition-all shadow-xl shadow-emerald-200 text-base"
                                    >
                                        <FileCheck size={22} /> ยืนยันอนุมัติเคลม
                                    </button>
                                </div>
                            </div>
                        )}
                        {activeStep === 6 && claimDone && (
                            <div className="flex flex-col items-center justify-center py-16 animate-in zoom-in-90 duration-500">
                                <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-100">
                                    <FileCheck size={48} className="text-emerald-600" />
                                </div>
                                <h3 className="text-2xl font-black text-emerald-800 mb-2">เคลมสำเร็จ!</h3>
                                <p className="text-slate-500 font-medium text-center max-w-sm">ตัดเครดิตสิทธิ์เคลมลูกค้าเรียบร้อยแล้ว ระบบได้บันทึกประวัติการเคลมเรียบร้อยแล้ว</p>
                                <div className="mt-8 flex flex-wrap justify-center gap-4">
                                    <Link href="/admin/claims-history" className="flex items-center gap-2 bg-blue-600 text-white font-black px-8 py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-md">
                                        <ExternalLink size={18} /> ดูประวัติการเคลม
                                    </Link>
                                    <button onClick={() => { setShowNew(false); setClaimDone(false); setActiveStep(1); setCustomerData(null); setSearchQuery(''); setPostRepairImages([]); setParts([{ id: 1, name: '', partNumber: '', qty: 1, unitCost: 0 }]); setSavedClaimId(null); }} className="bg-slate-900 text-white font-black px-8 py-4 rounded-2xl hover:bg-emerald-600 transition-all shadow-md">
                                        + เปิดเคสใหม่
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bottom nav - hide when claim is done */}
                    {!claimDone && (
                        <div className="flex flex-col gap-3 border-t border-slate-200 bg-white p-3 shadow-[0_-4px_10px_rgba(0,0,0,0.02)] sm:flex-row sm:items-center sm:justify-between sm:p-5">
                            <button
                                onClick={() => activeStep === 1 ? setShowNew(false) : setActiveStep(Math.max(1, activeStep - 1))}
                                className="px-5 py-3 font-bold text-slate-500 hover:text-slate-900 text-sm hover:bg-slate-100 rounded-xl transition-all"
                            >
                                {activeStep === 1 ? "ยกเลิกการเคลม" : "← ย้อนกลับ"}
                            </button>

                            <div className="flex items-center justify-end gap-2 sm:gap-3">
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest hidden md:inline">Step {activeStep} of 6</span>

                                {/* Save Draft Button */}
                                {customerData && activeStep < 6 && (
                                    <button
                                        onClick={handleSaveDraft}
                                        disabled={saving}
                                        className="px-4 py-3 font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 hover:text-amber-700 rounded-xl text-sm transition-all hidden sm:block border border-amber-200"
                                    >
                                        {saving ? "กำลังบันทึก..." : "📥 บันทึกฉบับร่าง"}
                                    </button>
                                )}

                                {/* Step 6: trigger claim confirmation */}
                                {activeStep === 6 ? (
                                    <button
                                        onClick={handleConfirmClaim}
                                        disabled={saving}
                                        className="flex items-center gap-2 px-8 py-3 font-black rounded-xl text-sm bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-md"
                                    >
                                        <FileCheck size={18} /> ยืนยันและตัดสิทธิ์เคลม
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setActiveStep(Math.min(6, activeStep + 1))}
                                        disabled={activeStep === 1 && !customerData}
                                        className={`px-4 py-3 font-black rounded-xl text-sm transition-all shadow-md sm:px-8 ${(activeStep === 1 && !customerData) ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" : "bg-blue-600 text-white hover:bg-slate-900"}`}
                                    >
                                        ขั้นตอนถัดไป →
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-16">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                        <ClipboardList size={40} className="text-slate-300" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-xl font-black text-slate-700 mb-2">เริ่มสร้างรายการเคลมใหม่</h3>
                    <p className="font-medium text-slate-400 text-sm max-w-sm">คุณสามารถค้นหาข้อมูลกรมธรรม์ของลูกค้าเพื่อดำเนินการเบิกเคลมอะไหล่ได้อย่างรวดเร็ว</p>
                    <button
                        onClick={() => setShowNew(true)}
                        className="mt-8 bg-slate-900 text-white font-black px-8 py-4 rounded-xl text-sm hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 flex items-center gap-2"
                    >
                        <Plus size={18} /> เปิดเคสเคลมใหม่
                    </button>
                </div>
            )}

            {/* Notification Toast */}
            {notification && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-5 duration-300">
                    <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border ${notification.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' : notification.type === 'error' ? 'bg-red-600 border-red-500 text-white' : 'bg-slate-900 border-slate-800 text-white'}`}>
                        {notification.type === 'success' ? <CheckSquare size={20} /> : <AlertCircle size={20} />}
                        <span className="font-bold text-sm">{notification.msg}</span>
                    </div>
                </div>
            )}

            {/* Custom Confirm Modal */}
            {confirmModal?.show && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="animate-in zoom-in-95 w-full max-w-sm rounded-3xl bg-white p-5 text-center shadow-2xl duration-200 sm:p-8">
                        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <ClipboardList size={40} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">พบรายการที่เคยบันทึกไว้</h3>
                        <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">
                            เราพบรายการแจ้งเคลมเดิมของลูกค้ารายนี้ <br />
                            ค้างอยู่ที่ขั้นตอนที่ <span className="text-blue-600 font-bold">{confirmModal.draft.currentStep || 1}</span> จาก 6 <br />
                            คุณต้องการทำต่อจากเดิมหรือไม่?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    const draft = confirmModal.draft;
                                    setCurrentClaimId(draft._id);
                                    setActiveStep(draft.currentStep || 1);
                                    setVoidChecklist(draft.voidChecklist || voidChecklist);
                                    setPreRepairNote(draft.preRepairNote || "");
                                    setPreRepairImages(draft.preRepairImages || []);
                                    setDeductibleItem(draft.deductibleItem || "");
                                    setDeductibleDetail(draft.deductibleDetail || "");
                                    setDeductibleAmount(draft.deductibleAmount?.toString() || "");
                                    setPaymentSlip(draft.paymentSlip || null);
                                    if (draft.parts?.length > 0) setParts(draft.parts);
                                    setPostRepairImages(draft.postRepairImages || []);
                                    setPostRepairNote(draft.postRepairNote || "");
                                    setSelectedQuotaName(draft.consumedQuotaName || "");
                                    setConfirmModal(null);
                                }}
                                className="flex-1 bg-blue-600 text-white font-black py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                            >
                                ทำต่อรายการเดิม
                            </button>
                            <button
                                onClick={() => {
                                    if (customerData.coveragePlan?.quotas?.length > 0) {
                                        setSelectedQuotaName(customerData.coveragePlan.quotas[0].name);
                                        setDeductibleItem(`ค่าบริการ${customerData.coveragePlan.quotas[0].name}`);
                                    }
                                    setConfirmModal(null);
                                }}
                                className="flex-1 bg-slate-100 text-slate-600 font-black py-4 rounded-2xl hover:bg-slate-200 transition-all"
                            >
                                เริ่มใหม่
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ClaimsPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-32 text-gray-400">
                <Loader2 className="animate-spin mb-4" size={40} />
                <p className="text-sm font-black uppercase tracking-widest italic italic-thai-fix">Loading Claims System...</p>
            </div>
        }>
            <ClaimsContent />
        </Suspense>
    );
}
