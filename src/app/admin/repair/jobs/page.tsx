"use client";

import React, { useEffect, useState } from "react";
import { 
    Search, 
    Filter, 
    PlusCircle, 
    Calendar, 
    ChevronRight, 
    Wrench, 
    CheckCircle, 
    Clock, 
    AlertCircle,
    User,
    ChevronLeft,
    Box,
    Loader2
} from "lucide-react";
import Link from "next/link";

export default function RepairJobsList() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    useEffect(() => {
        fetchJobs();
    }, [statusFilter]);

    const fetchJobs = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/repair/jobs?status=${statusFilter}&q=${search}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setJobs(data);
            }
        } catch (error) {
            console.error("Fetch Jobs Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchJobs();
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "pending": return "bg-orange-100 text-orange-600 border-orange-200";
            case "checking": return "bg-blue-100 text-blue-600 border-blue-200";
            case "in_progress": return "bg-purple-100 text-purple-600 border-purple-200";
            case "ready_pickup": return "bg-green-100 text-green-600 border-green-200";
            case "completed": return "bg-emerald-100 text-emerald-600 border-emerald-200";
            case "cancelled": return "bg-gray-100 text-gray-500 border-gray-200";
            default: return "bg-gray-100 text-gray-600 border-gray-200";
        }
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-800 tracking-tight">รายการงานซ่อม & เคลม</h1>
                    <p className="text-sm text-gray-500 font-medium italic">จัดการและติดตามสถานะงานซ่อมทั้งหมดในระบบ</p>
                </div>
                <Link href="/admin/repair/jobs/new" className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold text-sm tracking-widest uppercase hover:bg-blue-600 transition-all shadow-xl shadow-slate-200">
                    <PlusCircle size={18} />
                    เปิดใบรับซ่อมใหม่
                </Link>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col lg:flex-row gap-4">
                <form onSubmit={handleSearch} className="flex-1 relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input 
                        type="text" 
                        placeholder="ค้นหา Job ID, IMEI, ชื่อลูกค้า..."
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3.5 pl-14 pr-6 text-sm font-bold text-gray-800 outline-none focus:bg-white focus:border-blue-500 transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </form>
                <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
                    {["all", "pending", "checking", "in_progress", "ready_pickup", "completed"].map((stat) => (
                        <button 
                            key={stat}
                            onClick={() => setStatusFilter(stat)}
                            className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest shrink-0 transition-all ${statusFilter === stat ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-400 border border-slate-100 hover:bg-white"}`}
                        >
                            {getStatusLabel(stat) === stat ? "ทั้งหมด" : getStatusLabel(stat)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Jobs Table/Grid */}
            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="bg-white rounded-[2.5rem] py-32 flex flex-col items-center justify-center text-gray-300">
                        <Loader2 className="animate-spin mb-4" size={40} />
                        <p className="text-sm font-black uppercase tracking-widest">กำลังโหลดข้อมูล...</p>
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="bg-white rounded-[2.5rem] py-32 flex flex-col items-center justify-center text-gray-300">
                        <Box className="mb-4 opacity-50" size={60} />
                        <p className="text-sm font-black uppercase tracking-widest italic opacity-50">ไม่พบข้อมูลงานซ่อมในระบบ</p>
                    </div>
                ) : (
                    jobs.map((job) => (
                        <Link 
                            key={job._id} 
                            href={`/admin/repair/jobs/${job._id}`}
                            className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col md:flex-row items-center gap-6"
                        >
                            {/* Job ID & Date */}
                            <div className="flex flex-col items-center md:items-start md:border-r border-gray-100 md:pr-10">
                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1 italic leading-none">{job.jobType === "repair" ? "ซ่อมทั่วไป" : "งานเคลม"}</span>
                                <h3 className="text-xl font-black text-slate-900 tracking-tighter leading-none">{job.jobId}</h3>
                                <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold mt-2 uppercase tracking-tighter">
                                    <Calendar size={12} /> {new Date(job.receivedAt).toLocaleDateString()}
                                </div>
                            </div>

                            {/* Device & Client */}
                            <div className="flex-1 space-y-2 w-full">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform shrink-0">
                                        <Wrench size={12} />
                                    </div>
                                    <p className="text-[13px] font-black text-slate-800 uppercase tracking-tight truncate">
                                        {job.brand} {job.deviceModel}
                                        <span className="text-[10px] font-bold text-slate-400 ml-2 italic tracking-tighter">(IMEI: {job.imei || "N/A"})</span>
                                    </p>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                        <User size={12} />
                                    </div>
                                    <p className="text-[12px] font-bold text-gray-500 italic">
                                        {job.customer?.firstName} {job.customer?.lastName}
                                        <span className="text-[9px] font-black text-blue-300 ml-2 uppercase tracking-widest">{job.customer?.phone}</span>
                                    </p>
                                </div>
                            </div>

                            {/* Symptom Snippet */}
                            <div className="hidden lg:block flex-[2] border-l border-gray-100 pl-8">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">อาการที่แจ้ง</p>
                                <p className="text-[11px] font-semibold text-gray-600 line-clamp-2 italic leading-relaxed">"{job.reportedSymptom}"</p>
                            </div>

                            {/* Status & Action */}
                            <div className="flex flex-row md:flex-col items-center gap-3 w-full md:w-auto">
                                <div className={`px-4 py-2 rounded-lg border text-[9px] font-black uppercase tracking-widest shadow-sm ${getStatusStyle(job.status)}`}>
                                    {getStatusLabel(job.status)}
                                </div>
                                <div className="hidden md:flex items-center gap-1.5 text-[9px] font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                    ดูรายละเอียด <ChevronRight size={12} />
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>

            <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest italic pt-6">
                แสดงผลทั้งหมด {jobs.length} รายการ
            </p>
        </div>
    );
}
