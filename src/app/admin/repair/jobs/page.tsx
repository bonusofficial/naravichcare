"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import {
    Search,
    PlusCircle,
    Calendar,
    CalendarClock,
    ChevronRight,
    Wrench,
    User,
    Box,
    Loader2,
    Store,
    AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { RepairJobView } from "@/lib/repair/types";
import { repairStatusLabel } from "@/lib/repair/status";
import { statusLabelForOutcome } from "@/lib/repair/workflow";
import { isOverdue } from "@/lib/repair/summary";
import { formatDateTime } from "@/components/admin/repair/format";

interface BranchOption {
    _id: string;
    name: string;
}

const STATUS_FILTERS = ["all", "open", "pending", "checking", "in_progress", "ready_pickup", "completed"] as const;

const statusFilterLabel = (status: string) => {
    if (status === "all") return "ทั้งหมด";
    if (status === "open") return "งานค้าง";
    return repairStatusLabel(status);
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

/** Whole days since the appointment, at least 1 once it has passed. */
const daysLate = (appointment: string, now: Date) =>
    Math.max(1, Math.floor((now.getTime() - new Date(appointment).getTime()) / 86_400_000));

function RepairJobsList() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    // Filters live in the URL so dashboard links and reloads keep them.
    const statusFilter = searchParams.get("status") || "all";
    const branchFilter = searchParams.get("branchId") || "";
    const overdueOnly = searchParams.get("overdue") === "1";
    const query = searchParams.get("q") || "";

    const [jobs, setJobs] = useState<RepairJobView[]>([]);
    const requestKey = `${statusFilter}|${query}|${branchFilter}|${overdueOnly}`;
    const [loadedKey, setLoadedKey] = useState<string | null>(null);
    const loading = loadedKey !== requestKey;
    const [search, setSearch] = useState(query);
    const [branches, setBranches] = useState<BranchOption[]>([]);
    const [allBranches, setAllBranches] = useState(false);
    const [now, setNow] = useState(() => new Date());

    const updateQuery = useCallback((changes: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        for (const [key, value] of Object.entries(changes)) {
            if (value) params.set(key, value);
            else params.delete(key);
        }
        const text = params.toString();
        router.replace(text ? `${pathname}?${text}` : pathname, { scroll: false });
    }, [pathname, router, searchParams]);

    useEffect(() => {
        fetch("/api/admin/repair/branches")
            .then((res) => (res.ok ? res.json() : null))
            .then((data: { branches?: BranchOption[]; allBranches?: boolean } | null) => {
                if (!data) return;
                setBranches(data.branches ?? []);
                setAllBranches(Boolean(data.allBranches));
            })
            .catch((error) => console.error("Fetch branches error:", error));
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        const params = new URLSearchParams();
        params.set("status", statusFilter);
        if (query) params.set("q", query);
        if (branchFilter) params.set("branchId", branchFilter);
        if (overdueOnly) params.set("overdue", "1");
        fetch(`/api/admin/repair/jobs?${params}`, { signal: controller.signal })
            .then((res) => res.json())
            .then((data) => {
                setJobs(Array.isArray(data) ? data : []);
                setNow(new Date());
                setLoadedKey(requestKey);
            })
            .catch((error) => {
                if (controller.signal.aborted) return;
                console.error("Fetch Jobs Error:", error);
                setLoadedKey(requestKey);
            });
        return () => controller.abort();
    }, [statusFilter, query, branchFilter, overdueOnly, requestKey]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        updateQuery({ q: search.trim() || null });
    };

    // A user limited to one branch has nothing to choose.
    const showBranchFilter = allBranches || branches.length > 1;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-800 tracking-tight">รายการงานซ่อม & เคลม</h1>
                    <p className="text-sm text-gray-500 font-medium">จัดการและติดตามสถานะงานซ่อมทั้งหมดในระบบ</p>
                </div>
                <Link href="/admin/repair/jobs/new" className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold text-sm tracking-widest uppercase hover:bg-blue-600 transition-all shadow-xl shadow-slate-200">
                    <PlusCircle size={18} />
                    เปิดใบรับซ่อมใหม่
                </Link>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm space-y-3">
                <div className="flex flex-col lg:flex-row gap-3">
                    <form onSubmit={handleSearch} className="flex-1 relative group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="ค้นหา Job ID, IMEI, Ref จาก POS, รหัสสินค้า..."
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3.5 pl-14 pr-6 text-sm font-bold text-gray-800 outline-none focus:bg-white focus:border-blue-500 transition-all"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </form>
                    <div className="flex gap-2">
                        {showBranchFilter && (
                            <select
                                aria-label="สาขา"
                                value={branchFilter}
                                onChange={(e) => updateQuery({ branchId: e.target.value || null })}
                                className="min-w-0 flex-1 lg:flex-none lg:w-52 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:border-blue-500"
                            >
                                <option value="">ทุกสาขา</option>
                                {branches.map((branch) => (
                                    <option key={branch._id} value={branch._id}>{branch.name}</option>
                                ))}
                                {allBranches && <option value="none">ยังไม่ผูกสาขา</option>}
                            </select>
                        )}
                        <button
                            type="button"
                            aria-pressed={overdueOnly}
                            onClick={() => updateQuery({ overdue: overdueOnly ? null : "1" })}
                            className={`flex items-center gap-1.5 px-4 py-3 rounded-xl text-xs font-black shrink-0 border transition-all ${overdueOnly ? "bg-red-600 text-white border-red-600" : "bg-slate-50 text-red-600 border-slate-100 hover:bg-white"}`}
                        >
                            <AlertTriangle size={14} /> เกินนัด
                        </button>
                    </div>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {STATUS_FILTERS.map((stat) => (
                        <button
                            key={stat}
                            type="button"
                            onClick={() => updateQuery({ status: stat === "all" ? null : stat })}
                            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shrink-0 transition-all ${statusFilter === stat ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-400 border border-slate-100 hover:bg-white"}`}
                        >
                            {statusFilterLabel(stat)}
                        </button>
                    ))}
                    {!(STATUS_FILTERS as readonly string[]).includes(statusFilter) && (
                        <span className="px-5 py-2.5 rounded-xl text-xs font-black shrink-0 bg-slate-900 text-white">{statusFilterLabel(statusFilter)}</span>
                    )}
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
                        <p className="text-sm font-black uppercase tracking-widest opacity-50">
                            {overdueOnly ? "ไม่มีงานที่เกินนัด" : "ไม่พบข้อมูลงานซ่อมในระบบ"}
                        </p>
                    </div>
                ) : (
                    jobs.map((job) => {
                        const overdue = isOverdue(job, now);
                        return (
                            <Link
                                key={job._id}
                                href={`/admin/repair/jobs/${job._id}`}
                                className={`bg-white p-6 rounded-[2.5rem] border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col md:flex-row items-center gap-6 ${overdue ? "border-red-200" : "border-gray-100"}`}
                            >
                                {/* Job ID & Date */}
                                <div className="flex flex-col items-center md:items-start md:border-r border-gray-100 md:pr-10">
                                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1 leading-none">{job.jobType === "repair" ? "ซ่อมทั่วไป" : "งานเคลม"}</span>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tighter leading-none">{job.jobId}</h3>
                                    {job.source === "pos" && (
                                        <span className="mt-2 inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                            <Store size={11} /> {job.ownerType === "store" ? "เครื่องของร้าน / ส่งจาก POS" : "ส่งจาก POS"}
                                        </span>
                                    )}
                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold mt-2 uppercase tracking-tighter">
                                        <Calendar size={12} /> {new Date(job.receivedAt).toLocaleDateString("th-TH")}
                                    </div>
                                    {job.branchId ? (
                                        <span className="mt-1 text-[10px] font-bold text-slate-500">{job.branchId.name}</span>
                                    ) : (
                                        <span className="mt-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">ยังไม่ผูกสาขา</span>
                                    )}
                                </div>

                                {/* Device & Client */}
                                <div className="flex-1 space-y-2 w-full min-w-0">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform shrink-0">
                                            <Wrench size={12} />
                                        </div>
                                        <p className="text-[13px] font-black text-slate-800 uppercase tracking-tight truncate">
                                            {job.brand} {job.deviceModel}
                                            <span className="text-[10px] font-bold text-slate-400 ml-2 tracking-tighter">(IMEI: {job.imei || "N/A"})</span>
                                        </p>
                                    </div>
                                    {job.customer ? (
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                                <User size={12} />
                                            </div>
                                            <p className="text-[12px] font-bold text-gray-500">
                                                {job.customer.firstName} {job.customer.lastName}
                                                <span className="text-[9px] font-black text-blue-300 ml-2 uppercase tracking-widest">{job.customer.phone}</span>
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                                <Store size={12} />
                                            </div>
                                            <p className="text-[12px] font-bold text-gray-500 min-w-0 truncate">
                                                {job.ownerType === "store" ? "เครื่องของร้าน" : "ไม่มีข้อมูลลูกค้า"}
                                                {job.externalRef && <span className="ml-2 text-[10px] font-semibold text-slate-400">Ref: {job.externalRef}</span>}
                                                {job.integration?.productCode && <span className="ml-2 text-[10px] font-semibold text-slate-400">รหัสสินค้า: {job.integration.productCode}</span>}
                                                {(job.integration?.branchCode || job.integration?.branchId) && <span className="ml-2 text-[10px] font-semibold text-slate-400">สาขา: {job.integration.branchCode || job.integration.branchId}</span>}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Symptom Snippet */}
                                <div className="hidden xl:block flex-[2] border-l border-gray-100 pl-8">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">อาการที่แจ้ง</p>
                                    <p className="text-[11px] font-semibold text-gray-600 line-clamp-2 leading-relaxed">&ldquo;{job.reportedSymptom}&rdquo;</p>
                                </div>

                                {/* Appointment */}
                                <div className="w-full md:w-40 shrink-0 md:border-l border-gray-100 md:pl-6">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                        <CalendarClock size={11} /> นัดรับเครื่อง
                                    </p>
                                    <p className={`text-[11px] font-bold ${overdue ? "text-red-600" : "text-gray-600"}`}>
                                        {job.appointmentDate ? formatDateTime(job.appointmentDate) : "ยังไม่นัด"}
                                    </p>
                                    {overdue && job.appointmentDate && (
                                        <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-black text-red-600">
                                            <AlertTriangle size={11} /> เกินนัด {daysLate(job.appointmentDate, now)} วัน
                                        </span>
                                    )}
                                </div>

                                {/* Status & Action */}
                                <div className="flex flex-row md:flex-col items-center gap-3 w-full md:w-auto">
                                    <div className={`px-4 py-2 rounded-lg border text-[9px] font-black uppercase tracking-widest shadow-sm ${getStatusStyle(job.status)}`}>
                                        {statusLabelForOutcome(job.status, job.outcome)}
                                    </div>
                                    <div className="hidden md:flex items-center gap-1.5 text-[9px] font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                        ดูรายละเอียด <ChevronRight size={12} />
                                    </div>
                                </div>
                            </Link>
                        );
                    })
                )}
            </div>

            <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest pt-6">
                {jobs.length >= 100 ? "แสดง 100 รายการล่าสุด (ใช้ตัวกรองเพื่อจำกัดผลลัพธ์)" : `แสดงผลทั้งหมด ${jobs.length} รายการ`}
            </p>
        </div>
    );
}

export default function RepairJobsListPage() {
    return (
        <Suspense
            fallback={
                <div className="flex flex-col items-center justify-center py-32 text-gray-300">
                    <Loader2 className="animate-spin" size={40} />
                </div>
            }
        >
            <RepairJobsList />
        </Suspense>
    );
}
