"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Save, GripVertical, Table, Eye, EyeOff, Loader2, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

interface ServiceRow {
    _id?: string;
    request: string;
    delivery: string;
    area: string;
    shade: boolean;
}

export default function AdminServiceRequestPage() {
    const [title, setTitle] = useState("");
    const [subtitle, setSubtitle] = useState("");
    const [columns, setColumns] = useState<string[]>(["", "", ""]);
    const [rows, setRows] = useState<ServiceRow[]>([]);
    const [footer, setFooter] = useState("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        fetch("/api/admin/service-request")
            .then(r => r.json())
            .then(d => {
                if (d.success) {
                    setTitle(d.data.title || "");
                    setSubtitle(d.data.subtitle || "");
                    setColumns(d.data.columns || ["", "", ""]);
                    setRows(d.data.rows || []);
                    setFooter(d.data.footer || "");
                }
            })
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        try {
            const res = await fetch("/api/admin/service-request", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, subtitle, columns, rows, footer }),
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

    const addRow = () => {
        setRows([...rows, { request: "", delivery: "", area: "", shade: false }]);
    };

    const removeRow = (i: number) => {
        if (!confirm("ลบแถวนี้?")) return;
        setRows(rows.filter((_, idx) => idx !== i));
    };

    const updateRow = (i: number, field: keyof ServiceRow, value: any) => {
        const updated = [...rows];
        (updated[i] as any)[field] = value;
        setRows(updated);
    };

    const updateColumn = (i: number, value: string) => {
        const updated = [...columns];
        updated[i] = value;
        setColumns(updated);
    };

    const moveRow = (i: number, dir: 'up' | 'down') => {
        if (dir === 'up' && i === 0) return;
        if (dir === 'down' && i === rows.length - 1) return;
        const updated = [...rows];
        const j = dir === 'up' ? i - 1 : i + 1;
        [updated[i], updated[j]] = [updated[j], updated[i]];
        setRows(updated);
    };

    if (loading) return (
        <div className="h-[60vh] flex flex-col items-center justify-center gap-4 opacity-40">
            <Loader2 className="animate-spin text-blue-600" size={48} />
            <p className="font-black uppercase tracking-[0.3em] text-xs">Loading Service Data...</p>
        </div>
    );

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                        <Table className="text-blue-600" size={30} />
                        จัดการตารางคำขอรับบริิการ (Service Request)
                    </h2>
                    <p className="text-slate-400 text-sm mt-1 font-bold">แก้ไขข้อมูลในตาราง เปลี่ยนเครื่อง/ซ่อมแซมเครื่อง</p>
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

            {/* General Info */}
            <div className="bg-white rounded-3xl p-8 border-2 border-slate-100 space-y-6 shadow-sm">
                <h3 className="text-lg font-black text-slate-800 uppercase italic border-b-2 border-slate-50 pb-3">หัวข้อและส่วนประกอบทั่วไป</h3>
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Subtitle (เล็ก)</label>
                        <input
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:border-blue-400 outline-none transition-all"
                            value={subtitle}
                            onChange={e => setSubtitle(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Title (ใหญ่)</label>
                        <input
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:border-blue-400 outline-none transition-all"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Footer (ล่างตาราง)</label>
                    <input
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:border-blue-400 outline-none transition-all"
                        value={footer}
                        onChange={e => setFooter(e.target.value)}
                    />
                </div>
            </div>

            {/* Columns Manage */}
            <div className="bg-white rounded-3xl p-8 border-2 border-slate-100 space-y-6 shadow-sm font-bold">
                <h3 className="text-lg font-black text-slate-800 uppercase italic border-b-2 border-slate-50 pb-3">หัวข้อคอลัมน์ (3 คอลัมน์)</h3>
                <div className="grid grid-cols-3 gap-4">
                    {columns.map((col, i) => (
                        <div key={i} className="space-y-2">
                            <label className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] ml-1">คอลัมน์ {i + 1}</label>
                            <textarea
                                rows={2}
                                className="w-full bg-blue-50/50 border border-blue-100 rounded-xl px-4 py-3 text-sm font-bold text-blue-800 focus:border-blue-400 outline-none transition-all resize-none"
                                value={col}
                                onChange={e => updateColumn(i, e.target.value)}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Rows Manage */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-4">
                    <h3 className="text-lg font-black text-slate-800 uppercase italic tracking-wider">ข้อมูลแต่ละแถว (Rows)</h3>
                    <button
                        onClick={addRow}
                        className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                    >
                        <Plus size={16} /> เพิ่มแถวใหม่
                    </button>
                </div>

                <div className="space-y-6">
                    {rows.map((row, i) => (
                        <div
                            key={i}
                            className={`bg-white rounded-3xl border-2 p-8 shadow-md transition-all relative group ${row.shade ? "bg-slate-50/50 border-slate-200" : "border-slate-100"}`}
                        >
                            {/* Controls */}
                            <div className="absolute top-6 right-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                <button
                                    onClick={() => moveRow(i, 'up')}
                                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-200 transition-all"
                                >
                                    <ChevronUp size={16} />
                                </button>
                                <button
                                    onClick={() => moveRow(i, 'down')}
                                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-200 transition-all"
                                >
                                    <ChevronDown size={16} />
                                </button>
                                <button
                                    onClick={() => updateRow(i, 'shade', !row.shade)}
                                    className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${row.shade ? "bg-blue-500 text-white border-blue-500" : "bg-white text-slate-300 border-slate-200"}`}
                                    title="สลับพื้นหลัง"
                                >
                                    <GripVertical size={16} />
                                </button>
                                <button
                                    onClick={() => removeRow(i)}
                                    className="w-8 h-8 rounded-lg bg-red-50 text-red-500 border border-red-100 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">{columns[0] || 'ช่อง 1'}</label>
                                    <textarea
                                        rows={3}
                                        className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-blue-700 focus:border-blue-500 outline-none transition-all resize-none"
                                        placeholder="คำขอ..."
                                        value={row.request}
                                        onChange={e => updateRow(i, 'request', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{columns[1] || 'ช่อง 2'}</label>
                                    <textarea
                                        rows={3}
                                        className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium text-slate-600 focus:border-blue-500 outline-none transition-all resize-none font-bold"
                                        placeholder="ระยะเวลา..."
                                        value={row.delivery}
                                        onChange={e => updateRow(i, 'delivery', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{columns[2] || 'ช่อง 3'}</label>
                                    <textarea
                                        rows={6}
                                        className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium text-slate-600 focus:border-blue-500 outline-none transition-all resize-none leading-relaxed"
                                        placeholder="พื้นที่..."
                                        value={row.area}
                                        onChange={e => updateRow(i, 'area', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-center pt-10">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`flex items-center gap-4 px-12 py-5 rounded-[2rem] font-black text-lg uppercase tracking-widest shadow-2xl transition-all hover:scale-105 active:scale-95
                        ${saved ? "bg-emerald-500 text-white" : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200"}`}
                >
                    {saving ? (
                        <><Loader2 size={24} className="animate-spin" /> กำลังบันทึกข้อมูล...</>
                    ) : saved ? (
                        <><CheckCircle2 size={24} /> บันทึกสำเร็จ!</>
                    ) : (
                        <><Save size={24} /> บันทึกการเปลี่ยนแปลง</>
                    )}
                </button>
            </div>
        </div>
    );
}
