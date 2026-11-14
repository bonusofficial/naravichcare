"use client";

import React, { useState, useEffect } from "react";
import { 
    Search, 
    UserPlus, 
    Smartphone, 
    ClipboardList, 
    ShieldCheck, 
    Clock, 
    ChevronRight, 
    Loader2, 
    CheckCircle2,
    Save,
    MapPin,
    HardDrive,
    History,
    Wrench,
    Lock
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DATA_BACKUP, DEVICE_TYPES, DEVICE_TYPE_LABELS, type DataBackupStatus } from "@/lib/repair/options";
import { statusLabelForOutcome } from "@/lib/repair/workflow";
import { formatDateTime, fromDateTimeLocal } from "@/components/admin/repair/format";
import { AccessoriesInput, TechnicianSelect } from "@/components/admin/repair/DeviceInputs";
import NoBranchNotice from "@/components/admin/repair/NoBranchNotice";

/** A branch from /api/admin/repair/branches (only branches the user may work in). */
interface ScopedBranch {
    _id: string;
    name: string;
}

/** A match from /api/admin/repair/customers?phone=... */
interface FoundCustomer {
    _id: string;
    customerId?: string;
    firstName: string;
    lastName: string;
    phone?: string;
    lineId?: string;
}

/** A past job from /api/admin/repair/customers/[id] (jobs in the user's branches only). */
interface PastJob {
    _id: string;
    jobId: string;
    status: string;
    outcome?: string;
    brand: string;
    deviceModel: string;
    receivedAt: string;
}

const fieldClass = "w-full bg-slate-50 border border-slate-100 rounded-lg py-2 px-3 text-xs font-bold text-gray-800 outline-none focus:bg-white focus:border-blue-500 transition-all";
const labelClass = "text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1";

