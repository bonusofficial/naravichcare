"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, RefreshCw, Trash2, Upload } from "lucide-react";
import type { RepairJobSectionProps, RepairJobView } from "@/lib/repair/types";
import { postJobAction } from "./job-actions";

type PhotoType = "before" | "after";
type Pending = { action: "add" } | { action: "replace"; index: number };

const MAX_PER_TYPE = 5;
const MAX_SIDE = 1600;

/** Read an image file and shrink it to at most MAX_SIDE px as JPEG, so the job document stays small. */
async function toCompactDataUrl(file: File): Promise<string> {
    const original = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("อ่านไฟล์รูปไม่สำเร็จ"));
        reader.readAsDataURL(file);
    });
    try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = () => reject(new Error("decode"));
            el.src = original;
        });
        const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) return original;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compact = canvas.toDataURL("image/jpeg", 0.82);
        return compact.length < original.length ? compact : original;
    } catch {
        return original;
    }
}

/**
 * Before/after photos (up to 5 each): upload, replace one photo in place, or
 * delete one. Each change is its own request, checked against the photo
 * count the page shows so two people cannot overwrite each other's photos.
 */
export default function PhotoGallerySection({ job, onChanged }: RepairJobSectionProps) {
    const fileInput = useRef<HTMLInputElement>(null);
    const target = useRef<{ type: PhotoType; pending: Pending } | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState("");

    const photos = (type: PhotoType) => (type === "before" ? job.photosBefore : job.photosAfter) ?? [];

    const send = async (type: PhotoType, body: Record<string, unknown>, busyKey: string) => {
        setBusy(busyKey);
        setError("");
        try {
            const updated = await postJobAction<RepairJobView>(job._id, "photos", { type, expectedCount: photos(type).length, ...body });
            onChanged(updated);
        } catch (err) {
            setError(err instanceof Error ? err.message : "บันทึกรูปไม่สำเร็จ");
        } finally {
            setBusy(null);
        }
    };

    const pickFile = (type: PhotoType, pending: Pending) => {
        target.current = { type, pending };
        fileInput.current?.click();
    };

    const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = ""; // picking the same file again still fires onChange
        const chosen = target.current;
        if (!file || !chosen) return;
        if (!file.type.startsWith("image/")) {
            setError("กรุณาเลือกไฟล์รูปภาพ");
            return;
        }
        const busyKey = chosen.pending.action === "add" ? `${chosen.type}-add` : `${chosen.type}-${chosen.pending.index}`;
        setBusy(busyKey);
        try {
            const image = await toCompactDataUrl(file);
            await send(chosen.type, { action: chosen.pending.action, image, ...(chosen.pending.action === "replace" ? { index: chosen.pending.index } : {}) }, busyKey);
        } catch (err) {
            setError(err instanceof Error ? err.message : "อ่านไฟล์รูปไม่สำเร็จ");
            setBusy(null);
        }
    };

    const remove = (type: PhotoType, index: number) => {
        if (!window.confirm(`ลบรูป${type === "before" ? "ก่อนซ่อม" : "หลังซ่อม"} รูปที่ ${index + 1}?`)) return;
        send(type, { action: "delete", index }, `${type}-${index}`);
    };

    const renderType = (type: PhotoType, title: string, accent: string) => {
        const list = photos(type);
        return (
            <div>
                <h5 className="text-[11px] font-bold text-slate-500 mb-3">{title} ({list.length}/{MAX_PER_TYPE}) <span className="font-medium text-slate-400">· ปุ่ม <RefreshCw size={10} className="inline" /> เปลี่ยนรูป · <Trash2 size={10} className="inline" /> ลบรูป</span></h5>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {list.map((src, index) => {
                        const key = `${type}-${index}`;
                        return (
                            <div key={key} className="relative aspect-square overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                                {/* eslint-disable-next-line @next/next/no-img-element -- inline data URLs */}
                                <img src={src} className="h-full w-full object-cover" alt={`${title} รูปที่ ${index + 1}`} />
                                <span className="absolute left-1.5 top-1.5 rounded-md bg-black/60 px-1.5 text-[10px] font-bold text-white">{index + 1}</span>
                                {busy === key ? (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/70"><Loader2 size={18} className="animate-spin text-slate-600" /></div>
                                ) : (
                                    <div className="absolute right-1 top-1 flex flex-col gap-1">
                                        <button type="button" disabled={Boolean(busy)} onClick={() => pickFile(type, { action: "replace", index })} title="เปลี่ยนรูปนี้" aria-label={`เปลี่ยนรูปที่ ${index + 1}`} className="flex h-6 w-6 items-center justify-center rounded-md bg-white/90 text-slate-700 shadow hover:bg-white disabled:opacity-50">
                                            <RefreshCw size={12} />
                                        </button>
                                        <button type="button" disabled={Boolean(busy)} onClick={() => remove(type, index)} title="ลบรูปนี้" aria-label={`ลบรูปที่ ${index + 1}`} className="flex h-6 w-6 items-center justify-center rounded-md bg-red-600/90 text-white shadow hover:bg-red-600 disabled:opacity-50">
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {list.length < MAX_PER_TYPE && (
                        <button
                            type="button"
                            disabled={Boolean(busy)}
                            onClick={() => pickFile(type, { action: "add" })}
                            className={`aspect-square bg-slate-50 border-2 border-slate-200 border-dashed rounded-xl flex flex-col items-center justify-center text-slate-400 transition-all disabled:opacity-50 ${accent}`}
                        >
                            {busy === `${type}-add` ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                            <span className="text-[10px] font-bold mt-1">อัปโหลด</span>
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <input type="file" ref={fileInput} onChange={onFile} className="hidden" accept="image/jpeg,image/png,image/webp,image/gif" />
            <div className="bg-slate-900 px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                    <ImagePlus size={14} className="text-blue-400" />
                    <span className="text-xs font-bold">รูปภาพก่อน/หลังซ่อม</span>
                </div>
                {busy && <Loader2 size={12} className="animate-spin text-blue-400" />}
            </div>
            <div className="p-6 space-y-6">
                {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{error}</p>}
                {renderType("before", "รูปภาพก่อนซ่อม", "hover:text-blue-600 hover:border-blue-500")}
                {renderType("after", "รูปภาพหลังซ่อม", "hover:text-emerald-600 hover:border-emerald-500")}
            </div>
        </div>
    );
}
