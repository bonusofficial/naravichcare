"use client";
import React, { useState } from "react";
import { ShieldCheck, Send, Phone, MessageSquare, Monitor, Droplets, Battery } from "lucide-react";

export default function CustomerPortal() {
    const [activeTab, setActiveTab] = useState<"balance" | "insurance" | "repair">("balance");

    const quota = [
        { label: "จอแตก", icon: <Monitor size={18} />, remaining: 1, total: 2, deductible: "฿1,000" },
        { label: "น้ำเข้า", icon: <Droplets size={18} />, remaining: 1, total: 1, deductible: "฿1,500" },
        { label: "แบตเตอรี่", icon: <Battery size={18} />, remaining: 1, total: 1, deductible: "ฟรี" },
    ];

    const payments = [
        { month: "มีนาคม 2569", amount: 1850, due: "25 มี.ค. 69", status: "ยังไม่ถึงกำหนด" },
        { month: "กุมภาพันธ์ 2569", amount: 1850, due: "25 ก.พ. 69", status: "ชำระแล้ว" },
        { month: "มกราคม 2569", amount: 1850, due: "25 ม.ค. 69", status: "ชำระแล้ว" },
    ];

    return (
        <div className="max-w-2xl space-y-6">
            <div className="bg-gradient-to-r from-slate-700 to-slate-900 text-white p-6 rounded-xl">
                <div className="flex items-start justify-between">
                    <div><p className="text-slate-300 text-xs font-bold uppercase tracking-widest mb-1">Customer Portal</p>
                        <h2 className="text-2xl font-black">คุณมานพ ใจดี</h2>
                        <p className="text-slate-300 text-sm mt-1">iPhone 15 Pro Max • NC-1001</p>
                    </div>
                    <div className="text-right"><p className="text-slate-400 text-xs">ประกันคงเหลือ</p><p className="text-2xl font-black text-cyan-400">24 เดือน</p></div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                    <div><p className="text-slate-400 text-xs">งวดถัดไป</p><p className="text-lg font-black">฿1,850 <span className="text-sm font-normal text-slate-400">ภายใน 25 มีนาคม</span></p></div>
                    <button className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700">ชำระงวดนี้</button>
                </div>
            </div>

            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                {[{ k: "balance", l: "💳 ยอดค้างชำระ" }, { k: "insurance", l: "🛡️ สิทธิ์ประกัน" }, { k: "repair", l: "🔧 แจ้งซ่อม" }].map(t => (
                    <button key={t.k} onClick={() => setActiveTab(t.k as any)} className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === t.k ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"}`}>{t.l}</button>
                ))}
            </div>

            {activeTab === "balance" && (
                <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="bg-white p-4 rounded-xl border border-gray-200"><p className="text-xs text-gray-500 mb-1">ยอดผ่อนทั้งหมด</p><p className="text-xl font-black text-gray-800">฿45,000</p></div>
                        <div className="bg-white p-4 rounded-xl border border-gray-200"><p className="text-xs text-gray-500 mb-1">คงเหลืออีก</p><p className="text-xl font-black text-amber-600">฿30,000</p></div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                        {payments.map((p, i) => (
                            <div key={i} className="p-4 flex items-center justify-between">
                                <div><p className="text-sm font-bold text-gray-800">{p.month}</p><p className="text-xs text-gray-500">ครบกำหนด {p.due}</p></div>
                                <div className="text-right"><p className="text-sm font-black text-gray-800">฿{p.amount.toLocaleString()}</p>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${p.status === "ชำระแล้ว" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"}`}>{p.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center justify-between">
                        <p className="text-sm font-semibold text-blue-700">มีปัญหาการชำระ? ติดต่อเจ้าหน้าที่</p>
                        <div className="flex gap-2">
                            <button className="flex items-center gap-1.5 px-3 py-2 bg-[#06C755] text-white font-bold rounded-lg text-xs"><MessageSquare size={12} />LINE</button>
                            <button className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white font-bold rounded-lg text-xs"><Phone size={12} />โทร</button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "insurance" && (
                <div className="space-y-4">
                    <div className="bg-white p-5 rounded-xl border border-gray-200">
                        <div className="flex items-center gap-2 mb-4"><ShieldCheck size={18} className="text-blue-600" /><h4 className="font-bold text-gray-800 text-sm">สิทธิ์ประกันของคุณ</h4></div>
                        <div className="mb-4">
                            <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1.5"><span>อายุประกันที่เหลือ</span><span className="text-blue-600 font-black">24/36 เดือน</span></div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full w-2/3 bg-blue-500 rounded-full"></div></div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                            {quota.map((q, i) => (
                                <div key={i} className={`p-3 rounded-lg border ${q.remaining > 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"} text-center`}>
                                    <div className={`flex justify-center mb-2 ${q.remaining > 0 ? "text-emerald-600" : "text-red-500"}`}>{q.icon}</div>
                                    <p className="text-[10px] font-bold text-gray-700 mb-1">{q.label}</p>
                                    <p className={`text-lg font-black ${q.remaining > 0 ? "text-emerald-600" : "text-red-500"}`}>{q.remaining}/{q.total}</p>
                                    <p className="text-[9px] text-gray-500">{q.deductible}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "repair" && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="p-5 border-b border-gray-100"><h4 className="font-bold text-gray-800">แจ้งซ่อมเบื้องต้น</h4></div>
                    <div className="p-5 space-y-4">
                        <div><label className="text-xs font-bold text-gray-600 mb-1 block">ประเภทปัญหา</label>
                            <select className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-4 text-sm outline-none">
                                <option>เลือกประเภทปัญหา</option><option>จอแตก / หน้าจอ</option><option>น้ำเข้าเครื่อง</option><option>แบตเตอรี่เสื่อม</option>
                            </select>
                        </div>
                        <div><label className="text-xs font-bold text-gray-600 mb-1 block">อธิบายอาการ</label>
                            <textarea rows={3} placeholder="เช่น หน้าจอแตก…" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-4 text-sm outline-none resize-none"></textarea>
                        </div>
                        <button className="w-full py-3 bg-blue-600 text-white font-black rounded-lg text-sm hover:bg-blue-700 flex items-center justify-center gap-2"><Send size={16} />ส่งคำแจ้งซ่อม</button>
                    </div>
                </div>
            )}
        </div>
    );
}
