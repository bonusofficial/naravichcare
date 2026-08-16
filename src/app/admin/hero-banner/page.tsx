"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Save, Loader2, CheckCircle2, ImageIcon, LayoutTemplate, RotateCcw, ShieldCheck, Upload } from "lucide-react";
import {
    DEFAULT_HERO_IMAGE_URL,
    HERO_BANNER_DEFAULT_VIEW,
    type HeroBannerView,
    type HeroImagePosition,
} from "@/lib/hero-banner";

const POSITION_CLASS: Record<HeroImagePosition, string> = {
    center: "object-center",
    top: "object-top",
    bottom: "object-bottom",
    left: "object-left",
    right: "object-right",
};

function useFilePreview(file: File | null, fallback: string | null): string | null {
    const preview = useMemo(() => file ? URL.createObjectURL(file) : fallback, [file, fallback]);
    useEffect(() => () => {
        if (file && preview) URL.revokeObjectURL(preview);
    }, [file, preview]);
    return preview;
}

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
    const [data, setData] = useState<HeroBannerView>(HERO_BANNER_DEFAULT_VIEW);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState("");
    const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
    const [badge2IconFile, setBadge2IconFile] = useState<File | null>(null);
    const [resetHeroImage, setResetHeroImage] = useState(false);
    const [resetBadge2Icon, setResetBadge2Icon] = useState(false);

    const heroPreview = useFilePreview(heroImageFile, resetHeroImage ? DEFAULT_HERO_IMAGE_URL : data.heroImageUrl);
    const badge2IconPreview = useFilePreview(badge2IconFile, resetBadge2Icon ? null : data.badge2IconUrl);

    useEffect(() => {
        fetch("/api/admin/hero-banner")
            .then(r => r.json())
            .then(d => { if (d.success) setData({ ...HERO_BANNER_DEFAULT_VIEW, ...d.data }); })
            .finally(() => setLoading(false));
    }, []);

    const set = (key: keyof HeroBannerView) => (value: string) =>
        setData(prev => ({ ...prev, [key]: value }));

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        setError("");
        try {
            const form = new FormData();
            form.set("data", JSON.stringify({ ...data, resetHeroImage, resetBadge2Icon }));
            if (heroImageFile) form.set("heroImage", heroImageFile);
            if (badge2IconFile) form.set("badge2Icon", badge2IconFile);
            const res = await fetch("/api/admin/hero-banner", {
                method: "PUT",
                body: form,
            });
            const result = await res.json();
            if (res.ok && result.success) {
                setData({ ...HERO_BANNER_DEFAULT_VIEW, ...result.data });
                setHeroImageFile(null);
                setBadge2IconFile(null);
                setResetHeroImage(false);
                setResetBadge2Icon(false);
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            } else {
                setError(result.error || "บันทึก Hero Banner ไม่สำเร็จ");
            }
        } catch {
            setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
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
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                        <LayoutTemplate className="text-blue-600" size={30} />
                        Hero Banner
                    </h2>
                    <p className="text-slate-400 text-sm mt-1 font-bold">แก้ไขรูปภาพ ไอคอน และข้อความหน้าแรกของเว็บไซต์</p>
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

            {error && <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-600">{error}</div>}

            {/* Main image and right badge icon */}
            <SectionCard title="รูป Hero และไอคอน Badge ขวา" icon={<ImageIcon size={18} />}>
                <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                    <div className="space-y-3">
                        <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                            {heroPreview && <Image src={heroPreview} alt={data.heroImageAlt || "Hero preview"} fill className={`object-cover ${POSITION_CLASS[data.heroImagePosition]}`} unoptimized />}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white">
                                <Upload size={15} /> เลือกรูป Hero
                                <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif" className="hidden" onClick={event => { event.currentTarget.value = ""; }} onChange={event => {
                                    const file = event.target.files?.[0] || null;
                                    setHeroImageFile(file);
                                    if (file) setResetHeroImage(false);
                                }} />
                            </label>
                            <button type="button" onClick={() => { setHeroImageFile(null); setResetHeroImage(true); }} disabled={!data.hasCustomHeroImage && !heroImageFile} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-40">
                                <RotateCcw size={15} /> คืนค่ารูปเริ่มต้น
                            </button>
                        </div>
                        <p className="text-[10px] font-medium text-slate-400">รองรับ JPG, PNG, WebP, HEIC และ AVIF สูงสุด 10 MB ระบบจะย่อและลบ EXIF อัตโนมัติ</p>
                    </div>

                    <div className="space-y-3">
                        <div className="flex h-[160px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                            {badge2IconPreview ? (
                                <Image src={badge2IconPreview} alt={data.badge2IconAlt || "Badge icon preview"} width={88} height={88} className="h-20 w-20 object-contain" unoptimized />
                            ) : (
                                <svg viewBox="0 0 814 1000" className="h-16 w-16 fill-current text-slate-800" aria-label="Default Apple icon" role="img"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.3 134.4-317 267.1-317 70.5 0 129.2 46.4 173.4 46.4 42.7 0 109.2-49.4 188.2-49.4 30.5 0 130.6 5.8 198.6 67.8zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" /></svg>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white">
                                <Upload size={15} /> เลือกไอคอน
                                <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif" className="hidden" onClick={event => { event.currentTarget.value = ""; }} onChange={event => {
                                    const file = event.target.files?.[0] || null;
                                    setBadge2IconFile(file);
                                    if (file) setResetBadge2Icon(false);
                                }} />
                            </label>
                            <button type="button" onClick={() => { setBadge2IconFile(null); setResetBadge2Icon(true); }} disabled={!data.hasCustomBadge2Icon && !badge2IconFile} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-40">
                                <RotateCcw size={15} /> ใช้ไอคอนเดิม
                            </button>
                        </div>
                        <p className="text-[10px] font-medium text-slate-400">แนะนำไฟล์ PNG พื้นหลังโปร่งใส อัตราส่วน 1:1</p>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <Field label="คำอธิบายรูป Hero (Alt text)" value={data.heroImageAlt} onChange={set("heroImageAlt")} />
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">ตำแหน่งรูป Hero</label>
                        <select value={data.heroImagePosition} onChange={event => setData(prev => ({ ...prev, heroImagePosition: event.target.value as HeroImagePosition }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-blue-400 focus:bg-white">
                            <option value="center">กึ่งกลาง</option>
                            <option value="top">ด้านบน</option>
                            <option value="bottom">ด้านล่าง</option>
                            <option value="left">ด้านซ้าย</option>
                            <option value="right">ด้านขวา</option>
                        </select>
                    </div>
                </div>
                <Field label="คำอธิบายไอคอน Badge (Alt text)" value={data.badge2IconAlt} onChange={set("badge2IconAlt")} />
            </SectionCard>

            {/* Badge 1 */}
            <SectionCard title="Badge ซ้าย (Naravich)" icon={<ShieldCheck size={18} />}>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Label เล็ก" value={data.badge1Label} onChange={set("badge1Label")} hint='เช่น "NARAVICH"' />
                    <Field label="ชื่อหลัก" value={data.badge1Title} onChange={set("badge1Title")} hint='เช่น "Mobile Care"' />
                </div>
                <Field label="คำอธิบาย" value={data.badge1Subtitle} onChange={set("badge1Subtitle")} />
            </SectionCard>

            {/* Badge 2 */}
            <SectionCard title="Badge ขวา (Apple / มาตรฐาน)" icon={<ShieldCheck size={18} />}>
                <div className="grid gap-4 sm:grid-cols-2">
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
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="ราคารายเดือน" value={data.priceMonthly} onChange={set("priceMonthly")} hint='เช่น "179.-"' />
                    <Field label="หน่วยรายเดือน" value={data.priceMonthlyUnit} onChange={set("priceMonthlyUnit")} hint='เช่น "/เดือน*"' />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="ราคารายปี" value={data.priceYearly} onChange={set("priceYearly")} hint='เช่น "1,990.-"' />
                    <Field label="หน่วยรายปี" value={data.priceYearlyUnit} onChange={set("priceYearlyUnit")} hint='เช่น "/ปี*"' />
                </div>
            </SectionCard>
        </div>
    );
}
