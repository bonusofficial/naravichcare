"use client";
import React, { useState } from "react";
import { Users, CreditCard, Plus, TrendingUp, Smartphone, CheckCircle2, Loader2, ShieldCheck, MapPin, LogOut, ChevronRight, Search, LayoutDashboard, History, Zap, Bell, Settings, Wallet, X } from "lucide-react";

const WITHDRAWAL_STATUS: Record<string, { label: string; className: string }> = {
    pending: { label: "รอโอน", className: "bg-amber-50 text-amber-600" },
    paid: { label: "โอนแล้ว", className: "bg-emerald-50 text-emerald-600" },
    rejected: { label: "ไม่อนุมัติ", className: "bg-red-50 text-red-500" },
};

const formatBaht = (n: number) => `฿${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

/** The portal-safe agent fields from /api/agent/login (see toAgentView). */
interface AgentView {
    _id: string;
    agentCode: string;
    name: string;
    contactPerson: string;
    bankName: string;
    bankAccountName: string;
    bankAccountMasked: string;
    commissionRate: number;
}

interface AgentRegistration {
    _id: string;
    firstName?: string;
    lastName?: string;
    brand: string;
    model: string;
    packageType?: string;
    policyNumber?: string;
    status: string;
}

/** A withdrawal from /api/agent/withdrawals (see toWithdrawalView). */
interface AgentWithdrawalView {
    _id: string;
    amount: number;
    status: string;
    bankName: string;
    bankAccountName: string;
    bankAccountMasked: string;
    note: string;
    hasSlip: boolean;
    createdAt: string;
    processedAt?: string;
}

interface AgentStats {
    totalVolume: number;
    customerCount: number;
    commission: number;
    registrationCount?: number;
}

export default function AgentPortal() {
    const [step, setStep] = useState<"login" | "dashboard">("login");
    const [loading, setLoading] = useState(false);
    const [agentCode, setAgentCode] = useState("");
    const [agentData, setAgentData] = useState<AgentView | null>(null);
    const [stats, setStats] = useState<AgentStats>({ totalVolume: 0, customerCount: 0, commission: 0 });
    // Loaded with the dashboard but not shown anywhere yet.
    const [recentLoans, setRecentLoans] = useState<unknown[]>([]);
    const [recentRegistrations, setRecentRegistrations] = useState<AgentRegistration[]>([]);
    const [balance, setBalance] = useState({ earned: 0, withdrawn: 0, available: 0 });
    const [withdrawals, setWithdrawals] = useState<AgentWithdrawalView[]>([]);
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [withdrawError, setWithdrawError] = useState("");
    const [withdrawing, setWithdrawing] = useState(false);

    const hasPendingWithdrawal = withdrawals.some((w) => w.status === "pending");

    const fetchWithdrawals = async (id: string) => {
        try {
            const res = await fetch(`/api/agent/withdrawals?agentId=${id}`);
            const data = await res.json();
            if (data.success) {
                setBalance(data.balance);
                setWithdrawals(data.withdrawals || []);
            }
        } catch (e) { console.error(e); }
    };

    const openWithdraw = () => {
        setWithdrawAmount(String(balance.available));
        setWithdrawError("");
        setIsWithdrawOpen(true);
    };

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        // The withdraw form only exists on the dashboard, after login set the agent.
        if (!agentData) return;
        setWithdrawError("");
        setWithdrawing(true);
        try {
            const res = await fetch("/api/agent/withdrawals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ agentId: agentData._id, amount: Number(withdrawAmount) }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setIsWithdrawOpen(false);
                fetchWithdrawals(agentData._id);
            } else {
                setWithdrawError(data.error || "ส่งคำขอถอนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
            }
        } catch {
            setWithdrawError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
        } finally {
            setWithdrawing(false);
        }
    };

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
            const res = await fetch("/api/agent/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ agentCode }),
            });
            const data = await res.json().catch(() => ({}));
            if (data.success) {
                setAgentData(data.agent);
                setStep("dashboard");
                fetchAgentStats(data.agent._id);
                fetchWithdrawals(data.agent._id);
            } else {
                alert(data.error || "ไม่สามารถตรวจสอบรหัสตัวแทนได้ กรุณาติดต่อเจ้าหน้าที่");
            }
        } catch (err) {
            alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
        } finally {
            setLoading(false);
        }
    };

    // Login sets the agent before it switches to the dashboard, and logging out
    // keeps it, so the dashboard below always has one.
    if (step === "login" || !agentData) {
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
                                        onChange={(e) => setAgentCode(e.target.value.toUpperCase())}
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

    // Rendered at the top on phones, where the sidebar column stacks below the
    // insurance list and agents could not find their balance or withdraw button.
    const balanceCard = (
        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ค่าคอมที่ถอนได้</p>
                    <h4 className="text-3xl font-black text-emerald-600 tracking-tight">{formatBaht(balance.available)}</h4>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Wallet size={24} />
                </div>
            </div>
            <div className="space-y-1 text-[11px] font-bold text-slate-500">
                <div className="flex justify-between"><span>ค่าคอมประกันทั้งหมด</span><span>{formatBaht(balance.earned)}</span></div>
                <div className="flex justify-between"><span>ถอนแล้ว / รอโอน</span><span>{formatBaht(balance.withdrawn)}</span></div>
            </div>
            <button
                onClick={openWithdraw}
                disabled={hasPendingWithdrawal || balance.available <= 0 || !agentData.bankAccountMasked}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-slate-900"
            >
                <Wallet size={16} /> ขอถอนค่าคอม
            </button>
            {!agentData.bankAccountMasked ? (
                <p className="text-[10px] font-bold text-red-500 text-center">ยังไม่มีข้อมูลบัญชีธนาคาร กรุณาติดต่อเจ้าหน้าที่</p>
            ) : hasPendingWithdrawal ? (
                <p className="text-[10px] font-bold text-amber-600 text-center">มีคำขอถอนที่รอเจ้าหน้าที่โอนอยู่</p>
            ) : (
                <p className="text-[10px] font-bold text-slate-400 text-center">โอนเข้า {agentData.bankName} {agentData.bankAccountMasked}</p>
            )}
        </div>
    );

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
                <div className="lg:hidden">{balanceCard}</div>

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
                                    <h4 className="text-3xl font-black text-blue-600 tracking-tight">{stats.registrationCount || 0} ราย</h4>
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

                        <div className="flex items-center gap-3">
                            <Wallet size={20} className="text-emerald-500" />
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">ประวัติการถอนค่าคอม</h3>
                        </div>

                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                            {withdrawals.length === 0 ? (
                                <div className="py-12 text-center opacity-40">
                                    <p className="text-xs font-black uppercase tracking-widest">ยังไม่มีรายการถอน</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {withdrawals.map(w => {
                                        const status = WITHDRAWAL_STATUS[w.status] || WITHDRAWAL_STATUS.pending;
                                        return (
                                            <div key={w._id} className="p-6 flex items-center justify-between gap-4">
                                                <div>
                                                    <p className="text-sm font-black text-slate-900">{formatBaht(w.amount)}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                                                        {new Date(w.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })} · {w.bankName} {w.bankAccountMasked}
                                                    </p>
                                                    {w.status === "rejected" && w.note && (
                                                        <p className="text-[10px] font-bold text-red-500 mt-1">เหตุผล: {w.note}</p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    {w.hasSlip && (
                                                        <a
                                                            href={`/api/agent/withdrawals/${w._id}/slip?agentId=${agentData._id}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[10px] font-black text-blue-600 hover:underline"
                                                        >
                                                            ดูสลิป
                                                        </a>
                                                    )}
                                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${status.className}`}>{status.label}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Guide */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="hidden lg:block">{balanceCard}</div>

                        <div className="bg-blue-600 rounded-[2rem] p-8 text-white space-y-6 shadow-xl shadow-blue-100 relative overflow-hidden group">
                            <Zap size={80} className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700" />
                            <h3 className="text-lg font-black uppercase leading-tight relative z-10">คู่มือแนะนำ<br />การส่งใบสมัคร</h3>
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

                        <a
                            href="https://lin.ee/zZVgklN"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all"
                        >
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ต้องการความช่วยเหลือ?</p>
                                <p className="text-sm font-black text-slate-900 uppercase">ฝ่ายดูแลตัวแทน</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                                <Settings size={20} />
                            </div>
                        </a>
                    </div>
                </div>
            </main>

            {isWithdrawOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-[2px]">
                    <form onSubmit={handleWithdraw} className="relative w-full max-w-sm bg-white rounded-[2rem] p-8 shadow-2xl space-y-6 animate-in zoom-in-95">
                        <button type="button" onClick={() => setIsWithdrawOpen(false)} className="absolute top-6 right-6 text-slate-300 hover:text-slate-900 transition-colors">
                            <X size={20} />
                        </button>
                        <div>
                            <h3 className="text-lg font-black text-slate-900">ขอถอนค่าคอม</h3>
                            <p className="text-[11px] font-bold text-slate-400 mt-1">ถอนได้สูงสุด {formatBaht(balance.available)}</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">จำนวนเงิน (บาท)</label>
                            <input
                                type="number"
                                required
                                min="0.01"
                                step="0.01"
                                max={balance.available}
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-5 text-lg font-black text-slate-900 outline-none focus:bg-white focus:border-blue-600 transition-all"
                            />
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4 text-[11px] font-bold text-slate-500 space-y-1">
                            <p>โอนเข้าบัญชี</p>
                            <p className="text-slate-900">{agentData.bankName} {agentData.bankAccountMasked}</p>
                            {agentData.bankAccountName && <p>{agentData.bankAccountName}</p>}
                        </div>
                        {withdrawError && (
                            <p role="alert" className="rounded-xl bg-red-50 border border-red-100 p-3 text-[11px] font-bold text-red-600">{withdrawError}</p>
                        )}
                        <button
                            type="submit"
                            disabled={withdrawing}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                            {withdrawing ? <Loader2 className="animate-spin" size={16} /> : <Wallet size={16} />} ยืนยันการถอน
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