export default function NewRepairJob() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    
    // Customer Search State
    const [searchPhone, setSearchPhone] = useState("");
    const [searchingCustomer, setSearchingCustomer] = useState(false);
    const [customer, setCustomer] = useState<FoundCustomer | null>(null);
    const [pastJobs, setPastJobs] = useState<PastJob[] | null>(null);

    // Form State
    const [isNewCustomer, setIsNewCustomer] = useState(false);
    const [formData, setFormData] = useState({
        deviceType: "Smartphone",
        brand: "",
        deviceModel: "",
        serialNumber: "",
        imei: "",
        color: "",
        deviceCondition: "",
        accessories: [] as string[],
        jobType: "repair",
        reportedSymptom: "",
        internalNotes: "",
    });
    // Receiving branch, promised completion time and the customer's choice for the data on the device.
    const [branches, setBranches] = useState<ScopedBranch[]>([]);
    // True once the branch list has loaded; an empty list then means the account has no branch.
    const [branchesLoaded, setBranchesLoaded] = useState(false);
    const [branchId, setBranchId] = useState("");
    const [appointment, setAppointment] = useState("");
    const [dataBackupStatus, setDataBackupStatus] = useState<DataBackupStatus | "">("");
    const [assignedTechnician, setAssignedTechnician] = useState("");
    const noBranch = branchesLoaded && branches.length === 0;

    useEffect(() => {
        fetch("/api/admin/repair/branches")
            .then((res) => (res.ok ? res.json() : null))
            .then((data: { branches?: ScopedBranch[] } | null) => {
                const list = data?.branches ?? [];
                setBranches(list);
                if (list.length === 1) setBranchId(list[0]._id);
                if (data) setBranchesLoaded(true);
            })
            .catch(() => setBranches([]));
    }, []);

    const handleSearchCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchPhone) return;
        setSearchingCustomer(true);
        try {
            const res = await fetch(`/api/admin/repair/customers?phone=${encodeURIComponent(searchPhone.trim())}`, { cache: "no-store" });
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                setCustomer(data[0]);
                setIsNewCustomer(false);
                setStep(2);
                // Show the customer's earlier jobs so staff can see the repair history at intake.
                setPastJobs(null);
                fetch(`/api/admin/repair/customers/${data[0]._id}`, { cache: "no-store" })
                    .then((r) => (r.ok ? r.json() : null))
                    .then((detail: { jobs?: PastJob[] } | null) => setPastJobs(detail?.jobs ?? []))
                    .catch(() => setPastJobs([]));
            } else {
                setCustomer(null);
                setIsNewCustomer(true);
                setStep(1.5);
            }
        } catch (error) {
            console.error("Search Customer Error:", error);
        } finally {
            setSearchingCustomer(false);
        }
    };

    const [newCustomer, setNewCustomer] = useState({
        firstName: "",
        lastName: "",
        phone: "",
        lineId: "",
        address: "",
        notes: "",
    });

    const handleCreateJob = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.brand || !formData.deviceModel || !formData.reportedSymptom) {
            alert("กรุณากรอกข้อมูล แบรนด์, รุ่น และอาการเสียให้ครบถ้วน");
            return;
        }
        if (!branchId) {
            alert(noBranch
                ? "บัญชีนี้ยังไม่ได้ผูกสาขา จึงเปิดใบรับซ่อมไม่ได้ ให้ Super Admin ผูกสาขาให้ที่เมนู \"จัดการแอดมิน\" ก่อน"
                : "กรุณาเลือกสาขารับงาน");
            return;
        }
        if (!dataBackupStatus) {
            alert("กรุณาเลือกสถานะข้อมูลในเครื่องลูกค้า");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ...formData,
                customer: customer?._id,
                newCustomer: isNewCustomer ? { ...newCustomer, phone: searchPhone.trim() } : null,
                assignedTechnician: assignedTechnician || null,
                branchId,
                appointmentDate: fromDateTimeLocal(appointment),
                dataBackupStatus,
            };

            const res = await fetch("/api/admin/repair/jobs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                const job = await res.json();
                alert(`สร้างใบรับซ่อมสำเร็จ! เลขที่ Job ID: ${job.jobId}`);
                // Open the new job so staff can print the repair receipt (ใบรับซ่อม) for the customer.
                router.push(`/admin/repair/jobs/${job._id}`);
            } else {
                const err = await res.json();
                alert(err.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
            }
        } catch (error) {
            console.error("Submit Job Error:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
            {noBranch && <NoBranchNotice action="เปิดใบรับซ่อม" />}
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-xl font-black text-gray-800 tracking-tight">รับเครื่องซ่อม/เคลม</h1>
                    <p className="text-[11px] text-gray-500 font-medium">เปิดใบรับซ่อมใหม่ บันทึกข้อมูลลูกค้าและอุปกรณ์</p>
                </div>
                <div className="flex gap-1.5">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className={`w-2 h-2 rounded-full transition-all duration-500 ${step >= s ? "bg-blue-600 w-5" : "bg-gray-200"}`}></div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200 border border-slate-100 overflow-hidden">
                {step === 1 && (
                    <div className="space-y-6 p-4 sm:p-8 md:p-12">
                        <div className="text-center max-w-sm mx-auto space-y-3">
                            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                                <Search size={24} />
                            </div>
                            <h2 className="text-lg font-black text-gray-800 uppercase tracking-tighter">ค้นหาข้อมูลลูกค้า</h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">กรอกเบอร์โทรศัพท์เพื่อตรวจสอบประวัติ</p>
                        </div>

                        <form onSubmit={handleSearchCustomer} className="max-w-md mx-auto space-y-4">
                            <div className="relative group">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                <input 
                                    type="tel" 
                                    placeholder="0XX-XXX-XXXX"
                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 pl-14 pr-6 text-lg font-bold text-gray-800 outline-none focus:bg-white focus:border-blue-500 transition-all placeholder:text-gray-300"
                                    value={searchPhone}
                                    onChange={(e) => setSearchPhone(e.target.value)}
                                    required
                                />
                            </div>
                            <button 
                                type="submit" 
                                disabled={searchingCustomer}
                                className="w-full py-4 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2"
                            >
                                {searchingCustomer ? <Loader2 className="animate-spin" size={18} /> : <><Search size={18} /> ตรวจสอบข้อมูล</>}
                            </button>
                        </form>
                    </div>
                )}

                {step === 1.5 && (
                    <div className="space-y-6 p-4 sm:p-8">
                        <div className="flex items-center gap-3 border-b border-gray-50 pb-5">
                            <div className="w-9 h-9 bg-pink-50 text-pink-500 rounded-lg flex items-center justify-center">
                                <UserPlus size={18} />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-gray-800 tracking-tight uppercase">ลงทะเบียนลูกค้าใหม่</h3>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">เบอร์โทร: {searchPhone}</p>
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">ชื่อ</label>
                                <input 
                                    className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2.5 px-4 text-xs font-bold text-gray-800 outline-none focus:bg-white focus:border-pink-500 transition-all"
                                    value={newCustomer.firstName}
                                    onChange={(e) => setNewCustomer({...newCustomer, firstName: e.target.value})}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">นามสกุล</label>
                                <input 
                                    className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2.5 px-4 text-xs font-bold text-gray-800 outline-none focus:bg-white focus:border-pink-500 transition-all"
                                    value={newCustomer.lastName}
                                    onChange={(e) => setNewCustomer({...newCustomer, lastName: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">LINE ID</label>
                                <input
                                    maxLength={100}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2.5 px-4 text-xs font-bold text-gray-800 outline-none focus:bg-white focus:border-pink-500 transition-all"
                                    value={newCustomer.lineId}
                                    onChange={(e) => setNewCustomer({...newCustomer, lineId: e.target.value})}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">ที่อยู่</label>
                                <input
                                    maxLength={500}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2.5 px-4 text-xs font-bold text-gray-800 outline-none focus:bg-white focus:border-pink-500 transition-all"
                                    value={newCustomer.address}
                                    onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                                />
                            </div>
                            <div className="space-y-1.5 sm:col-span-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">หมายเหตุลูกค้า</label>
                                <textarea
                                    rows={2}
                                    maxLength={1000}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2.5 px-4 text-xs font-bold text-gray-800 outline-none focus:bg-white focus:border-pink-500 transition-all"
                                    value={newCustomer.notes}
                                    onChange={(e) => setNewCustomer({...newCustomer, notes: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-3">
                            <button onClick={() => setStep(1)} className="flex-1 py-3 bg-slate-100 text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">ยกเลิก</button>
                            <button
                                onClick={() => {
                                    if (!newCustomer.firstName.trim() || !newCustomer.lastName.trim()) {
                                        alert("กรุณากรอกชื่อและนามสกุลลูกค้า");
                                        return;
                                    }
                                    setStep(2);
                                }}
                                className="flex-[2] py-3 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-pink-600 transition-all flex items-center justify-center gap-2"
                            >ถัดไป <ChevronRight size={14} /></button>
                        </div>
                    </div>
                )}

                {step >= 2 && (
                    <div className="space-y-8 p-4 sm:p-8">
                         {customer && (
                            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-blue-600 shadow-sm">
                                        <CheckCircle2 size={16} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-slate-800 uppercase leading-none">{customer.firstName} {customer.lastName}</h4>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">ID: {customer.customerId}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <Link href={`/admin/repair/customers/${customer._id}`} target="_blank" className="text-[9px] font-black text-slate-500 hover:underline uppercase tracking-widest">ดู/แก้ไขข้อมูลลูกค้า</Link>
                                    <button onClick={() => { setStep(1); setCustomer(null); setPastJobs(null); }} className="text-[9px] font-black text-blue-600 hover:underline uppercase tracking-widest">เปลี่ยนลูกค้า</button>
                                </div>
                            </div>
                         )}
                         {customer && (
                            <div className="rounded-2xl border border-slate-100 p-4 -mt-4">
                                <p className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2"><History size={12} /> ประวัติการซ่อม{pastJobs ? ` (${pastJobs.length} งาน)` : ""}</p>
                                {pastJobs === null ? (
                                    <p className="text-[11px] text-slate-400 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> กำลังโหลด...</p>
                                ) : pastJobs.length === 0 ? (
                                    <p className="text-[11px] text-slate-400">ยังไม่มีงานซ่อมในสาขาที่คุณดูได้</p>
                                ) : (
                                    <ul className="space-y-1">
                                        {pastJobs.slice(0, 5).map((past) => (
                                            <li key={past._id}>
                                                <Link href={`/admin/repair/jobs/${past._id}`} target="_blank" className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-[11px] hover:bg-slate-50">
                                                    <span className="font-black text-slate-800">{past.jobId} <span className="font-semibold text-slate-500">· {past.brand} {past.deviceModel}</span></span>
                                                    <span className="text-slate-400">{statusLabelForOutcome(past.status, past.outcome)} · {formatDateTime(past.receivedAt)}</span>
                                                </Link>
                                            </li>
                                        ))}
                                        {pastJobs.length > 5 && (
                                            <li><Link href={`/admin/repair/customers/${customer._id}`} target="_blank" className="px-2 text-[11px] font-bold text-blue-600 hover:underline">ดูทั้งหมด {pastJobs.length} งาน</Link></li>
                                        )}
                                    </ul>
                                )}
                            </div>
                         )}

                         <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-lg">
                                        <Smartphone size={14} />
                                    </div>
                                    <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">ข้อมูลอุปกรณ์</h3>
                                </div>

                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <label className={labelClass}>ประเภทอุปกรณ์</label>
                                        <select
                                            className={fieldClass}
                                            value={formData.deviceType}
                                            onChange={(e) => setFormData({...formData, deviceType: e.target.value})}
                                        >
                                            {DEVICE_TYPES.map((type) => <option key={type} value={type}>{DEVICE_TYPE_LABELS[type]}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">แบรนด์</label>
                                        <input 
                                            placeholder="Apple, etc."
                                            className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2 px-3 text-xs font-bold text-gray-800 outline-none focus:bg-white focus:border-blue-500 transition-all"
                                            value={formData.brand}
                                            onChange={(e) => setFormData({...formData, brand: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">รุ่น (Model)</label>
                                        <input 
                                            placeholder="iPhone 15..."
                                            className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2 px-3 text-xs font-bold text-gray-800 outline-none focus:bg-white focus:border-blue-500 transition-all"
                                            value={formData.deviceModel}
                                            onChange={(e) => setFormData({...formData, deviceModel: e.target.value})}
                                        />
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">IMEI</label>
                                            <input 
                                                maxLength={32}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2 px-3 text-xs font-bold text-gray-800 outline-none focus:bg-white focus:border-blue-500 transition-all"
                                                value={formData.imei}
                                                onChange={(e) => setFormData({...formData, imei: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className={labelClass}>Serial Number</label>
                                            <input
                                                maxLength={64}
                                                placeholder="สำหรับเครื่องที่ไม่มี IMEI"
                                                className={fieldClass}
                                                value={formData.serialNumber}
                                                onChange={(e) => setFormData({...formData, serialNumber: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">สีเครื่อง</label>
                                            <input 
                                                className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2 px-3 text-xs font-bold text-gray-800 outline-none focus:bg-white focus:border-blue-500 transition-all"
                                                value={formData.color}
                                                onChange={(e) => setFormData({...formData, color: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">สภาพเบื้องต้น</label>
                                            <textarea 
                                                rows={2}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2 px-3 text-xs font-bold text-gray-800 outline-none focus:bg-white focus:border-blue-500 transition-all"
                                                value={formData.deviceCondition}
                                                onChange={(e) => setFormData({...formData, deviceCondition: e.target.value})}
                                            />
                                    </div>
                                    <div className="space-y-1">
                                        <label className={labelClass}>อุปกรณ์ที่ฝากมากับเครื่อง</label>
                                        <AccessoriesInput value={formData.accessories} onChange={(accessories) => setFormData({...formData, accessories})} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-lg">
                                        <ClipboardList size={14} />
                                    </div>
                                    <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">ข้อมูลการซ่อม</h3>
                                </div>

                                <div className="space-y-4">
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">ประเภท</label>
                                        <div className="flex gap-2">
                                            {["repair", "claim"].map((type) => (
                                                <button 
                                                    key={type}
                                                    type="button"
                                                    onClick={() => setFormData({...formData, jobType: type})}
                                                    className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${formData.jobType === type ? "bg-slate-900 text-white shadow-lg" : "bg-white text-slate-400 border border-slate-100"}`}
                                                >
                                                    {type === "repair" ? "ซ่อม" : "เคลม"}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-red-500 uppercase tracking-widest ml-1">อาการที่แจ้ง</label>
                                        <textarea 
                                            rows={5}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-xs font-bold text-gray-800 outline-none focus:bg-white focus:border-red-500 transition-all shadow-sm"
                                            value={formData.reportedSymptom}
                                            onChange={(e) => setFormData({...formData, reportedSymptom: e.target.value})}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className={`${labelClass} flex items-center gap-1`}><Wrench size={10} /> ช่างผู้รับผิดชอบ</label>
                                        <TechnicianSelect value={assignedTechnician} onChange={setAssignedTechnician} branchId={branchId || null} className={fieldClass} />
                                    </div>

                                    <div className="space-y-1">
                                        <label className={`${labelClass} flex items-center gap-1`}><Lock size={10} /> หมายเหตุภายใน (ลูกค้าไม่เห็น)</label>
                                        <textarea
                                            rows={2}
                                            maxLength={4000}
                                            className={fieldClass}
                                            value={formData.internalNotes}
                                            onChange={(e) => setFormData({...formData, internalNotes: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>
                         </div>

                         {/* Branch, appointment and the data on the device */}
                         <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1"><MapPin size={10} /> สาขารับงาน</label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2 px-3 text-xs font-bold text-gray-800 outline-none focus:bg-white focus:border-blue-500 transition-all"
                                    value={branchId}
                                    onChange={(e) => setBranchId(e.target.value)}
                                    required
                                >
                                    <option value="">{branches.length ? "เลือกสาขา" : branchesLoaded ? "บัญชีนี้ยังไม่ได้ผูกสาขา" : "กำลังโหลดสาขา..."}</option>
                                    {branches.map((branch) => <option key={branch._id} value={branch._id}>{branch.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1"><Clock size={10} /> วันนัดซ่อมเสร็จ</label>
                                <input
                                    type="datetime-local"
                                    className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2 px-3 text-xs font-bold text-gray-800 outline-none focus:bg-white focus:border-blue-500 transition-all"
                                    value={appointment}
                                    onChange={(e) => setAppointment(e.target.value)}
                                />
                            </div>
                            <fieldset className="md:col-span-2 bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                                <legend className="text-[9px] font-black text-amber-700 uppercase tracking-widest px-1 flex items-center gap-1"><HardDrive size={10} /> ข้อมูลในเครื่องลูกค้า (ต้องเลือก)</legend>
                                <div className="grid gap-2 sm:grid-cols-3">
                                    {DATA_BACKUP.values.map((value) => (
                                        <label key={value} className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold cursor-pointer transition-all ${dataBackupStatus === value ? "border-slate-900 bg-white text-slate-900" : "border-transparent bg-white/60 text-slate-500"}`}>
                                            <input
                                                type="radio"
                                                name="dataBackupStatus"
                                                value={value}
                                                checked={dataBackupStatus === value}
                                                onChange={() => setDataBackupStatus(value)}
                                                className="mt-0.5"
                                            />
                                            {DATA_BACKUP.labels[value]}
                                        </label>
                                    ))}
                                </div>
                            </fieldset>
                         </div>

                         <div className="flex flex-col gap-4 border-t border-gray-50 pt-6 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500">
                                <ShieldCheck size={14} />
                                <span>ออก Job ID อัตโนมัติ</span>
                            </div>
                            <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto">
                                <button type="button" onClick={() => setStep(1)} className="px-6 py-2.5 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">ย้อนกลับ</button>
                                <button 
                                    onClick={handleCreateJob}
                                    disabled={loading || noBranch}
                                    className="px-8 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={14} /> : <><Save size={14} /> บันทึกใบรับซ่อม</>}
                                </button>
                            </div>
                         </div>
                    </div>
                )}
            </div>
            
            <p className="text-center text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                การสร้างใบรับซ่อม จะเป็นการเริ่มต้น Workflow อัตโนมัติ
            </p>
        </div>
    );
}
