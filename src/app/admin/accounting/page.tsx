"use client";
import React, { useState, useEffect } from "react";
import { Info, Receipt, Calendar, Loader2, Wrench } from "lucide-react";

export default function AccountingPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/admin/accounting")
            .then(res => res.json())
            .then(json => {
                if (json.success) setData(json);
                setLoading(false);
            });
    }, []);

    if (loading) return (
        <div className="h-[60vh] flex flex-col items-center justify-center gap-4 opacity-40">
            <Loader2 className="animate-spin text-blue-600" size={48} />
            <p className="font-black uppercase tracking-[0.3em] text-xs">Loading Accounting Data...</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase underline decoration-blue-600/30">สรุปรายได้และค่าใช้จ่าย</h2>
                <p className="text-slate-500 text-sm mt-1 font-black uppercase tracking-widest opacity-40 italic">Insurance Sales & Claims Accounting</p>
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-emerald-50 p-8 rounded-3xl border border-emerald-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Info size={48} /></div>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">รายได้ (ขายประกัน)</p>
                    <p className="text-3xl font-black text-emerald-800 tracking-tight">฿{data.totalInsuranceSales.toLocaleString()}</p>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-emerald-500 uppercase">
                        <span className="bg-emerald-100 px-2 py-0.5 rounded-full text-emerald-600">INCOME</span>
                    </div>
                </div>
                <div className="bg-rose-50 p-8 rounded-3xl border border-rose-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Receipt size={48} /></div>
                    <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">รายจ่ายสุทธิ (เครม - ดีดัค)</p>
                    <p className="text-3xl font-black text-rose-800 tracking-tight">
                        {data.netClaimExpense < 0 ? "+" : ""}฿{Math.abs(data.netClaimExpense).toLocaleString()}
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-rose-500 uppercase italic">
                        <span>อะไหล่: {data.totalPartsCost.toLocaleString()} - รับเงิน: {data.totalDeductibleAmount.toLocaleString()}</span>
                    </div>
                </div>
                <div className="bg-blue-900 p-8 rounded-3xl shadow-2xl shadow-blue-200 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Calendar size={48} className="text-white" /></div>
                    <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest mb-1">กำไรสุทธิ</p>
                    <p className="text-3xl font-black text-white tracking-tight">฿{(data.totalInsuranceSales - data.netClaimExpense).toLocaleString()}</p>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-blue-300 uppercase">
                        <span className="bg-blue-500/20 px-2 py-0.5 rounded-full text-blue-200">NET PROFIT</span>
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 mt-8">
                {/* Legend / Info */}
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                    <div className="flex items-center gap-2 text-slate-800">
                        <Info size={18} />
                        <h3 className="font-black uppercase italic">Accounting Logic</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                            <span className="text-sm font-bold text-slate-500">รวมยอดขายประกัน (Premium)</span>
                            <span className="font-black text-emerald-600">฿{data.totalInsuranceSales.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                            <span className="text-sm font-bold text-slate-500">ต้นทุนอะไหล่รวม</span>
                            <span className="font-black text-rose-600">฿{data.totalPartsCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                            <span className="text-sm font-bold text-slate-500">เงิน Deductible ที่รับมา</span>
                            <span className="font-black text-blue-600">฿{data.totalDeductibleAmount.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Recent Items */}
                <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden">
                    <h3 className="font-black mb-6 flex items-center gap-2 uppercase italic tracking-wider">
                        <Receipt size={18} className="text-blue-400" /> เคสเคลมล่าสุด (Recent Claims)
                    </h3>
                    <div className="space-y-4 relative z-10">
                        {data.recentClaims.map((item: any, i: number) => (
                            <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400">
                                        <Wrench size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black uppercase italic">{item.deviceModel}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">{item.customerName} • {new Date(item.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-rose-400">-฿{item.parts.reduce((sum: number, p: any) => sum + (p.qty * p.unitCost), 0).toLocaleString()}</p>
                                    <p className="text-[10px] text-emerald-400 font-bold">+฿{(item.deductibleAmount || 0).toLocaleString()} (Ded)</p>
                                </div>
                            </div>
                        ))}
                        {data.recentClaims.length === 0 && (
                            <p className="text-center text-slate-500 italic py-10 font-bold">ยังไม่มีข้อมูลการเคลม</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
