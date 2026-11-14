"use client";

import React, { useEffect, useState, use } from "react";
import {
    User,
    ArrowLeft,
    Loader2,
    CheckCircle,
    AlertCircle,
    ChevronRight,
    Save,
    Printer,
    Store,
    ExternalLink
} from "lucide-react";
import Link from "next/link";
import { allowedNextStatuses, repairStatusLabel } from "@/lib/repair/status";
import { statusLabelForOutcome } from "@/lib/repair/workflow";
import type { RepairJobView, RepairPrintRequest } from "@/lib/repair/types";
import IntakePrint from "@/components/admin/repair/IntakePrint";
import QuotePrint from "@/components/admin/repair/QuotePrint";
import ReceiptPrint from "@/components/admin/repair/ReceiptPrint";
import HandoverPrint from "@/components/admin/repair/HandoverPrint";
import IntakeSection from "@/components/admin/repair/IntakeSection";
import CustodySection from "@/components/admin/repair/CustodySection";
import QuoteApprovalSection from "@/components/admin/repair/QuoteApprovalSection";
import PaymentsSection from "@/components/admin/repair/PaymentsSection";
import QcSection from "@/components/admin/repair/QcSection";
import HandoverSection from "@/components/admin/repair/HandoverSection";
import DeviceSection from "@/components/admin/repair/DeviceSection";
import PhotoGallerySection from "@/components/admin/repair/PhotoGallerySection";

/** Statuses where the technician writes down the inspection result for the quotation. */
const DIAGNOSIS_STATUSES = ["quoted", "waiting_approval"];

