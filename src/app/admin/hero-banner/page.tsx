"use client";

import { useEffect, useState } from "react";
import { Save, Loader2, CheckCircle2, LayoutTemplate, ShieldCheck } from "lucide-react";

interface HeroBannerData {
    badge1Label: string;
    badge1Title: string;
    badge1Subtitle: string;
    badge2Eyebrow: string;
    badge2Title: string;
    heading1: string;
    heading2: string;
    pillText: string;
    subText: string;
    priceMonthly: string;
    priceMonthlyUnit: string;
    priceYearly: string;
    priceYearlyUnit: string;
}

const DEFAULT: HeroBannerData = {
    badge1Label: "NARAVICH",
    badge1Title: "Mobile Care",
    badge1Subtitle: "บริการดูแลมือถือครบวงจร",
    badge2Eyebrow: "มั่นใจด้วยมาตรฐาน",
    badge2Title: "ระดับโลก",
    heading1: "มั่นใจด้วยมาตรฐาน",
    heading2: "ระดับโลก",
    pillText: "คุ้มครองอุบัติเหตุไม่จำกัดครั้ง คุ้มครองทั้งภายในและภายนอก",
    subText: "รับบริการที่ Apple Store และ Apple Service Provider ทั่วโลก",
    priceMonthly: "179.-",
    priceMonthlyUnit: "/เดือน*",
    priceYearly: "1,990.-",
    priceYearlyUnit: "/ปี*",
};

function Field({ label, value, onChange, hint }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    hint?: string;
}) {
    return (
        <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">{label}</label>
            <input
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-800 focus:border-blue-400 focus:bg-white outline-none transition-colors"
                value={value}
                onChange={e => onChange(e.target.value)}
            />
            {hint && <p className="text-[10px] text-slate-400 font-medium">{hint}</p>}
        </div>
    );
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                    {icon}
                </div>
                <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">{title}</h3>
            </div>
            <div className="space-y-4">{children}</div>
        </div>
    );
}

export default function AdminHeroBannerPage() {
    const [data, setData] = useState<HeroBannerData>(DEFAULT);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        fetch("/api/admin/hero-banner")
            .then(r => r.json())
            .then(d => { if (d.success) setData({ ...DEFAULT, ...d.data }); })
            .finally(() => setLoading(false));
    }, []);

    const set = (key: keyof HeroBannerData) => (value: string) =>
        setData(prev => ({ ...prev, [key]: value }));

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        try {
            const res = await fetch("/api/admin/hero-banner", {
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
                        <LayoutTemplate className="text-blue-600" size={30} />
                        Hero Banner
                    </h2>
                    <p className="text-slate-400 text-sm mt-1 font-bold">แก้ไขข้อความหน้าแรกของเว็บไซต์</p>
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

            {/* Preview strip */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-2xl px-6 py-4 flex items-center gap-3">
                <ShieldCheck size={18} className="text-blue-500 shrink-0" />
                <p className="text-sm text-blue-700 font-semibold">
                    การเปลี่ยนแปลงจะแสดงผลทันทีหลังบันทึก —{" "}
                    <a href="/" target="_blank" className="underline font-black">ดูหน้าแรก ↗</a>
                </p>
            </div>

            {/* Badge 1 */}
            <SectionCard title="Badge ซ้าย (Naravich)" icon={<ShieldCheck size={18} />}>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Label เล็ก" value={data.badge1Label} onChange={set("badge1Label")} hint='เช่น "NARAVICH"' />
                    <Field label="ชื่อหลัก" value={data.badge1Title} onChange={set("badge1Title")} hint='เช่น "Mobile Care"' />
                </div>
                <Field label="คำอธิบาย" value={data.badge1Subtitle} onChange={set("badge1Subtitle")} />
            </SectionCard>

            {/* Badge 2 */}
            <SectionCard title="Badge ขวา (Apple / มาตรฐาน)" icon={<ShieldCheck size={18} />}>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="ข้อความเล็กบน" value={data.badge2Eyebrow} onChange={set("badge2Eyebrow")} />
                    <Field label="ชื่อหลัก" value={data.badge2Title} onChange={set("badge2Title")} />
                </div>
            </SectionCard>

            {/* Heading */}
            <SectionCard title="หัวข้อหลัก (Heading)" icon={<LayoutTemplate size={18} />}>
                <Field label="บรรทัดที่ 1" value={data.heading1} onChange={set("heading1")} hint="แสดงสีเข้ม" />
                <Field label="บรรทัดที่ 2 (Gradient)" value={data.heading2} onChange={set("heading2")} hint="แสดงสี gradient น้ำเงิน-ม่วง" />
            </SectionCard>

            {/* Pill & sub text */}
            <SectionCard title="ข้อความประกาศ & รายละเอียด" icon={<LayoutTemplate size={18} />}>
                <Field label="ข้อความ Pill (แถบสี)" value={data.pillText} onChange={set("pillText")} hint="แถบ gradient ใต้ Heading" />
                <Field label="ข้อความรอง" value={data.subText} onChange={set("subText")} hint="ข้อความใต้ Pill" />
            </SectionCard>

            {/* Pricing */}
            <SectionCard title="ราคา" icon={<LayoutTemplate size={18} />}>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="ราคารายเดือน" value={data.priceMonthly} onChange={set("priceMonthly")} hint='เช่น "179.-"' />
                    <Field label="หน่วยรายเดือน" value={data.priceMonthlyUnit} onChange={set("priceMonthlyUnit")} hint='เช่น "/เดือน*"' />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="ราคารายปี" value={data.priceYearly} onChange={set("priceYearly")} hint='เช่น "1,990.-"' />
                    <Field label="หน่วยรายปี" value={data.priceYearlyUnit} onChange={set("priceYearlyUnit")} hint='เช่น "/ปี*"' />
                </div>
            </SectionCard>
        </div>
    );
}
