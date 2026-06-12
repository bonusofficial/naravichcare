"use client";

import { useEffect, useState } from "react";
import { Save, Loader2, CheckCircle2, FileText, Shield, ExternalLink } from "lucide-react";

interface LegalData {
    title: string;
    content: string;
}

interface LegalPagesData {
    privacy: LegalData;
    terms: LegalData;
}

const DEFAULT: LegalPagesData = {
    privacy: { title: "นโยบายความเป็นส่วนตัว", content: "" },
    terms: { title: "เงื่อนไขการใช้บริการ", content: "" },
};

export default function AdminLegalPagesPage() {
    const [data, setData] = useState<LegalPagesData>(DEFAULT);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        fetch("/api/admin/legal-pages")
            .then(r => r.json())
            .then(d => { if (d.success) setData({ ...DEFAULT, ...d.data }); })
            .finally(() => setLoading(false));
    }, []);

    const setPrivacy = (field: keyof LegalData) => (value: string) =>
        setData(prev => ({ ...prev, privacy: { ...prev.privacy, [field]: value } }));
    const setTerms = (field: keyof LegalData) => (value: string) =>
        setData(prev => ({ ...prev, terms: { ...prev.terms, [field]: value } }));

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        try {
            const res = await fetch("/api/admin/legal-pages", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            const result = await res.json();
            if (result.success) {
                setData(prev => ({ ...prev, ...result.data }));
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="h-[60vh] flex flex-col items-center justify-center gap-4 opacity-40">
            <Loader2 className="animate-spin text-blue-600" size={48} />
            <p className="font-black uppercase tracking-[0.3em] text-xs">Loading...</p>
        </div>
    );

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                        <FileText className="text-blue-600" size={30} />
                        นโยบาย & เงื่อนไข
                    </h2>
                    <p className="text-slate-400 text-sm mt-1 font-bold">แก้ไขหน้านโยบายความเป็นส่วนตัว และเงื่อนไขการใช้บริการ</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl transition-all
                        ${saved ? "bg-emerald-500 text-white" : "bg-slate-900 hover:bg-blue-600 text-white"}`}
                >
                    {saving ? <><Loader2 size={18} className="animate-spin" /> กำลังบันทึก...</>
                        : saved ? <><CheckCircle2 size={18} /> บันทึกแล้ว!</>
                            : <><Save size={18} /> บันทึก</>}
                </button>
            </div>

            {/* Privacy */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                            <Shield size={18} />
                        </div>
                        <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">นโยบายความเป็นส่วนตัว</h3>
                    </div>
                    <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                        ดูหน้า <ExternalLink size={12} />
                    </a>
                </div>
                <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">หัวข้อ</label>
                    <input
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-800 focus:border-blue-400 outline-none"
                        value={data.privacy.title}
                        onChange={e => setPrivacy("title")(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">เนื้อหา</label>
                    <textarea
                        rows={12}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:border-blue-400 outline-none resize-y leading-relaxed"
                        placeholder="เขียนเนื้อหานโยบายความเป็นส่วนตัว... (ขึ้นบรรทัดใหม่ได้)"
                        value={data.privacy.content}
                        onChange={e => setPrivacy("content")(e.target.value)}
                    />
                </div>
            </div>

            {/* Terms */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center shrink-0">
                            <FileText size={18} />
                        </div>
                        <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">เงื่อนไขการใช้บริการ</h3>
                    </div>
                    <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                        ดูหน้า <ExternalLink size={12} />
                    </a>
                </div>
                <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">หัวข้อ</label>
                    <input
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-800 focus:border-blue-400 outline-none"
                        value={data.terms.title}
                        onChange={e => setTerms("title")(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">เนื้อหา</label>
                    <textarea
                        rows={12}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:border-blue-400 outline-none resize-y leading-relaxed"
                        placeholder="เขียนเนื้อหาเงื่อนไขการใช้บริการ... (ขึ้นบรรทัดใหม่ได้)"
                        value={data.terms.content}
                        onChange={e => setTerms("content")(e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
}
