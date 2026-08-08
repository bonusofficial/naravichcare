"use client";
import React, { useState } from "react";
import { Users, CreditCard, Plus, TrendingUp, Smartphone, CheckCircle2 } from "lucide-react";

const portfolio = [
    { customer: "คุณมานพ ใจดี", device: "iPhone 15 Pro Max", amount: "฿45,000", paid: 8, total: 24, status: "normal" },
    { customer: "คุณนิภา ท่องโลก", device: "iPhone 14", amount: "฿28,000", paid: 3, total: 12, status: "warning" },
    { customer: "คุณวิชัย ใจดี", device: "iPad Pro", amount: "฿54,000", paid: 12, total: 36, status: "normal" },
];

export default function AgentPortalPage() {
    const [activeTab, setActiveTab] = useState<"portfolio" | "commission" | "new">("portfolio");
    return (
        <div className="max-w-3xl space-y-6">
            <div>
                <h2 className="text-2xl font-black text-gray-800">Agent Portal</h2>
                <p className="text-gray-500 text-sm mt-1">พอร์ตลูกค้า ค่าคอมมิชชั่น และคีย์ใบสมัครใหม่</p>
            </div>

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-3">
                {[{ label: "พอร์ตทั้งหมด", value: "฿2.4M", icon: <TrendingUp size={16} />, color: "text-blue-600 bg-blue-50" }, { label: "ค่าคอมมิชชั่น", value: "฿24,000", icon: <CreditCard size={16} />, color: "text-emerald-600 bg-emerald-50" }, { label: "ลูกค้าทั้งหมด", value: "34 ราย", icon: <Users size={16} />, color: "text-indigo-600 bg-indigo-50" }].map(s => (
                    <div key={s.label} className="bg-white p-4 rounded-xl border border-gray-200">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.color}`}>{s.icon}</div>
                        <p className="text-xl font-black text-gray-800">{s.value}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                    </div>
                ))}
            </div>

            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                {[{ k: "portfolio", l: "📊 พอร์ตลูกค้า" }, { k: "commission", l: "💰 ค่าคอมมิชชั่น" }, { k: "new", l: "➕ ใบสมัครใหม่" }].map(t => (
                    <button key={t.k} onClick={() => setActiveTab(t.k as any)} className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${activeTab === t.k ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"}`}>{t.l}</button>
                ))}
            </div>

            {activeTab === "portfolio" && (
                <div className="space-y-3">
                    {portfolio.map((p, i) => (
                        <div key={i} className="bg-white p-4 rounded-xl border border-gray-200 flex items-center gap-4">
                            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center"><Smartphone size={18} className="text-gray-500" /></div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-800">{p.customer}</p>
                                <p className="text-xs text-gray-500">{p.device} • {p.amount}</p>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${p.status === "normal" ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${(p.paid / p.total) * 100}%` }} /></div>
                                    <span className="text-[10px] text-gray-500">{p.paid}/{p.total} งวด</span>
                                </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${p.status === "normal" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>{p.status === "normal" ? "ปกติ" : "ค้าง"}</span>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === "commission" && (
                <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                    <h4 className="font-bold text-gray-800">ค่าคอมมิชชั่นเดือนนี้</h4>
                    <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-xl text-center">
                        <p className="text-xs text-emerald-600 font-bold mb-1">ยอดรวมค่าคอมมิชชั่น</p>
                        <p className="text-4xl font-black text-emerald-600">฿24,000</p>
                        <p className="text-xs text-gray-500 mt-2">จากสัญญาอนุมัติแล้ว 8 สัญญา</p>
                    </div>
                    <div className="space-y-2">
                        {[{ c: "NC-1001", d: "iPhone 15 Pro Max", com: "฿4,500" }, { c: "NC-1004", d: "iPad Pro M4", com: "฿5,400" }, { c: "NC-1006", d: "iPhone 14 Plus", com: "฿3,200" }].map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div><p className="text-sm font-bold text-gray-800">{item.d}</p><p className="text-xs text-blue-600 font-bold">{item.c}</p></div>
                                <p className="text-sm font-black text-emerald-600">{item.com}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === "new" && (
                <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                    <h4 className="font-bold text-gray-800">คีย์ใบสมัครลูกค้าใหม่</h4>
                    <div className="space-y-3">
                        {[["ชื่อ-นามสกุล", ""], ["เบอร์โทรศัพท์", ""], ["รุ่นมือถือที่ต้องการผ่อน", ""], ["ยอดจัดสินเชื่อ (฿)", ""]].map(([l, p], i) => (
                            <div key={i}><label className="text-xs font-bold text-gray-600 mb-1 block">{l}</label>
                                <input placeholder={p} className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-4 text-sm outline-none" />
                            </div>
                        ))}
                        <button className="w-full py-3 bg-blue-600 text-white font-black rounded-lg text-sm hover:bg-blue-700 flex items-center justify-center gap-2">
                            <CheckCircle2 size={16} /> ส่งใบสมัคร
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
