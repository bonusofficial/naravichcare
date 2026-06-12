"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Edit2, ShieldCheck, ListChecks, Smartphone } from "lucide-react";
import Link from "next/link";

interface ICoveragePlan {
    _id: string;
    name: string;
    subTitle: string;
    durationText: string;
    durationUnit: string;
    priceMultiplier: number;
    highlights: string[];
    order: number;
    isActive: boolean;
}

export default function CoveragePlansAdmin() {
    const [plans, setPlans] = useState<ICoveragePlan[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const res = await fetch("/api/coverage-plans");
            const data = await res.json();
            setPlans(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("ยืนยันการลบแผนนี้? ข้อมูลนี้จะไม่สามารถกู้คืนได้")) return;
        try {
            const res = await fetch(`/api/coverage-plans/${id}`, { method: "DELETE" });
            if (res.ok) fetchPlans();
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-black text-slate-400 uppercase tracking-widest text-xs">กำลังโหลดข้อมูลแผน...</p>
        </div>
    );

    return (
        <div className="p-4 md:p-8 max-w-[1440px] mx-auto bg-gray-50 min-h-screen font-sans">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 uppercase italic flex items-center gap-3">
                        <ShieldCheck className="text-blue-600" size={32} /> จัดการแผนความคุ้มครอง (Step 3)
                    </h1>
                    <p className="text-slate-400 font-bold text-sm mt-1">จัดการชื่อแผน, สิทธิประโยชน์ และตัวคูณราคาสำหรับหน้าสมัครสมาชิก</p>
                </div>
                <Link
                    href="/admin/coverage-plans/new"
                    className="flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:bg-blue-600 transition-all text-sm uppercase tracking-widest"
                >
                    <Plus size={18} strokeWidth={3} /> สร้างแผนใหม่
                </Link>
            </div>

            {/* Grid Display */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {plans.map((pkg) => (
                    <div key={pkg._id} className="group relative">
                        {/* Admin Tools */}
                        <div className="absolute top-6 right-6 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                            <Link
                                href={`/admin/coverage-plans/${pkg._id}`}
                                className="w-10 h-10 bg-white shadow-2xl rounded-xl flex items-center justify-center text-blue-500 hover:scale-110 active:scale-95 transition-all border border-slate-50"
                            >
                                <Edit2 size={16} />
                            </Link>
                            <button
                                onClick={() => handleDelete(pkg._id)}
                                className="w-10 h-10 bg-white shadow-2xl rounded-xl flex items-center justify-center text-red-500 hover:scale-110 active:scale-95 transition-all border border-slate-50"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>

                        {/* Card UI matching Step 3 design */}
                        <div className={`bg-white rounded-3xl border-2 flex flex-col overflow-hidden shadow-xl shadow-slate-200/50 min-h-[400px] transition-all duration-300 ${pkg.isActive ? 'border-transparent' : 'border-slate-100 grayscale opacity-60'}`}>
                            {/* Status Badge for Inactive */}
                            {!pkg.isActive && (
                                <div className="absolute inset-0 z-[5] bg-slate-100/10 flex items-center justify-center pointer-events-none">
                                    <span className="bg-slate-900 text-white px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-[0.3em] shadow-xl">ปิดใช้งานอยู่</span>
                                </div>
                            )}

                            <div className="bg-gradient-to-r from-blue-700 to-cyan-500 py-3 px-4 text-center">
                                <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mb-1 italic">ตัวคูณ: {pkg.priceMultiplier}</p>
                                <p className="text-[11px] font-black text-white uppercase tracking-widest flex items-center justify-center gap-2">
                                    <Smartphone size={14} /> แผนความคุ้มครอง
                                </p>
                            </div>

                            <div className="bg-blue-50/50 py-3 text-center border-b border-blue-100">
                                <p className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">
                                    [คำนวณตามราคาเครื่อง]
                                </p>
                                <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mt-1.5">{pkg.durationUnit}</p>
                            </div>

                            <div className="p-5 flex-1 space-y-4">
                                <div className="space-y-2">
                                    <h4 className="text-base font-black text-slate-900 leading-tight uppercase italic decoration-blue-500 decoration-2">
                                        {pkg.name}<br />
                                        <span className="text-slate-400 text-base">{pkg.subTitle}</span> <span className="text-blue-600">{pkg.durationText}</span>
                                    </h4>
                                    <div className="flex items-center gap-4">
                                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest py-1 px-3 bg-slate-50 rounded-lg">ลำดับ: {pkg.order}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2 border-b border-slate-50 pb-2">
                                        <ListChecks size={16} className="text-blue-500" /> สิทธิประโยชน์
                                    </p>
                                    <ul className="space-y-3">
                                        {pkg.highlights.map((h, i) => (
                                            <li key={i} className="text-[11px] font-bold text-slate-500 leading-relaxed flex gap-3">
                                                <span className="text-blue-500 shrink-0 text-lg leading-none">•</span>
                                                {h}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {plans.length === 0 && (
                    <div className="col-span-full py-32 bg-white rounded-[3rem] border-4 border-dashed border-slate-50 text-center space-y-6">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                            <ShieldCheck size={48} strokeWidth={1} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest italic">ยังไม่มีแผนในระบบ</h3>
                            <p className="text-slate-300 font-bold text-sm">เริ่มสร้างแผนความคุ้มครองของคุณเพื่อแสดงผลในหน้าสมัครสมาชิก</p>
                        </div>
                        <Link
                            href="/admin/coverage-plans/new"
                            className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-105 transition-all"
                        >
                            + สร้างแผนแรกของคุณ
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
