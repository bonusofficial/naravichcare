"use client";

import { useEffect, useState } from "react";
import { Save, Loader2, CheckCircle2, MessageCircle, Plus, Trash2, GripVertical, Eye, EyeOff, Facebook, Phone, MessageSquare, Mail } from "lucide-react";

type IconType = "facebook" | "line" | "phone" | "email";

interface ContactMethod {
    iconType: IconType;
    label: string;
    desc: string;
    href: string;
    isActive: boolean;
    order: number;
}

interface FloatingChatData {
    brandName: string;
    greetingText: string;
    footerText: string;
    contacts: ContactMethod[];
}

const DEFAULT: FloatingChatData = {
    brandName: "NaravichCare",
    greetingText: "สวัสดีค่ะ! ยินดีต้อนรับสู่ NaravichCare\nต้องการสอบถามบริการไหน เลือกได้เลยค่ะ",
    footerText: "Official Support Channel • Mon-Sun 09:00-18:00",
    contacts: [
        { iconType: "facebook", label: "Chat with us", desc: "Facebook Messenger", href: "https://m.me/naravichcare", isActive: true, order: 0 },
        { iconType: "line", label: "Add friend", desc: "@naravichcare", href: "https://line.me/ti/p/naravichcare", isActive: true, order: 1 },
        { iconType: "phone", label: "Call Support", desc: "02-XXX-XXXX", href: "tel:+66XXXXXXXXX", isActive: true, order: 2 },
    ],
};

const ICON_OPTIONS: { value: IconType; label: string; icon: React.ReactNode }[] = [
    { value: "facebook", label: "Facebook", icon: <Facebook size={16} className="text-[#0084FF]" /> },
    { value: "line", label: "LINE", icon: <MessageSquare size={16} className="text-[#06C755]" /> },
    { value: "phone", label: "โทรศัพท์", icon: <Phone size={16} className="text-blue-600" /> },
    { value: "email", label: "Email", icon: <Mail size={16} className="text-orange-500" /> },
];

function Field({ label, value, onChange, hint, multiline }: {
    label: string; value: string; onChange: (v: string) => void; hint?: string; multiline?: boolean;
}) {
    return (
        <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">{label}</label>
            {multiline ? (
                <textarea
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-800 focus:border-blue-400 focus:bg-white outline-none transition-colors resize-none leading-relaxed"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                />
            ) : (
                <input
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-800 focus:border-blue-400 focus:bg-white outline-none transition-colors"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                />
            )}
            {hint && <p className="text-[10px] text-slate-400 font-medium">{hint}</p>}
        </div>
    );
}

export default function AdminFloatingChatPage() {
    const [data, setData] = useState<FloatingChatData>(DEFAULT);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        fetch("/api/admin/floating-chat")
            .then(r => r.json())
            .then(d => { if (d.success) setData({ ...DEFAULT, ...d.data, contacts: d.data.contacts ?? DEFAULT.contacts }); })
            .finally(() => setLoading(false));
    }, []);

    const setField = (key: keyof Omit<FloatingChatData, "contacts">) => (value: string) =>
        setData(prev => ({ ...prev, [key]: value }));

    const updateContact = (i: number, field: keyof ContactMethod, value: any) => {
        const updated = [...data.contacts];
        (updated[i] as any)[field] = value;
        setData(prev => ({ ...prev, contacts: updated }));
    };

    const removeContact = (i: number) => {
        if (!confirm("ลบช่องทางนี้?")) return;
        setData(prev => ({ ...prev, contacts: prev.contacts.filter((_, idx) => idx !== i) }));
    };

    const addContact = () => {
        const newContact: ContactMethod = {
            iconType: "phone",
            label: "ติดต่อเรา",
            desc: "ข้อความแสดง",
            href: "",
            isActive: true,
            order: data.contacts.length,
        };
        setData(prev => ({ ...prev, contacts: [...prev.contacts, newContact] }));
    };

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        try {
            const res = await fetch("/api/admin/floating-chat", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            const result = await res.json();
            if (result.success) {
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
        <div className="space-y-6 max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                        <MessageCircle className="text-blue-600" size={30} />
                        Floating Chat
                    </h2>
                    <p className="text-slate-400 text-sm mt-1 font-bold">ตั้งค่าปุ่มแชทและช่องทางติดต่อ</p>
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

            {/* General Info */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                        <MessageCircle size={18} />
                    </div>
                    <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">ข้อมูลทั่วไป</h3>
                </div>
                <Field label="ชื่อแบรนด์" value={data.brandName} onChange={setField("brandName")} hint='เช่น "NaravichCare"' />
                <Field label="ข้อความทักทาย" value={data.greetingText} onChange={setField("greetingText")} multiline hint="ขึ้นบรรทัดใหม่ด้วย Enter" />
                <Field label="ข้อความ Footer" value={data.footerText} onChange={setField("footerText")} hint='เช่น "Mon-Sun 09:00-18:00"' />
            </div>

            {/* Contact Methods */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                            <Phone size={18} />
                        </div>
                        <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">ช่องทางติดต่อ</h3>
                    </div>
                    <span className="text-[11px] text-slate-400 font-bold">{data.contacts.filter(c => c.isActive).length} ช่องทาง active</span>
                </div>

                <div className="space-y-3">
                    {data.contacts.map((contact, i) => (
                        <div
                            key={i}
                            className={`rounded-2xl border-2 p-4 space-y-3 transition-all ${contact.isActive ? "border-slate-100 bg-slate-50/50" : "border-slate-100 bg-white opacity-50"}`}
                        >
                            {/* Row 1: icon + actions */}
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white rounded-xl border border-slate-200 flex items-center justify-center shrink-0">
                                    <GripVertical size={14} className="text-slate-300" />
                                </div>

                                {/* Icon type selector */}
                                <div className="flex gap-1.5 flex-1">
                                    {ICON_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => updateContact(i, "iconType", opt.value)}
                                            title={opt.label}
                                            className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all text-sm font-bold
                                                ${contact.iconType === opt.value ? "border-blue-400 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}
                                        >
                                            {opt.icon}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => updateContact(i, "isActive", !contact.isActive)}
                                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${contact.isActive ? "bg-emerald-50 text-emerald-500 hover:bg-emerald-100" : "bg-slate-100 text-slate-400"}`}
                                    >
                                        {contact.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                                    </button>
                                    <button
                                        onClick={() => removeContact(i)}
                                        className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Row 2: fields */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">ข้อความหลัก</label>
                                    <input
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:border-blue-400 outline-none transition-colors"
                                        placeholder="เช่น Chat with us"
                                        value={contact.label}
                                        onChange={e => updateContact(i, "label", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">ข้อความรอง</label>
                                    <input
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:border-blue-400 outline-none transition-colors"
                                        placeholder="เช่น @naravichcare"
                                        value={contact.desc}
                                        onChange={e => updateContact(i, "desc", e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">ลิงก์ / URL</label>
                                <input
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:border-blue-400 outline-none transition-colors"
                                    placeholder="https://... หรือ tel:..."
                                    value={contact.href}
                                    onChange={e => updateContact(i, "href", e.target.value)}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    onClick={addContact}
                    className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-sm font-black text-slate-400 uppercase tracking-widest hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/30 transition-all flex items-center justify-center gap-2"
                >
                    <Plus size={18} /> เพิ่มช่องทางใหม่
                </button>
            </div>
        </div>
    );
}
