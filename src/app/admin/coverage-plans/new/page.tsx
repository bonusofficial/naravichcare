"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck, Trash2, ListChecks, Activity } from "lucide-react";
import Link from "next/link";

export default function NewCoveragePlan() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: "",
        subTitle: "",
        durationText: "",
        durationUnit: "",
        priceMultiplier: 0.05,
        highlights: [""],
        quotas: [] as { name: string, maxLimit: number, icon: string }[],
        order: 0,
        isActive: true,
        deviceType: "Smartphone"
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch("/api/coverage-plans", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form)
            });
            if (res.ok) {
                router.push("/admin/coverage-plans");
                router.refresh();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const addHighlight = () => setForm({ ...form, highlights: [...form.highlights, ""] });
    const removeHighlight = (index: number) => setForm({ ...form, highlights: form.highlights.filter((_, i) => i !== index) });
    const updateHighlight = (index: number, value: string) => {
        const updated = [...form.highlights];
        updated[index] = value;
        setForm({ ...form, highlights: updated });
    };

    const addQuota = () => setForm({ ...form, quotas: [...form.quotas, { name: "", maxLimit: 1, icon: "Settings" }] });
    const removeQuota = (index: number) => setForm({ ...form, quotas: form.quotas.filter((_, i) => i !== index) });
    const updateQuota = (index: number, field: string, value: string | number) => {
        const updated = [...form.quotas];
        (updated[index] as any)[field] = value;
        setForm({ ...form, quotas: updated });
    };

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto bg-gray-50 min-h-screen">
            <div className="mb-8">
                <Link
                    href="/admin/coverage-plans"
                    className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors font-bold text-sm uppercase tracking-widest mb-4"
                >
                    <ArrowLeft size={16} /> กลับสู่รายการแผน
                </Link>
                <h1 className="text-3xl font-black text-slate-900 uppercase italic flex items-center gap-3">
                    <ShieldCheck className="text-blue-600" size={32} /> สร้างแผนความคุ้มครองใหม่
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-10 shadow-2xl shadow-slate-200/50 border border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Basic Info */}
                    <div className="col-span-2 space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ชื่อแผน (Title)</label>
                        <input
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 focus:border-blue-500 outline-none transition-all font-bold text-slate-900 text-lg shadow-sm"
                            placeholder="เช่น Naravich Care Plus"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">คำอธิบายรอง (Sub Title)</label>
                        <input
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 focus:border-blue-500 outline-none transition-all font-bold text-slate-900"
                            placeholder="เช่น (จอแตก+ตัวเครื่อง)"
                            value={form.subTitle}
                            onChange={e => setForm({ ...form, subTitle: e.target.value })}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ข้อความระยะเวลา (Duration Text)</label>
                        <input
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 focus:border-blue-500 outline-none transition-all font-bold text-slate-900"
                            placeholder="เช่น (1 ปี), (รายเดือน)"
                            value={form.durationText}
                            onChange={e => setForm({ ...form, durationText: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">หน่วยราคา (Unit)</label>
                        <input
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 focus:border-blue-500 outline-none transition-all font-bold text-slate-900"
                            placeholder="เช่น บาท / ปี, บาท / เดือน"
                            value={form.durationUnit}
                            onChange={e => setForm({ ...form, durationUnit: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ตัวคูณคำนวณราคา (Multiplier)</label>
                        <input
                            type="number" step="0.001"
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 focus:border-blue-500 outline-none transition-all font-black text-blue-600 text-xl"
                            value={form.priceMultiplier}
                            onChange={e => setForm({ ...form, priceMultiplier: Number(e.target.value) })}
                            required
                        />
                        <p className="text-[10px] text-slate-400 font-bold italic mt-1 px-1">ราคา = ราคาเครื่อง x {form.priceMultiplier}</p>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ลำดับการแสดงผล (Order)</label>
                        <input
                            type="number"
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 focus:border-blue-500 outline-none transition-all font-bold text-slate-900"
                            value={form.order}
                            onChange={e => setForm({ ...form, order: Number(e.target.value) })}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ประเภทอุปกรณ์ (Device Type)</label>
                        <select
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 focus:border-blue-500 outline-none transition-all font-bold text-slate-900 appearance-none cursor-pointer"
                            value={form.deviceType}
                            onChange={e => setForm({ ...form, deviceType: e.target.value })}
                            required
                        >
                            <option value="iPhone">iPhone</option>
                            <option value="iPad">iPad</option>
                            <option value="Smartphone">Smartphone (Android)</option>
                            <option value="Tablet">Tablet (Android)</option>
                        </select>
                    </div>

                    {/* Highlights Section */}
                    <div className="col-span-2 space-y-4 pt-4 border-t border-slate-50">
                        <label className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                            <ListChecks size={18} className="text-blue-500" /> สิทธิประโยชน์ไฮไลท์
                        </label>
                        <div className="grid grid-cols-1 gap-3">
                            {form.highlights.map((h, i) => (
                                <div key={i} className="flex gap-3 group animate-in slide-in-from-right-4 duration-300">
                                    <input
                                        className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold text-slate-600 focus:border-blue-500 outline-none transition-all"
                                        value={h}
                                        onChange={e => updateHighlight(i, e.target.value)}
                                        placeholder="ระบุข้อความไฮไลท์ เช่น การซ่อมแซมหน้าจอจากอุบัติเหตุ..."
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeHighlight(i)}
                                        className="w-12 h-12 flex items-center justify-center bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={addHighlight}
                            className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[11px] font-black text-slate-400 uppercase hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/30 transition-all flex items-center justify-center gap-2"
                        >
                            <Plus size={16} /> เพิ่มรายการสิทธิประโยชน์
                        </button>
                    </div>

                    {/* Quotas Section */}
                    <div className="col-span-2 space-y-4 pt-4 border-t border-slate-50">
                        <label className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Activity size={18} className="text-blue-500" /> โควต้าการเคลม (แยกประเภท)
                        </label>
                        <div className="grid grid-cols-1 gap-4">
                            {form.quotas.map((q, i) => (
                                <div key={i} className="flex gap-4 items-end bg-slate-50 p-4 rounded-3xl border border-slate-100 flex-wrap md:flex-nowrap">
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-slate-400">ชื่อประเภท (เช่น จอแตก)</label>
                                        <input
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-400"
                                            value={q.name} onChange={e => updateQuota(i, 'name', e.target.value)} required
                                        />
                                    </div>
                                    <div className="w-24 shrink-0 space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-slate-400">จำนวนครั้ง</label>
                                        <input
                                            type="number" min="1"
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-400"
                                            value={q.maxLimit} onChange={e => updateQuota(i, 'maxLimit', Number(e.target.value))} required
                                        />
                                    </div>
                                    <div className="w-40 shrink-0 space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-slate-400">ไอคอน (Lucide)</label>
                                        <select
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-400"
                                            value={q.icon} onChange={e => updateQuota(i, 'icon', e.target.value)}
                                        >
                                            <option value="Monitor">จอแตก (Monitor)</option>
                                            <option value="Droplets">น้ำเข้า (Droplets)</option>
                                            <option value="Battery">แบตเตอรี่ (Battery)</option>
                                            <option value="Cpu">เมนบอร์ด (Cpu)</option>
                                            <option value="Settings">ตั้งค่า (Settings)</option>
                                        </select>
                                    </div>
                                    <button
                                        type="button" onClick={() => removeQuota(i)}
                                        className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button" onClick={addQuota}
                                className="w-full py-4 border-2 border-dashed border-slate-200 rounded-3xl text-sm font-black text-slate-400 uppercase tracking-widest hover:border-blue-400 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
                            >
                                + เพิ่มโควต้าการเคลม
                            </button>
                        </div>
                    </div>

                    {/* Submit Section */}
                    <div className="col-span-2 pt-8">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full bg-slate-900 text-white py-6 rounded-[1.5rem] font-black text-base uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {loading ? "กำลังบันทึกข้อมูล..." : "บันทึกและสร้างแผนใหม่"}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}

function Plus({ size, className }: { size: number, className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
    )
}
