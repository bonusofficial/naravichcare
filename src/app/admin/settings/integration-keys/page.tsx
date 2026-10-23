"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AlertTriangle, Ban, Check, Copy, KeyRound, Loader2, Plus, RefreshCw, ShieldAlert, X } from "lucide-react";
import { useCurrentAdmin } from "@/hooks/useCurrentAdmin";

type KeyStatus = "active" | "expired" | "revoked";

interface IntegrationKey {
    id: string;
    name: string;
    keyPrefix: string;
    maskedKey: string;
    scopes: string[];
    status: KeyStatus;
    expiresAt: string | null;
    lastUsedAt: string | null;
    lastUsedIp: string | null;
    createdAt: string | null;
    rotatedAt: string | null;
    rotationCount: number;
    revokedAt: string | null;
    revokeReason: string | null;
}

const SCOPES = [
    { value: "repair:read", label: "repair:read", hint: "อ่านสถานะ/ค่าใช้จ่ายงานซ่อม" },
    { value: "repair:write", label: "repair:write", hint: "สร้างงานซ่อมจาก POS" },
    { value: "repair:cancel", label: "repair:cancel", hint: "ยกเลิกงานซ่อม" },
    { value: "repair:handover", label: "repair:handover", hint: "ยืนยันรับเครื่องคืน" },
];

const STATUS_STYLE: Record<KeyStatus, { label: string; className: string }> = {
    active: { label: "Active", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    expired: { label: "Expired", className: "bg-amber-50 text-amber-700 border-amber-200" },
    revoked: { label: "Revoked", className: "bg-red-50 text-red-700 border-red-200" },
};

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleString("th-TH") : "-");

type PendingAction = { kind: "rotate" | "revoke"; key: IntegrationKey } | null;

