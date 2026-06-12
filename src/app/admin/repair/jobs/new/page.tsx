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
    Save
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function NewRepairJob() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    
    // Customer Search State
    const [searchPhone, setSearchPhone] = useState("");
    const [searchingCustomer, setSearchingCustomer] = useState(false);
    const [customer, setCustomer] = useState<any>(null);

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

    const handleSearchCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchPhone) return;
        setSearchingCustomer(true);
        try {
            const res = await fetch(`/api/admin/repair/customers?phone=${searchPhone}`);
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                setCustomer(data[0]);
                setIsNewCustomer(false);
                setStep(2);
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

        setLoading(true);
        try {
            const payload = {
                ...formData,
                customer: customer?._id,
                newCustomer: isNewCustomer ? { ...newCustomer, phone: searchPhone } : null,
            };

            const res = await fetch("/api/admin/repair/jobs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                const job = await res.json();
                alert(`สร้างใบรับซ่อมสำเร็จ! เลขที่ Job ID: ${job.jobId}`);
                router.push("/admin/repair/jobs");
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
            {/* Header */}
            <div className="flex items-center justify-between">
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
                    <div className="p-8 md:p-12 space-y-6">
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
                    <div className="p-8 space-y-6">
                        <div className="flex items-center gap-3 border-b border-gray-50 pb-5">
                            <div className="w-9 h-9 bg-pink-50 text-pink-500 rounded-lg flex items-center justify-center">
                                <UserPlus size={18} />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-gray-800 tracking-tight italic uppercase">ลงทะเบียนลูกค้าใหม่</h3>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">เบอร์โทร: {searchPhone}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
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

                        <div className="flex gap-3 pt-3">
                            <button onClick={() => setStep(1)} className="flex-1 py-3 bg-slate-100 text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">ยกเลิก</button>
                            <button onClick={() => setStep(2)} className="flex-[2] py-3 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-pink-600 transition-all flex items-center justify-center gap-2">ถัดไป <ChevronRight size={14} /></button>
                        </div>
                    </div>
                )}

                {step >= 2 && (
                    <div className="p-8 space-y-8">
                         {customer && (
                            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-blue-600 shadow-sm">
                                        <CheckCircle2 size={16} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-slate-800 uppercase italic leading-none">{customer.firstName} {customer.lastName}</h4>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">ID: {customer.customerId}</p>
                                    </div>
                                </div>
                                <button onClick={() => { setStep(1); setCustomer(null); }} className="text-[9px] font-black text-blue-600 hover:underline uppercase tracking-widest">เปลี่ยนลูกค้า</button>
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
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">IMEI</label>
                                            <input 
                                                className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2 px-3 text-xs font-bold text-gray-800 outline-none focus:bg-white focus:border-blue-500 transition-all"
                                                value={formData.imei}
                                                onChange={(e) => setFormData({...formData, imei: e.target.value})}
                                            />
                                        </div>
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
                                                    onClick={() => setFormData({...formData, jobType: type as any})}
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
                                </div>
                            </div>
                         </div>

                         <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 italic">
                                <ShieldCheck size={14} />
                                <span>ออก Job ID อัตโนมัติ</span>
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setStep(1)} className="px-6 py-2.5 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">ย้อนกลับ</button>
                                <button 
                                    onClick={handleCreateJob}
                                    disabled={loading}
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
