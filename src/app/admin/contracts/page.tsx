"use client";
import React, { useState } from "react";
import { FileText, Download, Eye, Plus, Search, CheckCircle2, AlertCircle } from "lucide-react";

const contracts = [
    { id: "NC-1001", customer: "คุณมานพ ใจดี", device: "iPhone 15 Pro Max", type: "ผ่อน 24 เดือน", date: "10 ม.ค. 2569", agent: "AG-001", docs: 6, status: "complete" },
    { id: "NC-1002", customer: "คุณรัตนา แช่ลี้", device: "iPhone 14 Plus", type: "ผ่อน 12 เดือน", date: "5 ธ.ค. 2568", agent: "AG-002", docs: 4, status: "incomplete" },
    { id: "NC-1004", customer: "คุณนารี สดใส", device: "iPad Pro M4", type: "ผ่อน 36 เดือน", date: "15 ส.ค. 2568", agent: "AG-003", docs: 6, status: "complete" },
];

const requiredDocs = ["รูปเครื่องมุมซ้ายหน้า", "รูปเครื่องมุมขวาหน้า", "รูปเครื่องหลัง", "รูปเครื่องมุมล่าง", "ผลสุขภาพแบต", "ใบสัญญาลงนาม"];

export default function ContractsPage() {
    const [search, setSearch] = useState("");

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-gray-800">เอกสารสัญญา (Contracts)</h2>
                    <p className="text-gray-500 text-sm mt-1">บังคับอัปโหลด 6 รูป ออกใบรับรองดิจิทัล ส่งผ่าน LINE/SMS</p>
                </div>
                <button className="flex items-center gap-2 bg-blue-600 text-white font-bold px-5 py-2.5 rounded-lg text-sm hover:bg-blue-700"><Plus size={16} />สร้างสัญญาใหม่</button>
            </div>

            {/* Required docs */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                <div className="flex items-center gap-2 text-blue-800 mb-3">
                    <FileText size={16} className="text-blue-500" />
                    <p className="text-sm font-bold">เอกสารบังคับ 6 รายการ</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {requiredDocs.map((d, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-blue-700 font-semibold">
                            <CheckCircle2 size={13} className="text-blue-400 shrink-0" />{d}
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200">
                <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input type="text" placeholder="ค้นหาเลขสัญญา หรือชื่อลูกค้า..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 pl-9 pr-4 text-sm outline-none" />
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>{["สัญญา", "ลูกค้า", "อุปกรณ์", "Agent", "เอกสาร", "สถานะ", "จัดการ"].map(h => (
                                <th key={h} className="px-5 py-3.5 text-[11px] font-black text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                            ))}</tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {contracts.filter(c => !search || c.customer.includes(search) || c.id.includes(search)).map((c) => (
                                <tr key={c.id} className="hover:bg-blue-50/10">
                                    <td className="px-5 py-4"><p className="text-sm font-black text-blue-600">{c.id}</p><p className="text-xs text-gray-400">{c.date}</p></td>
                                    <td className="px-5 py-4 text-sm font-bold text-gray-800">{c.customer}</td>
                                    <td className="px-5 py-4 text-sm text-gray-600">{c.device}</td>
                                    <td className="px-5 py-4 text-xs font-bold text-blue-600">{c.agent}</td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${c.docs === 6 ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${(c.docs / 6) * 100}%` }} /></div>
                                            <span className="text-xs text-gray-500">{c.docs}/6</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-1.5">
                                            {c.status === "complete" ? (
                                                <CheckCircle2 size={12} className="text-emerald-500" />
                                            ) : (
                                                <AlertCircle size={12} className="text-amber-500" />
                                            )}
                                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${c.status === "complete" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                                                {c.status === "complete" ? "ครบถ้วน" : "ไม่ครบ"}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Eye size={15} /></button>
                                            <button className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"><Download size={15} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
