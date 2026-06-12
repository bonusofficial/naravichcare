"use client";

import { useEffect, useState } from "react";
import {
    History, Search, User, Activity,
    Calendar, Shield, Smartphone,
    CheckCircle, XCircle, AlertCircle,
    Copy, Filter
} from "lucide-react";

type AdminLog = {
    _id: string;
    adminName: string;
    action: string;
    description: string;
    targetId?: string;
    targetType?: string;
    createdAt: string;
    ipAddress?: string;
    details?: any;
};

export default function AdminLogsPage() {
    const [logs, setLogs] = useState<AdminLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [totalPages, setTotalPages] = useState(1);
    const [currentPage, setCurrentPage] = useState(1);

    const fetchLogs = async (page = 1) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/logs?page=${page}&limit=50`);
            const json = await res.json();
            if (json.success) {
                setLogs(json.data);
                setTotalPages(json.pagination.pages);
                setCurrentPage(json.pagination.page);
            }
        } catch (error) {
            console.error("Failed to fetch logs:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const filteredLogs = logs.filter(log =>
        log.adminName.toLowerCase().includes(search.toLowerCase()) ||
        log.description.toLowerCase().includes(search.toLowerCase()) ||
        log.action.toLowerCase().includes(search.toLowerCase())
    );

    const getActionBadge = (action: string) => {
        if (action.includes("job")) return "bg-blue-50 text-blue-600 ring-blue-100";
        if (action.includes("customer")) return "bg-emerald-50 text-emerald-600 ring-emerald-100";
        if (action.includes("user")) return "bg-slate-50 text-slate-800 ring-slate-200";
        if (action.includes("approve")) return "bg-emerald-50 text-emerald-600 ring-emerald-100";
        if (action.includes("reject")) return "bg-red-50 text-red-600 ring-red-100";
        if (action.includes("delete")) return "bg-orange-50 text-orange-600 ring-orange-100";
        if (action.includes("login")) return "bg-blue-50 text-blue-600 ring-blue-100";
        return "bg-gray-50 text-gray-600 ring-gray-100";
    };

    const getActionIcon = (action: string) => {
        if (action.includes("job")) return <Smartphone size={14} />;
        if (action.includes("customer")) return <User size={14} />;
        if (action.includes("user")) return <Shield size={14} />;
        if (action.includes("approve")) return <CheckCircle size={14} />;
        if (action.includes("reject")) return <XCircle size={14} />;
        if (action.includes("delete")) return <AlertCircle size={14} />;
        if (action.includes("login")) return <Shield size={14} />;
        return <Activity size={14} />;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                        <History className="text-blue-600" size={28} />
                        บันทึกการใช้งาน (Admin Logs)
                    </h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">ติดตามความเคลื่อนไหวและตรวจสอบการเข้าใช้งานระบบ</p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อ, การกระทำ, รายละเอียด..."
                            className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full md:w-80 transition-all font-medium"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-50 bg-slate-50/50">
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">ผู้ดำเนินการ</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">การกระทำ</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">ประเภท</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">รายละเอียด</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">วัน-เวลา</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">IP Address</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-6 py-4 bg-slate-50/20 h-16"></td>
                                    </tr>
                                ))
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-24 text-center">
                                        <div className="flex flex-col items-center opacity-20">
                                            <History size={48} className="mb-4" />
                                            <p className="text-sm font-black uppercase tracking-widest">ไม่พบข้อมูลบันทึก</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log._id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 text-xs font-black">
                                                    {log.adminName.substring(0, 1)}
                                                </div>
                                                <p className="text-sm font-bold text-slate-700">{log.adminName}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ring-1 ring-inset ${getActionBadge(log.action)}`}>
                                                {getActionIcon(log.action)}
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{log.targetType || "-"}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs text-slate-600 font-medium line-clamp-1">{log.description}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-700">
                                                    {new Date(log.createdAt).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-medium">
                                                    {new Date(log.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                                {log.ipAddress || "Internal"}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="p-6 border-t border-slate-50 flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            หน้า {currentPage} จาก {totalPages}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => fetchLogs(currentPage - 1)}
                                disabled={currentPage === 1 || loading}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-xs font-black uppercase tracking-widest rounded-xl transition-all"
                            >
                                ก่อนหน้า
                            </button>
                            <button
                                onClick={() => fetchLogs(currentPage + 1)}
                                disabled={currentPage === totalPages || loading}
                                className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-slate-200"
                            >
                                ถัดไป
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
