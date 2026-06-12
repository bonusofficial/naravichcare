"use client";
import React, { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, ShieldCheck, Users, Smartphone, AlertCircle, ArrowUpRight, ArrowDownRight, Clock, Activity, CreditCard, ArrowRight, Calendar, ChevronRight, Search, Loader2 } from "lucide-react";

export default function AdminDashboard() {
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const res = await fetch("/api/admin/dashboard");
            const result = await res.json();
            if (result.success) {
                setDashboardData(result);
            }
        } catch (err) {
            console.error("Dashboard fetch failed", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] opacity-40">
                <Loader2 size={48} className="animate-spin text-blue-500 mb-4" />
                <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">Synchronizing Global Analytics...</p>
            </div>
        );
    }

    const { stats = {}, agentPerformance = [], recentClaims = [], monthlyRevenue } = dashboardData || {};
    const safeStats = {
        netProfit: stats.netProfit ?? "฿0",
        totalCollected: stats.totalCollected ?? "฿0",
        nplValue: stats.nplValue ?? "฿0",
        activeLoansCount: stats.activeLoansCount ?? 0,
        regApproved: stats.regApproved ?? 0,
    };
    const chartHeights = Array.isArray(monthlyRevenue) && monthlyRevenue.length === 12
        ? monthlyRevenue
        : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    const kpiStats = [
        { label: "กำไรสุทธิจริง", value: safeStats.netProfit, delta: "+0%", up: true, icon: <Activity size={18} />, color: "text-emerald-500", bg: "bg-emerald-500/10", description: "กำไรหลังหักต้นทุนประมาณการ" },
        { label: "ยอดรับชำระสะสม", value: safeStats.totalCollected, delta: "+0%", up: true, icon: <CreditCard size={18} />, color: "text-blue-500", bg: "bg-blue-500/10", description: "ยอดรวมจากชำระเงิน + สมัครที่อนุมัติ" },
        { label: "พอร์ตสินเชื่อปกติ", value: safeStats.activeLoansCount > 0 ? safeStats.activeLoansCount : safeStats.regApproved, delta: "Active", up: true, icon: <Smartphone size={18} />, color: "text-indigo-500", bg: "bg-indigo-500/10", description: safeStats.activeLoansCount > 0 ? "จำนวนสัญญาที่ยังไม่ปิด" : "จำนวนสมัครที่อนุมัติ" },
        { label: "หนี้ค้างชำระ (NPL)", value: safeStats.nplValue, delta: "0%", up: false, icon: <TrendingDown size={18} />, color: "text-red-500", bg: "bg-red-500/10", description: "รวมยอดค้างชำระสถานะ Warning/Critical" }
    ];

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-wider">Executive Overview</span>
                        <span className="text-gray-300">•</span>
                        <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                            <Calendar size={12} /> {new Date().toLocaleDateString('th-TH')}
                        </span>
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">แดชบอร์ดสรุปการเงิน</h2>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchDashboard} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 transition-all shadow-sm">
                        <Activity size={18} />
                    </button>
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-black hover:bg-blue-600 transition-all shadow-lg shadow-slate-200 uppercase">
                        Export Report <ArrowUpRight size={16} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpiStats.map((s) => (
                    <div key={s.label} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group overflow-hidden relative">
                        <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-5 transition-transform group-hover:scale-150 duration-700 ${s.bg}`}></div>
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <div className={`w-11 h-11 ${s.bg} rounded-xl flex items-center justify-center ${s.color}`}>
                                {s.icon}
                            </div>
                            <div className={`flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full ${s.up ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                                {s.delta}
                            </div>
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                            <h3 className="text-3xl font-black text-slate-900 leading-none tracking-tight">{s.value}</h3>
                            <p className="text-[10px] text-slate-400 font-bold mt-3 flex items-center gap-1 uppercase italic">
                                <Clock size={10} /> {s.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 h-full">
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight">วิเคราะห์การเติบโตของรายได้</h4>
                                <p className="text-xs text-slate-400 font-bold uppercase mt-1">เปรียบเทียบรายได้จริงกับประมาณการรายเดือน</p>
                            </div>
                        </div>
                        <div className="h-72 flex items-stretch justify-between gap-2 md:gap-4 mt-12 bg-slate-50/50 rounded-2xl p-6 border border-slate-100/50">
                            {chartHeights.map((h, i) => (
                                <div key={i} className="flex-1 flex flex-col group/bar cursor-pointer relative">
                                    <div className="flex-1 flex flex-col justify-end">
                                        <div className="w-full bg-slate-200 rounded-t-lg transition-all duration-700 group-hover/bar:bg-blue-600 group-hover/bar:shadow-[0_-4px_12px_rgba(37,99,235,0.3)]" style={{ height: `${Math.max(h, 4)}%` }}></div>
                                    </div>
                                    <div className="mt-4 flex flex-col items-center">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                            {['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12'][i]}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-4 flex flex-col gap-6">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-1/2">
                        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                            <h4 className="font-black text-slate-900 text-sm uppercase">NPL แยกตาม Agent</h4>
                            <Users size={18} className="text-slate-300" />
                        </div>
                        <div className="divide-y divide-slate-50 overflow-y-auto">
                            {agentPerformance.map((a: any) => (
                                <div key={a.agent} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">{a.avatar}</div>
                                        <div>
                                            <p className="text-sm font-black text-slate-900 uppercase">{a.agent}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">{a.loans} Loans • NPL {a.npl}</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-red-50 text-red-600">{a.rate}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl shadow-slate-200 h-1/2 flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="font-black text-white text-sm tracking-tight flex items-center gap-2 uppercase">
                                <ShieldCheck size={18} className="text-blue-400" />
                                งานเคลมล่าสุด
                            </h4>
                            <span className="animate-pulse bg-blue-600 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">Live</span>
                        </div>
                        <div className="space-y-3 overflow-y-auto">
                            {recentClaims.length === 0 ? (
                                <p className="text-center text-slate-500 py-10 text-[10px] font-black uppercase">No recent claims</p>
                            ) : recentClaims.map((c: any, i: number) => (
                                <div key={i} className="bg-white/5 border border-white/5 p-3 rounded-xl flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center"><Smartphone size={16} /></div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-white truncate uppercase">{c.device}</p>
                                        <p className="text-[10px] text-white/40 font-bold uppercase mt-0.5">{c.type} • <span className="text-blue-400">{c.status}</span></p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
