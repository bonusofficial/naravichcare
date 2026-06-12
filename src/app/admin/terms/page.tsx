"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Save, GripVertical, FileText, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";

interface TermItem {
    _id?: string;
    title: string;
    content: string;
    order: number;
    isActive: boolean;
}

export default function AdminTermsPage() {
    const [items, setItems] = useState<TermItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        fetch("/api/admin/terms")
            .then(r => r.json())
            .then(d => {
                if (d.success) setItems(d.data.items || []);
            })
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        try {
            const res = await fetch("/api/admin/terms", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items }),
            });
            const data = await res.json();
            if (data.success) {
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            }
        } finally {
            setSaving(false);
        }
    };

    const addItem = () => {
        setItems([...items, { title: "", content: "", order: items.length, isActive: true }]);
    };

    const removeItem = (i: number) => {
        if (!confirm("ลบข้อตกลงนี้?")) return;
        setItems(items.filter((_, idx) => idx !== i));
    };

    const updateItem = (i: number, field: keyof TermItem, value: any) => {
        const updated = [...items];
        (updated[i] as any)[field] = value;
        setItems(updated);
    };

    if (loading) return (
        <div className="h-[60vh] flex flex-col items-center justify-center gap-4 opacity-40">
            <Loader2 className="animate-spin text-blue-600" size={48} />
            <p className="font-black uppercase tracking-[0.3em] text-xs">Loading Terms...</p>
        </div>
    );

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                        <FileText className="text-blue-600" size={30} />
                        เงื่อนไขและข้อตกลง
                    </h2>
                    <p className="text-slate-400 text-sm mt-1 font-bold">แก้ไขเนื้อหาที่แสดงในหน้าหลักของเว็บไซต์</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl transition-all
                        ${saved ? "bg-emerald-500 text-white" : "bg-slate-900 hover:bg-blue-600 text-white"}`}
                >
                    {saving ? (
                        <><Loader2 size={18} className="animate-spin" /> กำลังบันทึก...</>
                    ) : saved ? (
                        <><CheckCircle2 size={18} /> บันทึกแล้ว!</>
                    ) : (
                        <><Save size={18} /> บันทึก</>
                    )}
                </button>
            </div>

            {/* Items */}
            <div className="space-y-4">
                {items.map((item, i) => (
                    <div
                        key={i}
                        className={`bg-white rounded-3xl border-2 p-6 space-y-4 shadow-sm transition-all ${item.isActive ? "border-slate-100" : "border-slate-100 opacity-50"}`}
                    >
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 flex-1">
                                <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                                    <GripVertical size={16} className="text-blue-400" />
                                </div>
                                <input
                                    className="flex-1 text-base font-black text-slate-800 bg-transparent border-b-2 border-slate-100 focus:border-blue-400 outline-none py-1 transition-colors"
                                    placeholder="ชื่อหัวข้อ..."
                                    value={item.title}
                                    onChange={e => updateItem(i, "title", e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => updateItem(i, "isActive", !item.isActive)}
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${item.isActive ? "bg-emerald-50 text-emerald-500 hover:bg-emerald-100" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}
                                    title={item.isActive ? "ซ่อน" : "แสดง"}
                                >
                                    {item.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                                </button>
                                <button
                                    onClick={() => removeItem(i)}
                                    className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        <textarea
                            rows={5}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-medium text-slate-600 focus:border-blue-400 outline-none transition-colors resize-none leading-relaxed"
                            placeholder="เนื้อหาของข้อตกลง (ใช้ • สำหรับ bullet point)"
                            value={item.content}
                            onChange={e => updateItem(i, "content", e.target.value)}
                        />
                    </div>
                ))}
            </div>

            {/* Add Button */}
            <button
                onClick={addItem}
                className="w-full py-5 border-2 border-dashed border-slate-200 rounded-3xl text-sm font-black text-slate-400 uppercase tracking-widest hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/30 transition-all flex items-center justify-center gap-2"
            >
                <Plus size={18} /> เพิ่มข้อตกลงใหม่
            </button>
        </div>
    );
}
