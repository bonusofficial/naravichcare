"use client";

import React, { useEffect, useState, use, useRef } from "react";
import { 
    Wrench, 
    User, 
    Smartphone, 
    History, 
    ArrowLeft, 
    Clock, 
    Loader2, 
    CheckCircle, 
    Settings,
    AlertCircle,
    ChevronRight,
    Search,
    Edit2,
    Save,
    MapPin,
    Phone,
    Printer,
    Pencil,
    X,
    CreditCard,
    ShieldCheck,
    ImagePlus,
    MinusCircle,
    Receipt,
    Upload
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RepairJobDetail({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const id = resolvedParams.id;
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [job, setJob] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [statusNote, setStatusNote] = useState("");
    
    // Pricing States
    const [laborCost, setLaborCost] = useState(0);
    const [partsCost, setPartsCost] = useState(0);
    const [partsPurchaseCost, setPartsPurchaseCost] = useState(0);
    const [updatingPrice, setUpdatingPrice] = useState(false);

    // Warranty States
    const [warrantyStartDate, setWarrantyStartDate] = useState("");
    const [warrantyExpireDate, setWarrantyExpireDate] = useState("");
    const [voidStickerCode, setVoidStickerCode] = useState("");
    const [updatingWarranty, setUpdatingWarranty] = useState(false);

    // Photo States
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [photoType, setPhotoType] = useState<"before" | "after">("before");

    // Print State
    const [printMode, setPrintMode] = useState<"quote" | "receipt">("quote");

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pendingStatus, setPendingStatus] = useState<string | null>(null);
    const [showSuccessToast, setShowSuccessToast] = useState(false);

    useEffect(() => {
        fetchJob();
    }, [id]);

    const fetchJob = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/repair/jobs/${id}`);
            const data = await res.json();
            if (data._id) {
                setJob(data);
                setLaborCost(data.laborCost || 0);
                setPartsCost(data.partsCost || 0);
                setPartsPurchaseCost(data.partsPurchaseCost || 0);
                setVoidStickerCode(data.voidStickerCode || "");
                if (data.warrantyStartDate) setWarrantyStartDate(new Date(data.warrantyStartDate).toISOString().split('T')[0]);
                if (data.warrantyExpireDate) setWarrantyExpireDate(new Date(data.warrantyExpireDate).toISOString().split('T')[0]);
            }
        } catch (error) {
            console.error("Fetch Job Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const confirmUpdateStatus = async () => {
        if (!pendingStatus) return;
        setUpdatingStatus(true);
        try {
            const res = await fetch(`/api/admin/repair/jobs/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    status: pendingStatus, 
                    statusNote: statusNote,
                    adminUsername: "Super Admin" 
                }),
            });
            if (res.ok) {
                const updatedJob = await res.json();
                setJob(updatedJob);
                setStatusNote("");
                setIsModalOpen(false);
                setPendingStatus(null);
                setShowSuccessToast(true);
                setTimeout(() => setShowSuccessToast(false), 3000);
            }
        } catch (error) {
            console.error("Update Status Error:", error);
        } finally {
            setUpdatingStatus(false);
        }
    };

    const updatePrices = async () => {
        setUpdatingPrice(true);
        try {
            const res = await fetch(`/api/admin/repair/jobs/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    laborCost,
                    partsCost,
                    partsPurchaseCost,
                    totalPrice: Number(laborCost) + Number(partsCost)
                }),
            });
            if (res.ok) {
                const updatedJob = await res.json();
                setJob(updatedJob);
                setShowSuccessToast(true);
                setTimeout(() => setShowSuccessToast(false), 3000);
            }
        } catch (error) {
            console.error("Update Price Error:", error);
        } finally {
            setUpdatingPrice(false);
        }
    };

    const updateWarranty = async () => {
        setUpdatingWarranty(true);
        try {
            const res = await fetch(`/api/admin/repair/jobs/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    warrantyStartDate,
                    warrantyExpireDate,
                    voidStickerCode
                }),
            });
            if (res.ok) {
                const updatedJob = await res.json();
                setJob(updatedJob);
                setShowSuccessToast(true);
                setTimeout(() => setShowSuccessToast(false), 3000);
            }
        } catch (error) {
            console.error("Update Warranty Error:", error);
        } finally {
            setUpdatingWarranty(false);
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingPhoto(true);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64 = reader.result;
                const field = photoType === "before" ? "photosBefore" : "photosAfter";
                const currentPhotos = job[field] || [];
                
                const res = await fetch(`/api/admin/repair/jobs/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        [field]: [...currentPhotos, base64]
                    }),
                });

                if (res.ok) {
                    const updatedJob = await res.json();
                    setJob(updatedJob);
                    setShowSuccessToast(true);
                    setTimeout(() => setShowSuccessToast(false), 3000);
                }
            };
        } catch (error) {
            console.error("Upload Photo Error:", error);
        } finally {
            setUploadingPhoto(false);
        }
    };

    const openStatusModal = (status: string) => {
        setPendingStatus(status);
        setIsModalOpen(true);
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "pending": return "รอตรวจเช็ก";
            case "checking": return "กำลังเช็กอาการ";
            case "quoted": return "เสนอราคาแล้ว";
            case "waiting_approval": return "รออนุมัติ";
            case "in_progress": return "กำลังซ่อม";
            case "waiting_parts": return "รออะไหล่";
            case "testing": return "ตรวจสอบงานซ่อม";
            case "ready_pickup": return "ซ่อมเสร็จ/รอรับคืน";
            case "completed": return "รับเครื่องคืนแล้ว";
            case "cancelled": return "ยกเลิก";
            default: return status;
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "pending": return "bg-gray-100 text-gray-600 border-gray-200";
            case "checking": return "bg-amber-50 text-amber-600 border-amber-200";
            case "in_progress": return "bg-purple-50 text-purple-600 border-purple-200";
            case "ready_pickup": return "bg-emerald-50 text-emerald-600 border-emerald-200";
            case "completed": return "bg-blue-50 text-blue-600 border-blue-200";
            case "cancelled": return "bg-red-50 text-red-600 border-red-200";
            default: return "bg-gray-50 text-gray-500 border-gray-100";
        }
    };

    const handlePrint = (mode: "quote" | "receipt") => {
        setPrintMode(mode);
        setTimeout(() => window.print(), 100);
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-32 text-gray-400">
            <Loader2 className="animate-spin mb-4" size={40} />
            <p className="text-sm font-black uppercase tracking-widest italic tracking-tighter">Loading data...</p>
        </div>
    );

    if (!job) return (
        <div className="flex flex-col items-center justify-center py-32 text-gray-400">
            <AlertCircle className="mb-4 opacity-50" size={60} />
            <p className="text-sm font-black uppercase tracking-widest italic tracking-tighter">Job not found</p>
            <Link href="/admin/repair/jobs" className="mt-4 text-[10px] font-black uppercase bg-slate-100 px-4 py-2 rounded-lg text-slate-500 hover:bg-slate-200 transition-all">Go Back</Link>
        </div>
    );

    const totalCalculate = Number(laborCost) + Number(partsCost);
    const profit = totalCalculate - Number(partsPurchaseCost);

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-5 duration-700">
            {/* Global Print Resets */}
            <style jsx global>{`
                @media print {
                    body * { visibility: hidden !important; }
                    #printable-area, #printable-area * { visibility: visible !important; }
                    #printable-area { 
                        display: block !important;
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        background: white !important;
                        padding: 1.5cm !important;
                    }
                    html, body { 
                        margin: 0 !important; 
                        padding: 0 !important; 
                        overflow: visible !important;
                    }
                    @page { margin: 0; size: A4; }
                }
                #printable-area { display: none; }
                .italic-thai-fix { font-style: italic; }
            `}</style>

            {/* Hidden File Input */}
            <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/*" />

            {/* SHARED PRINTABLE AREA */}
            <div id="printable-area" className="text-black bg-white">
                {/* Header Section */}
                <div className="flex justify-between items-start border-b-4 border-slate-900 pb-6 mb-8 text-black">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                             <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                                 <Wrench size={24} />
                             </div>
                             <h1 className="text-3xl font-black tracking-tighter italic">NAVAVICH CARE</h1>
                        </div>
                        <p className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-500">Service Center & Claims Management</p>
                        <div className="flex flex-col gap-1 mt-4 text-[11px] font-bold text-slate-700">
                             <div className="flex items-center gap-2"><MapPin size={12}/> กรุงเทพมหานคร (Bangkok, Thailand)</div>
                             <div className="flex items-center gap-2"><Phone size={12}/> 0XX-XXX-XXXX | LINE: @navavich_care</div>
                        </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                        <div className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black text-3xl mb-3 italic">
                             {printMode === "receipt" ? "RECEIPT" : (job.totalPrice > 0 ? "QUOTATION" : "JOB SHEET")}
                        </div>
                        <div className="space-y-1">
                             <p className="text-[14px] font-black uppercase text-black">NO: <span className="text-blue-600">{job.jobId}</span></p>
                             <p className="text-[10px] font-bold text-slate-400 uppercase italic whitespace-nowrap">Date: {new Date().toLocaleString('th-TH')}</p>
                        </div>
                    </div>
                </div>

                {/* Customer & Device */}
                <div className="grid grid-cols-2 gap-6 mb-8 text-black">
                    <div className="border-2 border-slate-100 rounded-2xl p-6 bg-slate-50/20">
                         <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2 italic text-blue-600">CUSTOMER INFO</h3>
                         <p className="text-lg font-black text-slate-900 uppercase tracking-tight">{job.customer?.firstName} {job.customer?.lastName}</p>
                         <p className="text-[11px] font-bold text-slate-600 mt-1">TEL: {job.customer?.phone}</p>
                    </div>
                    <div className="border-2 border-slate-100 rounded-2xl p-6 bg-slate-50/20">
                         <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2 italic text-blue-600">DEVICE DETAILS</h3>
                         <p className="text-lg font-black text-slate-900 uppercase tracking-tight">{job.brand} {job.deviceModel}</p>
                         <p className="text-[11px] font-bold text-slate-700 italic mt-1">S/N: {job.imei || "Not Found"}</p>
                    </div>
                </div>

                {/* Content Table */}
                <div className="border-2 border-slate-900 rounded-2xl overflow-hidden mb-8 text-black bg-white">
                    <table className="w-full text-left text-[12px]">
                         <thead className="bg-slate-900 text-white uppercase font-black italic">
                             <tr>
                                 <th className="px-6 py-4">Description / รายการแจ้ง</th>
                                 <th className="px-6 py-4 text-right">Amount / จำนวนเงิน</th>
                             </tr>
                         </thead>
                         <tbody className="font-bold text-slate-800 italic">
                             <tr className="border-b border-slate-100">
                                 <td className="px-6 py-6">
                                     <p className="text-slate-900 uppercase tracking-tight">Reported Problem: {job.reportedSymptom}</p>
                                     {printMode === "receipt" && (
                                         <p className="text-[10px] text-emerald-600 mt-2">Status: Repair Completed Successfully</p>
                                     )}
                                 </td>
                                 <td className="px-6 py-6 text-right">
                                     {job.totalPrice > 0 ? "฿ " + job.totalPrice.toLocaleString() : "-"}
                                 </td>
                             </tr>
                             {job.totalPrice > 0 && (
                                 <>
                                     <tr className="border-b border-slate-100 text-[10px] text-slate-400">
                                         <td className="px-6 py-3 shrink-0">Spare Parts & Service Labor (รวมอะไหล่และค่าแรง)</td>
                                         <td className="px-6 py-3 text-right">฿ {job.totalPrice.toLocaleString()}</td>
                                     </tr>
                                     <tr className="bg-slate-50 text-slate-900 text-2xl font-black">
                                         <td className="px-6 py-8">TOTAL AMOUNT (ราคาสุทธิ)</td>
                                         <td className="px-6 py-8 text-right underline decoration-double decoration-slate-900 text-black">฿ {job.totalPrice.toLocaleString()}</td>
                                     </tr>
                                 </>
                             )}
                         </tbody>
                    </table>
                </div>

                {/* Warranty Section for Receipt */}
                {printMode === "receipt" && job.warrantyExpireDate && (
                    <div className="mb-10 p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-blue-50/30 text-black">
                         <div className="flex items-center gap-3 mb-3">
                              <ShieldCheck size={20} className="text-blue-600" />
                              <h4 className="text-sm font-black text-slate-900 uppercase italic">Warranty Information / รายละเอียดการรับประกัน</h4>
                         </div>
                         <div className="grid grid-cols-2 gap-4 text-[11px] font-bold italic">
                              <p className="text-slate-600">WARRANTY EXPIRES: <span className="text-red-600 underline">{new Date(job.warrantyExpireDate).toLocaleDateString('th-TH')}</span></p>
                              <p className="text-slate-600 text-right">VOID CODE: <span className="text-blue-600">{job.voidStickerCode || "-"}</span></p>
                         </div>
                         <p className="text-[9px] text-slate-400 mt-4 leading-relaxed font-medium">
                              * การรับประกันครอบคลุมเฉพาะอาการเดิมที่แจ้งซ่อมเท่านั้น หาก Void Sticker ฉีกขาดหรือตัวเครื่องโดนความชื้น ประกันจะสิ้นสุดทันที
                         </p>
                    </div>
                )}

                {/* Signature Section */}
                <div className="grid grid-cols-2 gap-32 pt-16 border-t-2 border-slate-900 mt-auto text-black bg-white">
                    <div className="text-center space-y-6">
                         <div className="h-12 border-b-2 border-slate-300 w-full"></div>
                         <p className="text-[11px] font-black uppercase italic tracking-widest text-slate-400">Customer Signature / ลูกค้า</p>
                    </div>
                    <div className="text-center space-y-6">
                         <div className="h-12 border-b-2 border-slate-300 w-full relative flex items-center justify-center">
                              <span className="text-blue-600/10 font-black text-3xl uppercase tracking-[0.5em] absolute rotate-[-15deg]">NAVAVICH</span>
                         </div>
                         <p className="text-[11px] font-black uppercase italic tracking-widest text-slate-400">Authorized Signature / เจ้าหน้าที่</p>
                    </div>
                </div>
            </div>

            {/* NORMAL UI VIEW */}
            <div className="flex items-center justify-between no-print border-b border-gray-100 pb-5">
                <div className="flex items-center gap-4">
                    <Link href="/admin/repair/jobs" className="w-8 h-8 bg-white rounded-lg shadow-sm border border-gray-100 flex items-center justify-center text-gray-400 hover:text-blue-600 transition-all">
                        <ArrowLeft size={16} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                             <h1 className="text-lg font-black text-slate-800 tracking-tight uppercase italic">{job.jobId}</h1>
                             <span className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest ${getStatusStyle(job.status)}`}>{getStatusLabel(job.status)}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => handlePrint("quote")} className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2">
                        <Printer size={14} /> พิมพ์ใบซ่อม/เสนอราคา
                    </button>
                    {job.status === "completed" && (
                        <button onClick={() => handlePrint("receipt")} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg flex items-center gap-2">
                            <Receipt size={14} /> พิมพ์ใบเสร็จ/ส่งงาน
                        </button>
                    )}
                </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-6 no-print">
                <div className="lg:col-span-8 space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 transition-all hover:border-slate-300">
                             <div className="flex items-center gap-2 mb-4">
                                 <Smartphone size={14} className="text-slate-400" />
                                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Device Info</span>
                             </div>
                             <p className="text-base font-black text-slate-900 uppercase italic tracking-tight">{job.brand} {job.deviceModel}</p>
                             <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase italic tracking-tighter opacity-80">IMEI: {job.imei || "Not Found"}</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 transition-all hover:border-slate-300">
                             <div className="flex items-center gap-2 mb-4">
                                 <User size={14} className="text-slate-400" />
                                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</span>
                             </div>
                             <p className="text-base font-black text-slate-900 uppercase italic tracking-tight">{job.customer?.firstName} {job.customer?.lastName}</p>
                             <p className="text-[10px] font-bold text-blue-600 mt-1 uppercase italic tracking-tighter opacity-80">TEL: {job.customer?.phone}</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 italic">
                         <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2 underline decoration-red-100 underline-offset-4">
                             <AlertCircle size={14} /> Reported Symptom
                         </h4>
                         <p className="text-lg font-bold text-slate-800 leading-relaxed indent-4 underline decoration-slate-100">"{job.reportedSymptom}"</p>
                    </div>

                    {/* PHOTO GALLERY */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="bg-slate-900 px-6 py-3 flex items-center justify-between">
                             <div className="flex items-center gap-2 text-white">
                                  <ImagePlus size={14} className="text-blue-400" />
                                  <span className="text-[10px] font-black uppercase tracking-widest italic">Photo Gallery (Before/After)</span>
                             </div>
                             {uploadingPhoto && <Loader2 size={12} className="animate-spin text-blue-400" />}
                        </div>
                        <div className="p-6">
                             {/* Before Repair */}
                             <h5 className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic mb-3">🛠️ รูปภาพก่อนซ่อม (Before)</h5>
                             <div className="grid grid-cols-5 gap-3 mb-6">
                                 {job.photosBefore?.map((p: string, i: number) => (
                                     <div key={i} className="aspect-square bg-slate-50 border border-slate-100 rounded-xl overflow-hidden relative group">
                                         <img src={p} className="w-full h-full object-cover" alt="Before" />
                                     </div>
                                 ))}
                                 {(job.photosBefore || []).length < 5 && (
                                     <button onClick={() => { setPhotoType("before"); fileInputRef.current?.click(); }} className="aspect-square bg-slate-50 border-2 border-slate-200 border-dashed rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-500 transition-all">
                                          <Upload size={16} />
                                          <span className="text-[8px] font-black uppercase mt-1 tracking-tighter">Upload</span>
                                     </button>
                                 )}
                             </div>

                             {/* After Repair */}
                             <h5 className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic mb-3">✅ รูปภาพหลังซ่อม (After)</h5>
                             <div className="grid grid-cols-5 gap-3">
                                 {job.photosAfter?.map((p: string, i: number) => (
                                     <div key={i} className="aspect-square bg-slate-50 border border-slate-100 rounded-xl overflow-hidden relative group">
                                         <img src={p} className="w-full h-full object-cover" alt="After" />
                                     </div>
                                 ))}
                                 {(job.photosAfter || []).length < 5 && (
                                     <button onClick={() => { setPhotoType("after"); fileInputRef.current?.click(); }} className="aspect-square bg-slate-50 border-2 border-slate-200 border-dashed rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-emerald-600 hover:border-emerald-500 transition-all">
                                          <Upload size={16} />
                                          <span className="text-[8px] font-black uppercase mt-1 tracking-tighter">Upload</span>
                                     </button>
                                 )}
                             </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                         <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 uppercase text-[10px] font-black tracking-widest italic text-slate-400">Workflow Timeline</div>
                         <div className="p-6 space-y-4">
                            {job.statusHistory?.map((h: any, i: number) => (
                                <div key={i} className="flex gap-4 group">
                                     <div className="flex-1 pb-4 border-b border-gray-50 last:border-0 italic font-bold">
                                          <span className="text-[10px] text-blue-600 underline">{getStatusLabel(h.status)}</span>
                                          <p className="text-xs text-slate-500 mt-1">"{h.note || "No comments"}"</p>
                                     </div>
                                </div>
                            )).reverse()}
                         </div>
                    </div>
                </div>

                {/* Sidebar ACTIONS */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-slate-900 rounded-2xl p-6 shadow-xl">
                        <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] italic mb-4">Management Controls</h3>
                        <div className="grid grid-cols-1 gap-1">
                            {["checking", "quoted", "in_progress", "ready_pickup", "completed", "cancelled"].map((st) => {
                                const isActive = job.status === st;
                                return (
                                    <button 
                                        key={st} 
                                        onClick={() => openStatusModal(st)} 
                                        className={`flex items-center justify-between w-full px-4 py-3 rounded-xl transition-all group ${
                                            isActive 
                                            ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                                            : "bg-white/5 hover:bg-blue-600/20 text-slate-300"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            {isActive && <CheckCircle size={14} className="text-white animate-pulse" />}
                                            <span className="text-[10px] font-black uppercase tracking-tight">
                                                {getStatusLabel(st)} {isActive && "(CURRENT)"}
                                            </span>
                                        </div>
                                        <ChevronRight size={14} className={isActive ? "text-white/50" : "text-slate-500 group-hover:text-blue-400"} />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm p-6 overflow-hidden">
                         <div className="flex items-center justify-between mb-6 border-b border-slate-50 pb-3">
                              <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest italic">Quote & Profitability</h4>
                         </div>
                         <div className="space-y-4">
                             <div className="space-y-1.5">
                                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic leading-none ml-1">Labor Fee</label>
                                 <input type="number" value={laborCost} onChange={(e) => setLaborCost(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-black italic focus:border-blue-500 outline-none transition-all" />
                             </div>
                             <div className="space-y-1.5">
                                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic leading-none ml-1">Parts Sale</label>
                                 <input type="number" value={partsCost} onChange={(e) => setPartsCost(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-black italic focus:border-blue-500 outline-none transition-all" />
                             </div>
                             <div className="space-y-1.5 pt-4 border-t border-slate-50">
                                 <label className="text-[9px] font-black text-red-400 uppercase tracking-widest italic leading-none ml-1">Purchase Cost (Net)</label>
                                 <input type="number" value={partsPurchaseCost} onChange={(e) => setPartsPurchaseCost(Number(e.target.value))} className="w-full bg-red-50/20 border border-red-100 rounded-xl p-3 text-xs font-black italic focus:border-red-500 outline-none transition-all text-red-600" />
                             </div>
                             <div className="pt-4 border-t border-slate-100 bg-slate-50 -mx-6 px-6 py-4 flex flex-col gap-2">
                                 <div className="flex items-center justify-between">
                                     <span className="text-[10px] font-black text-slate-400 uppercase italic">Revenue</span>
                                     <span className="text-sm font-black text-slate-900 italic">฿ {totalCalculate.toLocaleString()}</span>
                                 </div>
                                 <div className="flex items-center justify-between">
                                     <span className="text-[10px] font-black text-slate-400 uppercase italic underline decoration-blue-100">PROFIT</span>
                                     <span className={`text-lg font-black italic tracking-tighter ${profit >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                         ฿ {profit.toLocaleString()}
                                     </span>
                                 </div>
                             </div>
                         </div>
                         <button onClick={updatePrices} disabled={updatingPrice} className="w-full mt-6 py-4 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg">
                             {updatingPrice ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Update & Analyze
                         </button>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                         <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest italic border-b border-slate-50 pb-3 mb-6">Warranty Control</h4>
                         <div className="space-y-4">
                             <input type="text" value={voidStickerCode} onChange={(e) => setVoidStickerCode(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-black italic outline-none focus:border-blue-500 uppercase" placeholder="VOID CODE" />
                             <div className="grid grid-cols-2 gap-3">
                                 <input type="date" value={warrantyStartDate} onChange={(e) => setWarrantyStartDate(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2 text-[10px] font-black" />
                                 <input type="date" value={warrantyExpireDate} onChange={(e) => setWarrantyExpireDate(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2 text-[10px] font-black" />
                             </div>
                         </div>
                         <button onClick={updateWarranty} disabled={updatingWarranty} className="w-full mt-6 py-3 bg-slate-100 text-slate-400 hover:text-blue-600 transition-all rounded-xl text-[9px] font-black uppercase tracking-widest font-black italic tracking-widest">
                             {updatingWarranty ? <Loader2 size={12} className="animate-spin" /> : "Save Warranty Status"}
                         </button>
                    </div>
                </div>
            </div>

            {/* Modal & Toast */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 no-print bg-slate-900/40 backdrop-blur-[2px]">
                    <div className="bg-white rounded-3xl w-full max-w-md relative shadow-2xl p-8 space-y-6">
                        <div className="text-center">
                            <h2 className="text-base font-black text-slate-800 uppercase tracking-tighter italic">Workflow Update</h2>
                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 italic">Moving task to: <span className="text-blue-600 underline">"{getStatusLabel(pendingStatus || "")}"</span></p>
                        </div>
                        <textarea rows={3} className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-xs font-bold text-gray-800 outline-none italic placeholder:text-gray-300" placeholder="Notes for history..." value={statusNote} onChange={(e) => setStatusNote(e.target.value)} />
                        <div className="flex gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest">Cancel</button>
                            <button onClick={confirmUpdateStatus} disabled={updatingStatus} className="flex-[2] py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                {updatingStatus ? <Loader2 className="animate-spin" size={16} /> : "Update Status"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showSuccessToast && (
                <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-10">
                    <CheckCircle size={18} />
                    <p className="text-[10px] font-black uppercase tracking-widest">Action Success!</p>
                </div>
            )}
        </div>
    );
}
