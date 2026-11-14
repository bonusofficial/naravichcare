"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { ACCESSORY_OPTIONS } from "@/lib/repair/options";

/**
 * Items left with the device: the common ones as toggles, plus any other item
 * typed in. The value is the list of labels stored on the job.
 */
export function AccessoriesInput({ value, onChange, disabled }: { value: string[]; onChange: (next: string[]) => void; disabled?: boolean }) {
    const [other, setOther] = useState("");
    const extras = value.filter((item) => !(ACCESSORY_OPTIONS as readonly string[]).includes(item));

    const toggle = (item: string) => onChange(value.includes(item) ? value.filter((v) => v !== item) : [...value, item]);
    const addOther = () => {
        const item = other.trim().slice(0, 100);
        if (item && !value.includes(item) && value.length < 30) onChange([...value, item]);
        setOther("");
    };

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
                {ACCESSORY_OPTIONS.map((item) => (
                    <button
                        key={item}
                        type="button"
                        disabled={disabled}
                        onClick={() => toggle(item)}
                        aria-pressed={value.includes(item)}
                        className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-all disabled:opacity-60 ${
                            value.includes(item) ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-500 hover:border-slate-400"
                        }`}
                    >
                        {item}
                    </button>
                ))}
                {extras.map((item) => (
                    <span key={item} className="flex items-center gap-1 rounded-lg border border-slate-900 bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-white">
                        {item}
                        {!disabled && (
                            <button type="button" onClick={() => toggle(item)} aria-label={`เอา ${item} ออก`} className="text-white/70 hover:text-white">
                                <X size={11} />
                            </button>
                        )}
                    </span>
                ))}
            </div>
            {!disabled && (
                <div className="flex gap-2">
                    <input
                        value={other}
                        maxLength={100}
                        onChange={(e) => setOther(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                addOther();
                            }
                        }}
                        placeholder="อุปกรณ์อื่น เช่น หูฟัง"
                        className="w-full rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-bold text-gray-800 outline-none focus:border-blue-500 focus:bg-white"
                    />
                    <button type="button" onClick={addOther} disabled={!other.trim()} className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 text-[11px] font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-40">
                        <Plus size={12} /> เพิ่ม
                    </button>
                </div>
            )}
        </div>
    );
}

interface Technician {
    _id: string;
    name: string;
    username: string;
}

/**
 * Staff who can work on repairs in `branchId` (or every branch when omitted).
 * `currentLabel` keeps showing a technician who is no longer in the list.
 */
export function TechnicianSelect({ value, onChange, branchId, currentLabel, disabled, className }: {
    value: string;
    onChange: (id: string) => void;
    branchId?: string | null;
    currentLabel?: string;
    disabled?: boolean;
    className?: string;
}) {
    const [technicians, setTechnicians] = useState<Technician[]>([]);

    useEffect(() => {
        const query = branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";
        fetch(`/api/admin/repair/technicians${query}`, { cache: "no-store" })
            .then((res) => (res.ok ? res.json() : null))
            .then((data: { technicians?: Technician[] } | null) => setTechnicians(data?.technicians ?? []))
            .catch(() => setTechnicians([]));
    }, [branchId]);

    const missing = value && !technicians.some((t) => t._id === value);
    return (
        <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={className}>
            <option value="">ยังไม่ระบุช่าง</option>
            {missing && <option value={value}>{currentLabel || "ช่างที่บันทึกไว้"}</option>}
            {technicians.map((t) => (
                <option key={t._id} value={t._id}>{t.name}{t.name !== t.username ? ` (${t.username})` : ""}</option>
            ))}
        </select>
    );
}
