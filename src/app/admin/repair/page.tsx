"use client";

import React, { useEffect, useState } from "react";
import { 
    Wrench, 
    Smartphone, 
    Clock, 
    CheckCircle, 
    TrendingUp, 
    ChevronRight, 
    Search, 
    User, 
    Settings, 
    History,
    Loader2,
    UserPlus,
    FileText
} from "lucide-react";
import Link from "next/link";

export default function RepairDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch("/api/admin/repair/stats");
            const data = await res.json();
            setStats(data.stats);
        } catch (error) {
            console.error("Fetch Stats Error:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-32 text-gray-400">
            <Loader2 className="animate-spin mb-4" size={40} />
            <p className="text-sm font-black uppercase tracking-widest italic tracking-tighter">Aggregating real-time data...</p>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-5 duration-700">
            {/* Header / Search */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-5">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic">Repair Dashboard</h1>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Real-time Service Analytics & Management</p>
                </div>
                <Link href="/admin/repair/create" className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2 shadow-lg shadow-slate-200">
                    <Wrench size={14} /> สร้างใบรับซ่อมใหม่
                </Link>
            </div>

            <div className="grid lg:grid-cols-12 gap-6">
                {/* Main Content (Left 8) */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Stats Highlights (Compact) */}
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { label: "งานทั้งหมด (Total)", value: stats?.total || 0, icon: <Smartphone size={14}/>, color: "text-slate-800", bg: "bg-white" },
                            { label: "รอตรวจเช็ก (Pending)", value: stats?.pending || 0, icon: <Clock size={14}/>, color: "text-amber-500", bg: "bg-white" },
                            { label: "เสร็จรอรับ (Ready)", value: stats?.ready || 0, icon: <CheckCircle size={14}/>, color: "text-emerald-500", bg: "bg-white" },
                        ].map((stat, i) => (
                            <div key={i} className={`${stat.bg} border border-gray-100 rounded-2xl p-4 shadow-sm group hover:border-slate-300 transition-all`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`${stat.color} opacity-40 group-hover:opacity-100 transition-all`}>{stat.icon}</div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
                                </div>
                                <div className={`text-2xl font-black ${stat.color} italic tracking-tighter`}>{stat.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Financial Overview Card (Enhanced with Profit) */}
                    <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-slate-200 group">
                         <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                         <div className="relative z-10 space-y-8">
                              <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></div>
                                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300 italic">Financial Summary / ข้อมูลการเงิน</span>
                              </div>
                              
                              <div className="grid md:grid-cols-2 gap-8">
                                  {/* Daily Section */}
                                  <div className="space-y-4">
                                      <div className="space-y-1">
                                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">Daily Revenue (รายได้วันนี้)</p>
                                          <h3 className="text-3xl font-black tracking-tighter italic">฿ {(stats?.dailyRevenue || 0).toLocaleString()}</h3>
                                      </div>
                                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 transition-all hover:bg-emerald-500/10 hover:border-emerald-500/20">
                                          <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest italic mb-1 shrink-0">Net Profit Today (กำไรสุทธิ)</p>
                                          <h4 className="text-xl font-black text-emerald-400 tracking-tight italic">฿ {(stats?.dailyProfit || 0).toLocaleString()}</h4>
                                      </div>
                                  </div>

                                  {/* Monthly Section */}
                                  <div className="space-y-4">
                                      <div className="space-y-1">
                                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">Monthly Sales (ยอดขายเดือนนี้)</p>
                                          <h3 className="text-3xl font-black tracking-tighter italic text-blue-400">฿ {(stats?.monthlyRevenue || 0).toLocaleString()}</h3>
                                      </div>
                                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 transition-all hover:bg-blue-500/10 hover:border-blue-500/20">
                                          <p className="text-[8px] font-black text-blue-300 uppercase tracking-widest italic mb-1">Monthly Profit (กำไรสะสม)</p>
                                          <h4 className="text-xl font-black text-blue-300 tracking-tight italic">฿ {(stats?.monthlyProfit || 0).toLocaleString()}</h4>
                                      </div>
                                  </div>
                              </div>

                              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                   <p className="text-[10px] font-bold text-gray-500 italic uppercase">Total {stats?.dailyCount || 0} Jobs Received Today</p>
                                   <div className="flex items-center gap-1 text-[8px] font-black text-emerald-400 uppercase tracking-widest">
                                        <TrendingUp size={10} /> Live Financial Syncing
                                   </div>
                              </div>
                         </div>
                    </div>

                    {/* Bottom Quick Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-600 rounded-2xl p-6 text-white relative overflow-hidden">
                             <div className="absolute right-0 top-0 w-24 h-24 bg-white/5 rounded-full -mr-10 -mt-10"></div>
                             <h4 className="text-[11px] font-black uppercase tracking-widest mb-1 opacity-80 italic">Status Today</h4>
                             <p className="text-2xl font-black mb-1 tracking-tighter italic">{stats?.dailyCount || 0} Jobs In</p>
                             <p className="text-[9px] font-bold uppercase tracking-widest opacity-60">เคสที่รับเข้าใหม่วันนี้</p>
                        </div>
                        <div className="bg-white border border-gray-100 rounded-2xl p-6 flex flex-col justify-center">
                             <h4 className="text-[11px] font-black uppercase tracking-widest mb-1 text-slate-400 italic">Warehouse Status</h4>
                             <p className="text-sm font-bold text-slate-600">Inventory Module Inactive</p>
                             <div className="mt-2 text-[9px] font-black text-blue-600 uppercase tracking-widest opacity-50 cursor-not-allowed italic">Phase 2: Inventory System</div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Manage (Right 4) */}
                <div className="lg:col-span-4 space-y-4">
                     <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                          <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-6 italic flex items-center gap-2">
                               <Settings size={14} className="text-blue-500" /> Administrative Access
                          </h4>
                          <div className="grid grid-cols-1 gap-2">
                               {[
                                   { label: "รายการงานซ่อม", href: "/admin/repair/jobs", icon: <FileText size={14}/> },
                                   { label: "ทะเบียนลูกค้า", href: "/admin/repair/customers", icon: <User size={14}/> },
                                   { label: "เพิ่มลูกค้าใหม่", href: "/admin/repair/customers", icon: <UserPlus size={14}/> },
                                   { label: "สถิติพนักงาน", href: "#", icon: <History size={14}/> },
                               ].map((link, i) => (
                                   <Link key={i} href={link.href} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-900 hover:text-white transition-all group overflow-hidden relative">
                                        <div className="flex items-center gap-3 relative z-10">
                                             <div className="w-8 h-8 rounded-xl bg-slate-50 group-hover:bg-white/10 flex items-center justify-center transition-colors">
                                                 {link.icon}
                                             </div>
                                             <span className="text-[10px] font-black uppercase tracking-widest">{link.label}</span>
                                        </div>
                                        <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all z-10" />
                                   </Link>
                               ))}
                          </div>
                     </div>
                </div>
            </div>
        </div>
    );
}
