"use client";
import React, { useState } from "react";
import { Users, CreditCard, Plus, TrendingUp, Smartphone, CheckCircle2, Loader2, ShieldCheck, MapPin, LogOut, ChevronRight, Search, LayoutDashboard, History, Zap, Bell, Settings } from "lucide-react";

export default function AgentPortal() {
    const [step, setStep] = useState<"login" | "dashboard">("login");
    const [loading, setLoading] = useState(false);
    const [agentCode, setAgentCode] = useState("");
    const [agentData, setAgentData] = useState<any>(null);
    const [stats, setStats] = useState({ totalVolume: 0, customerCount: 0, commission: 0 });
    const [recentLoans, setRecentLoans] = useState<any[]>([]);
    const [recentRegistrations, setRecentRegistrations] = useState<any[]>([]);

    const fetchAgentStats = async (id: string) => {
        try {
            const res = await fetch(`/api/agent/dashboard?agentId=${id}`);
            const data = await res.json();
            if (data.success) {
                setStats(data.stats);
                setRecentLoans(data.recentLoans || []);
                setRecentRegistrations(data.recentRegistrations || []);
            }
        } catch (e) { console.error(e); }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/agents`);
            const data = await res.json();
            if (data.success) {
                const found = data.agents.find((a: any) => a.agentCode === agentCode);
                if (found) {
                    setAgentData(found);
                    setStep("dashboard");
                    fetchAgentStats(found._id);
                } else {
                    alert("ไม่พบรหัสตัวแทนนี้ในระบบ");
                }
            }
        } catch (err) {
            alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
        } finally {
            setLoading(false);
        }
    };

    if (step === "login") {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-6 relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 z-0 opacity-[0.03] select-none pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                </div>

                <div className="w-full max-w-md relative z-10 space-y-10 animate-in fade-in zoom-in-95 duration-700">
                    <div className="text-center space-y-6">
                        <img
                            src="/logo/logonavarich.png"
                            alt="Naravich Care Logo"
                            className="h-24 mx-auto object-contain drop-shadow-sm"
                        />
                        <div className="space-y-1">
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Agent Portal</h1>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">ระบบบริหารจัดการสำหรับตัวแทนจำหน่าย</p>
                        </div>
                    </div>

                    <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-100 space-y-8">
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">รหัสตัวแทนจำหน่าย (Agent Code)</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                        <ShieldCheck size={20} className="text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        placeholder="AG-XXXX"
                                        value={agentCode}
                                        onChange={(e) => setAgentCode(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4.5 pl-14 pr-6 text-lg font-black text-slate-900 outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-300 uppercase tracking-widest"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-5 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-blue-600 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 group"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} className="fill-current" />}
                                {loading ? "กำลังตรวจสอบข้อมูล..." : "เข้าสู่ระบบตัวแทน"}
                            </button>
                        </form>
                    </div>

                    <div className="text-center">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-relaxed">
                            สิทธิ์การเข้าถึงเฉพาะพนักงานและตัวแทน Naravich Care เท่านั้น<br />
                            © 2024 NARAVICH CARE CO., LTD.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col animate-in fade-in duration-700">
            {/* Top Navigation */}
            <nav className="h-20 bg-white border-b border-slate-100 px-6 md:px-12 flex items-center justify-between sticky top-0 z-40">
                <div className="flex items-center gap-6">
                    <img
                        src="/logo/logonavarich.png"
                        alt="Logo"
                        className="h-10 object-contain"
                    />
                    <div className="w-px h-8 bg-slate-100 hidden sm:block"></div>
                    <div className="hidden sm:block">
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">{agentData.name}</h2>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                            <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.1em]">{agentData.agentCode}</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors relative">
                        <Bell size={20} />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>
                    </button>
                    <button
                        onClick={() => setStep("login")}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-all group"
                    >
                        <LogOut size={16} />
                        ออกจากระบบ
                    </button>
                </div>
            </nav>

            <main className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full space-y-10">
                {/* Dashboard Section */}
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Agent Performance</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">สรุปภาพรวมผลงานและความเคลื่อนไหวล่าสุด</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:border-blue-500 transition-all">
                            <div className="relative z-10 space-y-6">
                                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                                    <TrendingUp size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ยอดจัดสินเชื่อรวม</p>
                                    <h4 className="text-3xl font-black text-slate-900 tracking-tight">฿{stats.totalVolume.toLocaleString()}</h4>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:border-emerald-500 transition-all">
                            <div className="relative z-10 space-y-6">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                    <CreditCard size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ค่าคอมมิชชั่นสะสม</p>
                                    <h4 className="text-3xl font-black text-emerald-600 tracking-tight">฿{stats.commission.toLocaleString()}</h4>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:border-slate-900 transition-all">
                            <div className="relative z-10 space-y-6">
                                <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white">
                                    <Users size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">จำนวนลูกค้าผ่อนเครื่อง</p>
                                    <h4 className="text-3xl font-black text-slate-900 tracking-tight">{stats.customerCount} ราย</h4>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:border-blue-600 transition-all">
                            <div className="relative z-10 space-y-6">
                                <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white">
                                    <ShieldCheck size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">จำนวนลูกค้าประกัน</p>
                                    <h4 className="text-3xl font-black text-blue-600 tracking-tight">{(stats as any).registrationCount || 0} ราย</h4>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid lg:grid-cols-12 gap-8">
                    {/* Insurance Activities */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="flex items-center gap-3">
                            <ShieldCheck size={20} className="text-blue-500" />
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">ประกันกรมธรรม์ล่าสุด (Insurance)</h3>
                        </div>

                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden min-h-[300px]">
                            {recentRegistrations.length === 0 ? (
                                <div className="py-24 flex flex-col items-center justify-center opacity-30">
                                    <Smartphone size={48} className="text-slate-200 mb-4" />
                                    <p className="text-xs font-black uppercase tracking-widest">ยังไม่มีรายการประกัน</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {recentRegistrations.map(reg => (
                                        <div key={reg._id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-black text-xs uppercase transition-all">
                                                    {reg.firstName?.substring(0, 1)}{reg.lastName?.substring(0, 1)}
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-slate-900 uppercase">{reg.firstName} {reg.lastName}</h4>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{reg.brand} {reg.model}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-8">
                                                <div className="text-right">
                                                    <p className="text-xs font-black text-slate-900">{reg.packageType}</p>
                                                    <p className="text-[9px] font-black text-blue-600 uppercase mt-0.5">{reg.policyNumber || "รออนุมัติ"}</p>
                                                </div>
                                                <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${reg.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                    {reg.status}
                                                </div>
                                                <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-900 transition-all" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Guide */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-blue-600 rounded-[2rem] p-8 text-white space-y-6 shadow-xl shadow-blue-100 relative overflow-hidden group">
                            <Zap size={80} className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700" />
                            <h3 className="text-lg font-black uppercase italic leading-tight relative z-10">คู่มือแนะนำ<br />การส่งใบสมัคร</h3>
                            <ul className="space-y-4 relative z-10">
                                {[
                                    "ตรวจสอบเลข IMEI ให้ถูกต้อง",
                                    "รูปถ่ายบัตรประชาชนต้องชัดเจน",
                                    "ระบุเบอร์โทรที่ติดต่อได้จริง",
                                    "ตรวจสอบยอดจัดตามเงื่อนไข"
                                ].map((step, i) => (
                                    <li key={i} className="flex items-start gap-3 text-[11px] font-bold text-blue-50">
                                        <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                                        {step}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm flex items-center justify-between group">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ต้องการความช่วยเหลือ?</p>
                                <p className="text-sm font-black text-slate-900 uppercase">ฝ่ายดูแลตัวแทน</p>
                            </div>
                            <button className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                                <Settings size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