export default function IntegrationKeysPage() {
    const { user, loading: userLoading } = useCurrentAdmin();
    const [keys, setKeys] = useState<IntegrationKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [form, setForm] = useState({ name: "", scopes: ["repair:read", "repair:write", "repair:cancel", "repair:handover"], expiresAt: "" });
    const [saving, setSaving] = useState(false);
    // The plaintext key lives only here, only until the dialog is closed.
    const [revealed, setRevealed] = useState<{ name: string; apiKey: string; rotated: boolean } | null>(null);
    const [copied, setCopied] = useState(false);
    const [pending, setPending] = useState<PendingAction>(null);
    const [revokeReason, setRevokeReason] = useState("");
    const [acting, setActing] = useState(false);

    const load = useCallback(async () => {
        const response = await fetch("/api/admin/integration-keys", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) setKeys(payload.keys || []);
        else setError(payload.error || "โหลดรายการ API Key ไม่สำเร็จ");
        setLoading(false);
    }, []);
    useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

    const toggleScope = (scope: string) => {
        setForm((current) => ({
            ...current,
            scopes: current.scopes.includes(scope) ? current.scopes.filter((s) => s !== scope) : [...current.scopes, scope],
        }));
    };

    const create = async (event: FormEvent) => {
        event.preventDefault();
        setError("");
        if (!form.name.trim()) { setError("กรุณาระบุชื่อ Key"); return; }
        if (!form.scopes.length) { setError("กรุณาเลือก Scope อย่างน้อย 1 รายการ"); return; }
        setSaving(true);
        const response = await fetch("/api/admin/integration-keys", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: form.name.trim(),
                scopes: form.scopes,
                // End of the chosen day, local time.
                expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).toISOString() : null,
            }),
        });
        const payload = await response.json().catch(() => ({}));
        setSaving(false);
        if (!response.ok) { setError(payload.error || "สร้าง API Key ไม่สำเร็จ"); return; }
        setRevealed({ name: payload.key.name, apiKey: payload.apiKey, rotated: false });
        setCopied(false);
        setForm({ name: "", scopes: form.scopes, expiresAt: "" });
        void load();
    };

    const confirmPending = async () => {
        if (!pending) return;
        if (pending.kind === "revoke" && !revokeReason.trim()) { setError("กรุณาระบุเหตุผลในการเพิกถอน"); return; }
        setActing(true);
        setError("");
        const response = await fetch(`/api/admin/integration-keys/${pending.key.id}/${pending.kind}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(pending.kind === "revoke" ? { reason: revokeReason.trim() } : {}),
        });
        const payload = await response.json().catch(() => ({}));
        setActing(false);
        if (!response.ok) { setError(payload.error || "ดำเนินการไม่สำเร็จ"); setPending(null); return; }
        if (pending.kind === "rotate") {
            setRevealed({ name: payload.key.name, apiKey: payload.apiKey, rotated: true });
            setCopied(false);
        }
        setPending(null);
        setRevokeReason("");
        void load();
    };

    const copyKey = async () => {
        if (!revealed) return;
        try {
            await navigator.clipboard.writeText(revealed.apiKey);
            setCopied(true);
        } catch {
            setError("คัดลอกอัตโนมัติไม่สำเร็จ กรุณาเลือกข้อความแล้วคัดลอกเอง");
        }
    };

    const closeReveal = () => {
        if (!copied && !confirm("ยังไม่ได้คัดลอก Key — ปิดแล้วจะดู Key นี้อีกไม่ได้ ต้องการปิดหรือไม่?")) return;
        setRevealed(null);
        setCopied(false);
    };

    if (userLoading) return null;
    if (user?.role !== "super_admin") {
        return (
            <div className="mx-auto max-w-lg rounded-2xl border border-red-100 bg-white p-8 text-center">
                <ShieldAlert className="mx-auto mb-3 text-red-500" size={32} />
                <p className="font-bold text-slate-800">เฉพาะ Super Admin เท่านั้น</p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6 pb-16">
            <div>
                <h1 className="flex items-center gap-2 text-xl font-black text-slate-800"><KeyRound size={20} /> Integration API Keys</h1>
                <p className="mt-1 text-sm text-slate-500">Key สำหรับให้ Web POS เรียก Repair Integration API (ตั้งเป็น <code className="rounded bg-slate-100 px-1">REPAIR_API_KEY</code> ฝั่ง POS)</p>
            </div>

            {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" /> <span className="min-w-0 break-words">{error}</span>
                </div>
            )}

            <form onSubmit={create} className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-bold text-slate-900">สร้าง Key ใหม่</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1.5">
                        <span className="text-xs font-semibold text-slate-500">ชื่อ Key</span>
                        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} placeholder="เช่น Web POS Production"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-blue-500" />
                    </label>
                    <label className="space-y-1.5">
                        <span className="text-xs font-semibold text-slate-500">วันหมดอายุ (ไม่บังคับ)</span>
                        <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-blue-500" />
                    </label>
                </div>
                <fieldset className="space-y-2">
                    <legend className="text-xs font-semibold text-slate-500">Scope</legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                        {SCOPES.map((scope) => (
                            <label key={scope.value} className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-100 p-3 hover:border-blue-200">
                                <input type="checkbox" checked={form.scopes.includes(scope.value)} onChange={() => toggleScope(scope.value)} className="mt-0.5" />
                                <span className="min-w-0">
                                    <span className="block font-mono text-xs font-bold text-slate-800">{scope.label}</span>
                                    <span className="block text-xs text-slate-500">{scope.hint}</span>
                                </span>
                            </label>
                        ))}
                    </div>
                </fieldset>
                <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-blue-600 disabled:opacity-60">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} สร้าง API Key
                </button>
            </form>

            <section className="space-y-3">
                <h2 className="text-sm font-bold text-slate-900">รายการ Key</h2>
                {loading ? (
                    <div className="flex justify-center py-12 text-slate-400"><Loader2 className="animate-spin" /></div>
                ) : keys.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">ยังไม่มี API Key</p>
                ) : (
                    keys.map((key) => (
                        <article key={key.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="font-bold text-slate-900 break-words">{key.name}</h3>
                                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${STATUS_STYLE[key.status].className}`}>{STATUS_STYLE[key.status].label}</span>
                                    </div>
                                    <p className="font-mono text-xs text-slate-500 break-all">{key.maskedKey}</p>
                                    <div className="flex flex-wrap gap-1 pt-1">
                                        {key.scopes.map((scope) => <span key={scope} className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600">{scope}</span>)}
                                    </div>
                                </div>
                                {key.status === "active" && (
                                    <div className="flex shrink-0 gap-2">
                                        <button onClick={() => { setError(""); setPending({ kind: "rotate", key }); }} className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-amber-100">
                                            <RefreshCw size={14} /> Reset / Rotate
                                        </button>
                                        <button onClick={() => { setError(""); setRevokeReason(""); setPending({ kind: "revoke", key }); }} className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100">
                                            <Ban size={14} /> Revoke
                                        </button>
                                    </div>
                                )}
                            </div>
                            <dl className="mt-4 grid grid-cols-1 gap-2 text-xs sm:grid-cols-4">
                                <div><dt className="text-slate-400">Created</dt><dd className="font-semibold text-slate-700">{formatDate(key.createdAt)}</dd></div>
                                <div><dt className="text-slate-400">Last used</dt><dd className="font-semibold text-slate-700 break-all">{formatDate(key.lastUsedAt)}{key.lastUsedIp ? ` (${key.lastUsedIp})` : ""}</dd></div>
                                <div><dt className="text-slate-400">Expires</dt><dd className="font-semibold text-slate-700">{formatDate(key.expiresAt)}</dd></div>
                                <div><dt className="text-slate-400">{key.status === "revoked" ? "Revoked" : "Rotated"}</dt><dd className="font-semibold text-slate-700">{formatDate(key.status === "revoked" ? key.revokedAt : key.rotatedAt)}</dd></div>
                            </dl>
                            {key.status === "revoked" && key.revokeReason && <p className="mt-2 text-xs text-slate-500 break-words">เหตุผล: {key.revokeReason}</p>}
                        </article>
                    ))
                )}
            </section>

            {revealed && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4">
                    <div role="dialog" aria-modal="true" className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
                        <h2 className="text-base font-bold text-slate-900">{revealed.rotated ? "Key ใหม่หลัง Rotate" : "สร้าง API Key แล้ว"}: {revealed.name}</h2>
                        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                            <AlertTriangle size={16} className="shrink-0" />
                            <span>Key นี้แสดงเพียงครั้งเดียว ระบบไม่ได้เก็บ Key ไว้ ปิดหน้าต่างแล้วจะดูอีกไม่ได้ ให้คัดลอกไปตั้งเป็น REPAIR_API_KEY ฝั่ง POS ทันที{revealed.rotated ? " — Key เดิมใช้งานไม่ได้แล้ว POS จะเชื่อมต่อไม่ได้จนกว่าจะอัปเดต REPAIR_API_KEY" : ""}</span>
                        </div>
                        <textarea readOnly value={revealed.apiKey} rows={3} onFocus={(e) => e.currentTarget.select()}
                            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-900 break-all" />
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <button onClick={copyKey} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white hover:bg-blue-600">
                                {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "คัดลอกแล้ว" : "คัดลอก Key"}
                            </button>
                            <button onClick={closeReveal} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-600">
                                <X size={16} /> ปิด
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {pending && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4">
                    <div role="dialog" aria-modal="true" className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
                        <h2 className="text-base font-bold text-slate-900">
                            {pending.kind === "rotate" ? "ยืนยัน Reset / Rotate Key" : "ยืนยัน Revoke Key"}: {pending.key.name}
                        </h2>
                        {pending.kind === "rotate" ? (
                            <p className="text-sm text-slate-600">ระบบจะออก Secret ใหม่ และ <b>Key เดิมจะใช้ไม่ได้ทันที</b> Web POS จะเชื่อมต่อไม่ได้จนกว่าจะอัปเดต <code className="rounded bg-slate-100 px-1">REPAIR_API_KEY</code> เป็น Key ใหม่</p>
                        ) : (
                            <>
                                <p className="text-sm text-slate-600">Key นี้จะใช้ไม่ได้ทันทีและถาวร (ไม่ลบประวัติ) หากต้องการเชื่อมต่อต่อ ต้องสร้าง Key ใหม่</p>
                                <textarea value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} rows={3} maxLength={500} placeholder="เหตุผลในการเพิกถอน (บังคับ)"
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-red-400" />
                            </>
                        )}
                        <div className="flex gap-2">
                            <button onClick={() => setPending(null)} className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-600">ยกเลิก</button>
                            <button onClick={confirmPending} disabled={acting}
                                className={`flex flex-[2] items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white disabled:opacity-60 ${pending.kind === "rotate" ? "bg-amber-600 hover:bg-amber-700" : "bg-red-600 hover:bg-red-700"}`}>
                                {acting && <Loader2 size={16} className="animate-spin" />}
                                {pending.kind === "rotate" ? "ยืนยัน Rotate" : "ยืนยัน Revoke"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