export default function RepairJobDetail({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const id = resolvedParams.id;

    const [job, setJob] = useState<RepairJobView | null>(null);
    const [loading, setLoading] = useState(true);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [statusNote, setStatusNote] = useState("");
    const [statusDiagnosis, setStatusDiagnosis] = useState("");
    
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

    // Print State: which document the hidden print area renders
    const [print, setPrint] = useState<RepairPrintRequest>({ mode: "intake" });

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
                // The server records who changed the status from the login session.
                body: JSON.stringify({ 
                    status: pendingStatus, 
                    statusNote: statusNote,
                    // The inspection result is saved with the move to quoted / waiting_approval.
                    ...(DIAGNOSIS_STATUSES.includes(pendingStatus) && statusDiagnosis.trim() !== (job?.diagnosticResult ?? "")
                        ? { diagnosticResult: statusDiagnosis.trim() }
                        : {}),
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
            } else {
                const err = await res.json().catch(() => ({}));
                alert(err.error || "เปลี่ยนสถานะไม่สำเร็จ");
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
                // totalPrice is computed on the server from these three values.
                body: JSON.stringify({ 
                    laborCost,
                    partsCost,
                    partsPurchaseCost,
                }),
            });
            if (res.ok) {
                const updatedJob = await res.json();
                setJob(updatedJob);
                setShowSuccessToast(true);
                setTimeout(() => setShowSuccessToast(false), 3000);
            } else {
                const err = await res.json().catch(() => ({}));
                alert(err.error || "บันทึกราคาไม่สำเร็จ");
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

    const openStatusModal = (status: string) => {
        setPendingStatus(status);
        setStatusDiagnosis(job?.diagnosticResult ?? "");
        setIsModalOpen(true);
    };

    const getStatusLabel = (status: string) => statusLabelForOutcome(status, status === "ready_pickup" ? job?.outcome : null);
    // The job's outcome belongs to its latest ready_pickup entry; earlier ones may have had another.
    const lastReadyIndex = job?.statusHistory?.map((h) => h.status).lastIndexOf("ready_pickup") ?? -1;

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

    const handlePrint = (request: RepairPrintRequest) => {
        setPrint(request);
        setTimeout(() => window.print(), 100);
    };

    // Section components report the job the API returned after a change.
    const handleSectionChanged = (updated: RepairJobView) => {
        setJob(updated);
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-32 text-gray-400">
            <Loader2 className="animate-spin mb-4" size={40} />
            <p className="text-sm font-black uppercase tracking-widest tracking-tighter">Loading data...</p>
        </div>
    );

    if (!job) return (
        <div className="flex flex-col items-center justify-center py-32 text-gray-400">
            <AlertCircle className="mb-4 opacity-50" size={60} />
            <p className="text-sm font-black uppercase tracking-widest tracking-tighter">Job not found</p>
            <Link href="/admin/repair/jobs" className="mt-4 text-[10px] font-black uppercase bg-slate-100 px-4 py-2 rounded-lg text-slate-500 hover:bg-slate-200 transition-all">Go Back</Link>
        </div>
    );

    const totalCalculate = Number(laborCost) + Number(partsCost);
    const profit = totalCalculate - Number(partsPurchaseCost);
    const hasPayments = (job.payments ?? []).some((payment) => !payment.voidedAt);
    const printDocuments: { mode: RepairPrintRequest["mode"]; label: string; ready: boolean; hint: string }[] = [
        { mode: "intake", label: "ใบรับซ่อม", ready: true, hint: "" },
        { mode: "quote", label: "ใบเสนอราคา", ready: (job.totalPrice ?? 0) > 0, hint: "บันทึกราคาเสนอลูกค้าก่อน" },
        { mode: "receipt", label: "ใบเสร็จรับเงิน", ready: hasPayments, hint: "บันทึกรายการในส่วน \"การรับเงิน\" ก่อน" },
        { mode: "handover", label: "ใบส่งมอบงาน", ready: Boolean(job.handover) || job.status === "ready_pickup", hint: "พิมพ์ได้เมื่องานรอรับเครื่องหรือส่งมอบแล้ว" },
    ];

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
            `}</style>

            {/* SHARED PRINTABLE AREA: hidden on screen, the only thing visible when printing */}
            <div id="printable-area" className="text-black bg-white">
                {print.mode === "intake" && <IntakePrint job={job} />}
                {print.mode === "quote" && <QuotePrint job={job} />}
                {print.mode === "receipt" && <ReceiptPrint job={job} paymentId={print.paymentId} />}
                {print.mode === "handover" && <HandoverPrint job={job} />}
            </div>

            {/* NORMAL UI VIEW */}
            <div className="no-print flex flex-col gap-4 border-b border-gray-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/admin/repair/jobs" className="w-8 h-8 bg-white rounded-lg shadow-sm border border-gray-100 flex items-center justify-center text-gray-400 hover:text-blue-600 transition-all">
                        <ArrowLeft size={16} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                             <h1 className="text-lg font-black text-slate-800 tracking-tight uppercase">{job.jobId}</h1>
                             <span className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest ${getStatusStyle(job.status)}`}>{getStatusLabel(job.status)}</span>
                        </div>
                    </div>
                </div>
                {/* One button per customer document; a disabled button says when it becomes available. */}
                <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                    {printDocuments.map((doc) => (
                        <button
                            key={doc.mode}
                            onClick={() => handlePrint({ mode: doc.mode })}
                            disabled={!doc.ready}
                            title={doc.ready ? `พิมพ์หรือบันทึกเป็น PDF: ${doc.label}` : doc.hint}
                            className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-2 rounded-lg font-bold text-[11px] hover:bg-slate-200 transition-all disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <Printer size={13} /> {doc.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-6 no-print">
                <div className="lg:col-span-8 space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                         <div className="flex items-center justify-between gap-2 mb-3">
                             <div className="flex items-center gap-2">
                                 {job.customer ? <User size={14} className="text-slate-400" /> : <Store size={14} className="text-amber-500" />}
                                 <span className="text-xs font-bold text-slate-500">{job.customer ? "ลูกค้า" : "เจ้าของเครื่อง"}</span>
                             </div>
                             {job.customer && (
                                 <Link href={`/admin/repair/customers/${job.customer._id}`} className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline">
                                     ประวัติ/แก้ไขข้อมูลลูกค้า <ExternalLink size={11} />
                                 </Link>
                             )}
                         </div>
                         {job.customer ? (
                             <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                                 <p className="text-base font-black text-slate-900">{job.customer.firstName} {job.customer.lastName}</p>
                                 <p className="text-xs font-bold text-blue-600">โทร {job.customer.phone}</p>
                                 {job.customer.lineId && <p className="text-xs font-bold text-emerald-600">LINE {job.customer.lineId}</p>}
                                 {job.customer.customerId && <p className="text-[11px] font-semibold text-slate-400">{job.customer.customerId}</p>}
                             </div>
                         ) : (
                             <>
                                 <p className="text-base font-black text-slate-900 tracking-tight">เครื่องของร้าน</p>
                                 <p className="text-[11px] font-semibold text-slate-500 mt-1">ไม่มีข้อมูลลูกค้า (สต็อกร้าน)</p>
                             </>
                         )}
                    </div>

                    <DeviceSection job={job} onChanged={handleSectionChanged} onPrint={handlePrint} />

                    {job.source === "pos" && (
                        <div className="bg-amber-50/60 rounded-2xl border border-amber-200 shadow-sm p-5">
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                <Store size={14} className="text-amber-600" />
                                <span className="text-sm font-bold text-amber-800">{job.ownerType === "store" ? "เครื่องของร้าน / ส่งจาก POS" : "ส่งจาก POS"}</span>
                            </div>
                            <dl className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                                <div className="min-w-0">
                                    <dt className="font-semibold text-slate-500">External Reference (POS)</dt>
                                    <dd className="font-bold text-slate-900 break-all">{job.externalRef || "-"}</dd>
                                </div>
                                <div className="min-w-0">
                                    <dt className="font-semibold text-slate-500">รหัสสินค้า (Product Code)</dt>
                                    <dd className="font-bold text-slate-900 break-all">{job.integration?.productCode || "-"}</dd>
                                </div>
                                <div className="min-w-0">
                                    <dt className="font-semibold text-slate-500">สาขาต้นทาง</dt>
                                    <dd className="font-bold text-slate-900 break-all">
                                        {job.integration?.branchCode || "-"}
                                        {job.integration?.branchId && <span className="block text-[11px] font-medium text-slate-500">{job.integration.branchId}</span>}
                                    </dd>
                                </div>
                                <div className="min-w-0">
                                    <dt className="font-semibold text-slate-500">ส่งโดย</dt>
                                    <dd className="font-bold text-slate-900 break-all">{job.integration?.clientName || "-"}</dd>
                                </div>
                            </dl>
                            {(job.integration?.imageUrls?.length ?? 0) > 0 && (
                                <div className="mt-4">
                                    <p className="text-xs font-semibold text-slate-500 mb-1">รูปจาก POS</p>
                                    <ul className="space-y-1 text-[11px]">
                                        {job.integration?.imageUrls?.map((url) => (
                                            <li key={url} className="break-all">
                                                {/^https?:\/\//i.test(url)
                                                    ? <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 underline">{url}</a>
                                                    : <span className="text-slate-600">{url}</span>}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Multi-branch repair sections, in workflow order. Each owns its own API calls. */}
                    <IntakeSection job={job} onChanged={handleSectionChanged} onPrint={handlePrint} />
                    <CustodySection job={job} onChanged={handleSectionChanged} onPrint={handlePrint} />
                    <QuoteApprovalSection job={job} onChanged={handleSectionChanged} onPrint={handlePrint} />
                    <PaymentsSection job={job} onChanged={handleSectionChanged} onPrint={handlePrint} />
                    <QcSection job={job} onChanged={handleSectionChanged} onPrint={handlePrint} />
                    <HandoverSection job={job} onChanged={handleSectionChanged} onPrint={handlePrint} />

                    <PhotoGallerySection job={job} onChanged={handleSectionChanged} onPrint={handlePrint} />

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                         <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 uppercase text-[10px] font-black tracking-widest text-slate-400">Workflow Timeline</div>
                         <div className="p-6 space-y-4">
                            {job.statusHistory?.map((h, i) => (
                                <div key={i} className="flex gap-4 group">
                                     <div className="flex-1 pb-4 border-b border-gray-50 last:border-0 font-bold">
                                          <span className="text-[10px] text-blue-600 underline">{i === lastReadyIndex ? getStatusLabel(h.status) : repairStatusLabel(h.status)}</span>
                                          <p className="text-xs text-slate-500 mt-1">&ldquo;{h.note || "No comments"}&rdquo;</p>
                                          <p className="text-[10px] font-medium text-slate-400 mt-1">
                                              {h.changedBy || "-"}{h.changedAt ? ` · ${new Date(h.changedAt).toLocaleString("th-TH")}` : ""}
                                          </p>
                                     </div>
                                </div>
                            )).reverse()}
                         </div>
                    </div>
                </div>

                {/* Sidebar ACTIONS */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-slate-900 rounded-2xl p-6 shadow-xl">
                        <h3 className="text-sm font-bold text-white mb-4">จัดการสถานะงาน</h3>
                        {allowedNextStatuses(job.status).length === 0 && (
                            <p className="mb-2 text-xs font-semibold text-slate-400">งานนี้ปิดแล้ว ไม่สามารถเปลี่ยนสถานะได้</p>
                        )}
                        <div className="grid grid-cols-1 gap-1">
                            {/* Only the transitions the server will accept, plus the current status. */}
                            {[job.status, ...allowedNextStatuses(job.status)].map((st: string) => {
                                const isActive = job.status === st;
                                return (
                                    <button 
                                        key={st} 
                                        disabled={isActive}
                                        onClick={() => openStatusModal(st)} 
                                        className={`flex items-center justify-between w-full px-4 py-3 rounded-xl transition-all group ${
                                            isActive 
                                            ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                                            : "bg-white/5 hover:bg-blue-600/20 text-slate-300"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            {isActive && <CheckCircle size={14} className="text-white animate-pulse" />}
                                            <span className="text-xs font-bold">
                                                {isActive ? getStatusLabel(st) : repairStatusLabel(st)} {isActive && "(สถานะปัจจุบัน)"}
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
                              <h4 className="text-sm font-bold text-slate-900">ราคาเสนอลูกค้าและกำไร</h4>
                         </div>
                         <div className="space-y-4">
                             <div className="space-y-1.5">
                                 <label className="text-xs font-semibold text-slate-500 ml-1">ค่าแรง (เก็บจากลูกค้า)</label>
                                 <input type="number" value={laborCost} onChange={(e) => setLaborCost(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-black focus:border-blue-500 outline-none transition-all" />
                             </div>
                             <div className="space-y-1.5">
                                 <label className="text-xs font-semibold text-slate-500 ml-1">ค่าอะไหล่ (ราคาขายลูกค้า)</label>
                                 <input type="number" value={partsCost} onChange={(e) => setPartsCost(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-black focus:border-blue-500 outline-none transition-all" />
                             </div>
                             <div className="space-y-1.5 pt-4 border-t border-slate-50">
                                 <label className="text-xs font-semibold text-red-500 ml-1">ต้นทุนอะไหล่ (ราคาที่ร้านซื้อมา)</label>
                                 <input type="number" value={partsPurchaseCost} onChange={(e) => setPartsPurchaseCost(Number(e.target.value))} className="w-full bg-red-50/20 border border-red-100 rounded-xl p-3 text-xs font-black focus:border-red-500 outline-none transition-all text-red-600" />
                                 <p className="text-[11px] text-slate-400 ml-1">ใช้คำนวณกำไรเท่านั้น ไม่แสดงในเอกสารลูกค้า</p>
                             </div>
                             <div className="pt-4 border-t border-slate-100 bg-slate-50 -mx-6 px-6 py-4 flex flex-col gap-2">
                                 <div className="flex items-center justify-between">
                                     <span className="text-xs font-semibold text-slate-500">ราคาเสนอลูกค้า (ค่าแรง + ค่าอะไหล่)</span>
                                     <span className="text-sm font-black text-slate-900">฿ {totalCalculate.toLocaleString()}</span>
                                 </div>
                                 <div className="flex items-center justify-between">
                                     <span className="text-xs font-semibold text-slate-500">กำไร</span>
                                     <span className={`text-lg font-black tracking-tighter ${profit >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                         ฿ {profit.toLocaleString()}
                                     </span>
                                 </div>
                             </div>
                         </div>
                         <button onClick={updatePrices} disabled={updatingPrice} className="w-full mt-6 py-4 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg">
                             {updatingPrice ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} บันทึกราคา
                         </button>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                         <h4 className="text-sm font-bold text-slate-900 border-b border-slate-50 pb-3 mb-6">การรับประกัน</h4>
                         <div className="space-y-4">
                             <div className="space-y-1.5">
                                 <label className="text-xs font-semibold text-slate-500 ml-1">รหัสสติกเกอร์รับประกัน (Void)</label>
                                 <input type="text" value={voidStickerCode} onChange={(e) => setVoidStickerCode(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-black outline-none focus:border-blue-500 uppercase" placeholder="เช่น V12345" />
                             </div>
                             <div className="grid grid-cols-2 gap-3">
                                 <div className="space-y-1.5">
                                     <label className="text-xs font-semibold text-slate-500 ml-1">วันเริ่มรับประกัน</label>
                                     <input type="date" value={warrantyStartDate} onChange={(e) => setWarrantyStartDate(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2 text-[10px] font-black" />
                                 </div>
                                 <div className="space-y-1.5">
                                     <label className="text-xs font-semibold text-slate-500 ml-1">วันหมดประกัน</label>
                                     <input type="date" value={warrantyExpireDate} onChange={(e) => setWarrantyExpireDate(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2 text-[10px] font-black" />
                                 </div>
                             </div>
                         </div>
                         <button onClick={updateWarranty} disabled={updatingWarranty} className="w-full mt-6 py-3 bg-slate-100 text-slate-500 hover:text-blue-600 transition-all rounded-xl text-sm font-bold flex items-center justify-center">
                             {updatingWarranty ? <Loader2 size={12} className="animate-spin" /> : "บันทึกการรับประกัน"}
                         </button>
                    </div>
                </div>
            </div>

            {/* Modal & Toast */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 no-print bg-slate-900/40 backdrop-blur-[2px]">
                    <div className="relative w-full max-w-md space-y-6 rounded-3xl bg-white p-5 shadow-2xl sm:p-8">
                        <div className="text-center">
                            <h2 className="text-base font-bold text-slate-800">เปลี่ยนสถานะงาน</h2>
                            <p className="text-xs text-slate-500 font-semibold mt-1">เปลี่ยนเป็น: <span className="text-blue-600 underline">&ldquo;{repairStatusLabel(pendingStatus || "")}&rdquo;</span></p>
                        </div>
                        {pendingStatus && DIAGNOSIS_STATUSES.includes(pendingStatus) && (
                            <div className="space-y-2">
                                <label className="block space-y-1">
                                    <span className="text-xs font-bold text-blue-700">ผลตรวจเช็ก (แสดงในใบเสนอราคา)</span>
                                    <textarea rows={3} maxLength={4000} className="w-full bg-blue-50/40 border border-blue-100 rounded-xl py-3 px-4 text-xs font-bold text-gray-800 outline-none placeholder:text-gray-300" placeholder="เช่น จอเสีย ต้องเปลี่ยนชุดจอ" value={statusDiagnosis} onChange={(e) => setStatusDiagnosis(e.target.value)} />
                                </label>
                                <p className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500">
                                    ราคาเสนอ: ค่าแรง ฿{(job.laborCost ?? 0).toLocaleString()} + ค่าอะไหล่ ฿{(job.partsCost ?? 0).toLocaleString()} = ฿{(job.totalPrice ?? 0).toLocaleString()}
                                    {pendingStatus === "waiting_approval" && <span className="block mt-1">เมื่อลูกค้าตอบ ให้บันทึกอนุมัติ/ไม่อนุมัติในส่วน &ldquo;อนุมัติราคาจากลูกค้า&rdquo;</span>}
                                </p>
                            </div>
                        )}
                        <textarea rows={3} className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-xs font-bold text-gray-800 outline-none placeholder:text-gray-300" placeholder="หมายเหตุ (บันทึกในประวัติงาน)..." value={statusNote} onChange={(e) => setStatusNote(e.target.value)} />
                        <div className="flex gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl text-sm font-bold">ยกเลิก</button>
                            <button onClick={confirmUpdateStatus} disabled={updatingStatus} className="flex-[2] py-3 bg-slate-900 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                                {updatingStatus ? <Loader2 className="animate-spin" size={16} /> : "ยืนยันเปลี่ยนสถานะ"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showSuccessToast && (
                <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-10">
                    <CheckCircle size={18} />
                    <p className="text-sm font-bold">บันทึกสำเร็จ</p>
                </div>
            )}
        </div>
    );
}
