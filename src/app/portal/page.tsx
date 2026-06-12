"use client";
import React, { useState } from "react";
import { Search, Loader2, ShieldCheck, Smartphone, Calendar, CreditCard, ChevronRight, Download, ReceiptText } from "lucide-react";

export default function CustomerPortal() {
    const [step, setStep] = useState<"search" | "dashboard">("search");
    const [loading, setLoading] = useState(false);
    const [searchData, setSearchData] = useState({ phone: "", idNumber: "" });
    const [portalData, setPortalData] = useState<any>(null);
    const [isCertModalOpen, setIsCertModalOpen] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch("/api/portal/find-loan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(searchData)
            });
            const data = await res.json();
            if (data.success) {
                setPortalData(data);
                setStep("dashboard");
            } else {
                alert(data.error);
            }
        } catch (err) {
            alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
        } finally {
            setLoading(false);
        }
    };

    if (step === "search") {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
                <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
                    <div className="text-center">
                        <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white mx-auto shadow-2xl shadow-blue-200 mb-6">
                            <ShieldCheck size={40} />
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Portal สำหรับลูกค้า</h1>
                        <p className="text-slate-500 text-sm mt-2 font-medium">ตรวจสอบสถานะสัญญา และดาวน์โหลดใบรับรองดิจิทัล</p>
                    </div>

                    <form onSubmit={handleSearch} className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200 border border-slate-100 space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">เบอร์โทรศัพท์ที่ลงทะเบียน</label>
                            <input
                                type="tel"
                                required
                                placeholder="0XX-XXX-XXXX"
                                value={searchData.phone}
                                onChange={(e) => setSearchData({ ...searchData, phone: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-lg font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all placeholder:text-slate-300"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">เลขบัตรประชาชน (4 ตัวท้าย)</label>
                            <input
                                type="password"
                                required
                                placeholder="XXXX"
                                value={searchData.idNumber}
                                onChange={(e) => setSearchData({ ...searchData, idNumber: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-lg font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all placeholder:text-slate-300"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-5 bg-slate-900 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2 group"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} className="group-hover:scale-110 transition-transform" />}
                            ค้นหาข้อมูลสัญญา
                        </button>
                    </form>

                    <p className="text-center text-xs text-slate-400 font-bold uppercase tracking-tighter">
                        หากจำข้อมูลไม่ได้ กรุณาติดต่อตัวแทนจำหน่ายที่ท่านสมัคร
                    </p>
                </div>
            </div>
        );
    }

    const { loan, insurance, payments } = portalData;

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 animate-in slide-in-from-bottom-10 duration-700">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header Info */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setStep("search")} className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm text-slate-400 hover:text-blue-600 transition-all">
                            <ChevronRight className="rotate-180" size={20} />
                        </button>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">{loan.customerName}</h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">สัญญาเลขที่: <span className="text-blue-600">{loan.contractId}</span></p>
                        </div>
                    </div>
                    <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-white shadow-lg ${loan.status === 'normal' ? 'bg-emerald-500 shadow-emerald-100' : 'bg-red-500 shadow-red-100'}`}>
                        {loan.status === 'normal' ? 'สถานะ: ปกติ' : 'สถานะ: เกินกำหนดชำระ'}
                    </div>
                </div>

                {/* Quick Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-500/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                        <Smartphone className="text-blue-500 mb-4" size={24} />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">อุปกรณ์ที่ได้รับสิทธิ์</p>
                        <h3 className="text-xl font-black text-slate-900 uppercase">{loan.deviceModel}</h3>
                        <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase">IMEI: {loan.imei}</p>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                        <Calendar className="text-emerald-500 mb-4" size={24} />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ยอดชำระถัดไป</p>
                        <h3 className="text-xl font-black text-slate-900 uppercase">฿{loan.installmentAmount.toLocaleString()}</h3>
                        <p className="text-[10px] text-emerald-500 font-black mt-2 uppercase italic">ครบกำหนด: {new Date(loan.nextPaymentDate).toLocaleDateString()}</p>
                    </div>

                    <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">ประกันภัย 3 ปี (NC Care+)</p>
                    <h3 className="text-xl font-black text-white uppercase italic">Active Coverage</h3>
                    <button
                        onClick={() => setIsCertModalOpen(true)}
                        className="flex items-center gap-2 mt-3 text-[10px] font-black text-white uppercase tracking-widest bg-white/20 px-3 py-1.5 rounded-lg hover:bg-white/30 transition-all border border-white/20"
                    >
                        <Download size={14} /> ดูใบรับรองดิจิทัล
                    </button>
                </div>
            </div>

            {/* Detailed Sections */}
            <div className="grid lg:grid-cols-2 gap-8">
                {/* Payment History */}
                <div className="space-y-4">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <ReceiptText size={18} className="text-slate-400" />
                        ประวัติการชำระเงิน
                    </h3>
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-4 space-y-3">
                        {payments.length === 0 ? (
                            <p className="text-center py-10 text-[10px] font-black text-slate-400 uppercase tracking-widest">ยังไม่มีรายการชำระ</p>
                        ) : payments.map((p: any) => (
                            <div key={p._id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-white hover:ring-1 hover:ring-slate-100 transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-100 group-hover:border-emerald-500 transition-colors">
                                        <span className="text-xs font-black text-slate-900">{p.installmentNumber}</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-900 uppercase italic">งวดที่ {p.installmentNumber}</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(p.paymentDate).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-emerald-600">฿{p.amount.toLocaleString()}</p>
                                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">สำเร็จ / {p.receiptId}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Insurance Quota */}
                <div className="space-y-4">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <ShieldCheck size={18} className="text-slate-400" />
                        โควตาประกันภัย 3 ปี
                    </h3>
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 space-y-6">
                        {[
                            { label: "จอแตก (Screen)", used: insurance?.quota?.screen?.used, total: insurance?.quota?.screen?.total },
                            { label: "น้ำเข้า / ความเสียหายอื่นๆ", used: insurance?.quota?.water?.used, total: insurance?.quota?.water?.total },
                            { label: "แบตเตอรี่ (Battery)", used: insurance?.quota?.battery?.used, total: insurance?.quota?.battery?.total },
                        ].map(q => (
                            <div key={q.label} className="space-y-3">
                                <div className="flex justify-between items-end">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{q.label}</p>
                                    <p className="text-xs font-black text-slate-900 uppercase">{q.total - q.used} / {q.total} <span className="text-[10px] text-slate-400 italic">Remaining</span></p>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ${q.used >= q.total ? 'bg-red-500' : 'bg-blue-600'}`}
                                        style={{ width: `${((q.total - q.used) / q.total) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                        <div className="pt-4 mt-6 border-t border-slate-50">
                            <p className="text-[9px] text-slate-400 font-bold uppercase leading-relaxed italic text-center">
                                ลูกค้าสามารถแจ้งซ่อม (แจ้งเคลม) ได้ที่ตัวแทนจำหน่ายที่จำหน่ายเครื่องให้ท่าน
                                หรือติดต่อคอลเซ็นเตอร์นราวิชญ์ แคร์ เพื่อคำแนะนำ
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Certificate Modal */}
            {isCertModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
                    <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl p-10 relative overflow-hidden animate-in zoom-in-95 duration-500">
                        {/* Decorative background for certificate */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full -ml-32 -mb-32"></div>

                        <div className="relative z-10 space-y-8">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <h4 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Digital Certificate</h4>
                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Naravich Care+ | Device Insurance</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-slate-900 uppercase">{insurance.policyId}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Issue Date: {new Date(loan.startDate).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div className="py-8 border-y-2 border-slate-50 space-y-6">
                                <div className="grid grid-cols-2 gap-8">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Policy Holder</p>
                                        <p className="text-lg font-black text-slate-900 uppercase">{loan.customerName}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Device Unit</p>
                                        <p className="text-lg font-black text-slate-900 uppercase">{loan.deviceModel}</p>
                                        <p className="text-[10px] font-bold text-slate-500">IMEI: {loan.imei}</p>
                                    </div>
                                </div>

                                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-3 gap-6">
                                    <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Screen Protect</p>
                                        <p className="text-sm font-black text-slate-900 uppercase">{insurance.quota.screen.total} Times</p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Water Damage</p>
                                        <p className="text-sm font-black text-slate-900 uppercase">{insurance.quota.water.total} Times</p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Battery Health</p>
                                        <p className="text-sm font-black text-slate-900 uppercase">{insurance.quota.battery.total} Times</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-end">
                                <div className="space-y-4">
                                    <div className="p-4 border-2 border-slate-100 rounded-2xl w-24 h-24 flex items-center justify-center opacity-40 grayscale">
                                        <img src="/canvas.png" alt="Company Seal" className="w-full object-contain" />
                                    </div>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Signed Digitally by Naravich Care System</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => window.print()} className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200">Print / PDF</button>
                                    <button onClick={() => setIsCertModalOpen(false)} className="px-6 py-3 bg-slate-50 text-slate-400 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest">Close</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
