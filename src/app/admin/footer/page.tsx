"use client";

import { useEffect, useState } from "react";
import { Save, Loader2, CheckCircle2, LayoutTemplate, Plus, Trash2 } from "lucide-react";

interface FooterLink {
    label: string;
    href: string;
}

interface FooterData {
    description: string;
    menuTitle: string;
    menuItems: FooterLink[];
    contactTitle: string;
    phoneDisplay: string;
    phoneHref: string;
    emailDisplay: string;
    emailHref: string;
    copyrightText: string;
    poweredByText: string;
}

const DEFAULT: FooterData = {
    description: "บริการดูแลมือถือครบวงจร ตก แตก สูญหาย\nคุ้มครองอุบัติเหตุ มอบความอุ่นใจในทุกการใช้งาน\nNaravichCare คู่คิดที่แท้จริงสำหรับอุปกรณ์ของคุณ",
    menuTitle: "เมนู",
    menuItems: [
        { label: "หน้าแรก", href: "/" },
        { label: "ลงทะเบียนสมัคร", href: "/register" },
        { label: "ตรวจสอบกรมธรรม์", href: "/check-policy" },
        { label: "พอร์ทัลลูกค้า", href: "/portal" },
    ],
    contactTitle: "ติดต่อสอบถาม",
    phoneDisplay: "02-XXX-XXXX",
    phoneHref: "tel:+6602XXXXXXX",
    emailDisplay: "contact@naravichcare.com",
    emailHref: "mailto:contact@naravichcare.com",
    copyrightText: "NaravichCare. All rights reserved.",
    poweredByText: "Naravich Group",
};

function Field({ label, value, onChange, hint, multiline }: { label: string; value: string; onChange: (v: string) => void; hint?: string; multiline?: boolean }) {
    return (
        <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">{label}</label>
            {multiline ? (
                <textarea rows={4} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-800 focus:border-blue-400 outline-none resize-y" value={value} onChange={e => onChange(e.target.value)} />
            ) : (
                <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-800 focus:border-blue-400 outline-none" value={value} onChange={e => onChange(e.target.value)} />
            )}
            {hint && <p className="text-[10px] text-slate-400 font-medium">{hint}</p>}
        </div>
    );
}

export default function AdminFooterPage() {
    const [data, setData] = useState<FooterData>(DEFAULT);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        fetch("/api/admin/footer")
            .then(r => r.json())
            .then(d => {
                if (d.success && d.data) setData({ ...DEFAULT, ...d.data, menuItems: d.data.menuItems?.length ? d.data.menuItems : DEFAULT.menuItems });
            })
            .finally(() => setLoading(false));
    }, []);

    const set = (key: keyof Omit<FooterData, "menuItems">) => (value: string) => setData(prev => ({ ...prev, [key]: value }));

    const setMenuItem = (i: number, field: "label" | "href", value: string) => {
        const items = [...data.menuItems];
        items[i] = { ...items[i], [field]: value };
        setData(prev => ({ ...prev, menuItems: items }));
    };
    const addMenuItem = () => setData(prev => ({ ...prev, menuItems: [...prev.menuItems, { label: "", href: "/" }] }));
    const removeMenuItem = (i: number) => setData(prev => ({ ...prev, menuItems: prev.menuItems.filter((_, idx) => idx !== i) }));

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        try {
            const res = await fetch("/api/admin/footer", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
            if ((await res.json()).success) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
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
        <div className="space-y-8 max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                        <LayoutTemplate className="text-blue-600" size={30} />
                        Footer
                    </h2>
                    <p className="text-slate-400 text-sm mt-1 font-bold">แก้ไขข้อความและลิงก์ใน Footer หน้าเว็บ</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl transition-all ${saved ? "bg-emerald-500 text-white" : "bg-slate-900 hover:bg-blue-600 text-white"}`}
                >
                    {saving ? <><Loader2 size={18} className="animate-spin" /> กำลังบันทึก...</> : saved ? <><CheckCircle2 size={18} /> บันทึกแล้ว!</> : <><Save size={18} /> บันทึก</>}
                </button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm border-b border-slate-100 pb-2">ข้อความเกี่ยวกับแบรนด์</h3>
                <Field label="คำอธิบาย (ใต้โลโก้)" value={data.description} onChange={set("description")} multiline hint="ขึ้นบรรทัดใหม่ได้" />
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm border-b border-slate-100 pb-2">เมนูลิงก์</h3>
                <Field label="หัวข้อคอลัมน์เมนู" value={data.menuTitle} onChange={set("menuTitle")} hint='เช่น "เมนู"' />
                {data.menuItems.map((item, i) => (
                    <div key={i} className="flex gap-3 items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <input className="flex-1 rounded-lg px-3 py-2 text-sm border border-slate-200 focus:border-blue-400 outline-none" placeholder="ข้อความลิงก์" value={item.label} onChange={e => setMenuItem(i, "label", e.target.value)} />
                        <input className="flex-1 rounded-lg px-3 py-2 text-sm border border-slate-200 focus:border-blue-400 outline-none" placeholder="/path หรือ https://..." value={item.href} onChange={e => setMenuItem(i, "href", e.target.value)} />
                        <button type="button" onClick={() => removeMenuItem(i)} className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"><Trash2 size={16} /></button>
                    </div>
                ))}
                <button type="button" onClick={addMenuItem} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm font-black text-slate-400 hover:border-blue-300 hover:text-blue-500 flex items-center justify-center gap-2">
                    <Plus size={18} /> เพิ่มเมนู
                </button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm border-b border-slate-100 pb-2">ติดต่อสอบถาม</h3>
                <Field label="หัวข้อคอลัมน์ติดต่อ" value={data.contactTitle} onChange={set("contactTitle")} />
                <div className="grid grid-cols-2 gap-4">
                    <Field label="เบอร์โทร (ที่แสดง)" value={data.phoneDisplay} onChange={set("phoneDisplay")} />
                    <Field label="ลิงก์โทร (tel:...)" value={data.phoneHref} onChange={set("phoneHref")} hint='เช่น tel:+6621234567' />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="อีเมล (ที่แสดง)" value={data.emailDisplay} onChange={set("emailDisplay")} />
                    <Field label="ลิงก์อีเมล (mailto:...)" value={data.emailHref} onChange={set("emailHref")} />
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm border-b border-slate-100 pb-2">แถบล่าง (Copyright)</h3>
                <Field label="ข้อความลิขสิทธิ์" value={data.copyrightText} onChange={set("copyrightText")} hint='จะแสดงเป็น © ปี ปัจจุบัน + ข้อความนี้' />
                <Field label="Powered by" value={data.poweredByText} onChange={set("poweredByText")} />
            </div>
        </div>
    );
}
