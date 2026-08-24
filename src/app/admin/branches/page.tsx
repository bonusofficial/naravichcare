"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Building2, Check, MapPin, Pencil, Phone, Plus, Trash2, X } from "lucide-react";

interface Branch { _id: string; name: string; location: string; phone?: string; isActive: boolean }

export default function BranchesPage() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [form, setForm] = useState({ name: "", location: "", phone: "" });
    const [error, setError] = useState("");
    // Which card is in edit mode, plus the draft values being typed into it.
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ name: "", location: "", phone: "" });
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        const response = await fetch("/api/admin/branches", { cache: "no-store" });
        const payload = await response.json();
        if (response.ok) setBranches(payload.branches || []); else setError(payload.error || "โหลดสาขาไม่สำเร็จ");
    }, []);
    useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

    const create = async (event: FormEvent) => {
        event.preventDefault(); setError("");
        const response = await fetch("/api/admin/branches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        const payload = await response.json();
        if (response.ok) { setForm({ name: "", location: "", phone: "" }); void load(); } else setError(payload.error || "สร้างสาขาไม่สำเร็จ");
    };
    const toggle = async (branch: Branch) => {
        const response = await fetch(`/api/admin/branches/${branch._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !branch.isActive }) });
        if (response.ok) void load();
    };
    const remove = async (branch: Branch) => {
        if (!confirm(`ลบสาขา ${branch.name}?`)) return;
        const response = await fetch(`/api/admin/branches/${branch._id}`, { method: "DELETE" });
        const payload = await response.json();
        if (response.ok) void load(); else setError(payload.error || "ลบสาขาไม่สำเร็จ");
    };

    const startEdit = (branch: Branch) => {
        setError("");
        setEditingId(branch._id);
        setEditForm({ name: branch.name, location: branch.location, phone: branch.phone || "" });
    };
    const cancelEdit = () => { setEditingId(null); setError(""); };
    const saveEdit = async (branch: Branch) => {
        if (!editForm.name.trim() || !editForm.location.trim()) {
            setError("กรุณาระบุชื่อและที่ตั้งสาขา");
            return;
        }
        setSaving(true); setError("");
        const response = await fetch(`/api/admin/branches/${branch._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: editForm.name.trim(), location: editForm.location.trim(), phone: editForm.phone.trim() }),
        });
        const payload = await response.json();
        setSaving(false);
        if (response.ok) { setEditingId(null); void load(); } else setError(payload.error || "แก้ไขสาขาไม่สำเร็จ");
    };

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div>
                <h1 className="text-2xl font-black text-slate-900">จัดการสาขา</h1>
                <p className="text-sm text-slate-500">กำหนดสาขาสำหรับพนักงานและเอกสารซื้อคืน</p>
            </div>

            {error && <div className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-600">{error}</div>}

            <form onSubmit={create} className="grid gap-3 rounded-2xl bg-white p-5 shadow-sm md:grid-cols-[1fr_1.5fr_1fr_auto]">
                <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="ชื่อสาขา" className="rounded-xl border border-slate-200 px-4 py-3" />
                <input required value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="ที่ตั้งสาขา" className="rounded-xl border border-slate-200 px-4 py-3" />
                <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="เบอร์โทร" className="rounded-xl border border-slate-200 px-4 py-3" />
                <button className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 font-black text-white"><Plus size={17} /> เพิ่ม</button>
            </form>

            <div className="grid gap-4 md:grid-cols-2">
                {branches.map((branch) => {
                    const isEditing = editingId === branch._id;
                    return (
                        <div key={branch._id} className="rounded-2xl bg-white p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 flex-1 gap-3">
                                    <div className="rounded-xl bg-blue-50 p-3 text-blue-600 shrink-0"><Building2 /></div>
                                    {isEditing ? (
                                        <div className="min-w-0 flex-1 space-y-2">
                                            <input
                                                autoFocus
                                                value={editForm.name}
                                                onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
                                                placeholder="ชื่อสาขา"
                                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold"
                                            />
                                            <input
                                                value={editForm.location}
                                                onChange={(event) => setEditForm({ ...editForm, location: event.target.value })}
                                                placeholder="ที่ตั้งสาขา"
                                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                            />
                                            <input
                                                value={editForm.phone}
                                                onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })}
                                                placeholder="เบอร์โทร"
                                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                            />
                                        </div>
                                    ) : (
                                        <div className="min-w-0">
                                            <h2 className="font-black text-slate-800">{branch.name}</h2>
                                            <p className="mt-1 flex items-center gap-1 text-xs text-slate-400"><MapPin size={12} />{branch.location}</p>
                                            {branch.phone && <p className="mt-1 flex items-center gap-1 text-xs text-slate-400"><Phone size={12} />{branch.phone}</p>}
                                        </div>
                                    )}
                                </div>
                                <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${branch.isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>{branch.isActive ? "ACTIVE" : "INACTIVE"}</span>
                            </div>

                            <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                                {isEditing ? (
                                    <>
                                        <button onClick={() => saveEdit(branch)} disabled={saving} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-blue-600 py-2 text-xs font-bold text-white disabled:opacity-50">
                                            <Check size={14} /> {saving ? "กำลังบันทึก..." : "บันทึก"}
                                        </button>
                                        <button onClick={cancelEdit} disabled={saving} className="flex items-center justify-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500 disabled:opacity-50">
                                            <X size={14} /> ยกเลิก
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => startEdit(branch)} className="flex items-center justify-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-600" title="แก้ไข">
                                            <Pencil size={14} /> แก้ไข
                                        </button>
                                        <button onClick={() => toggle(branch)} className="flex-1 rounded-lg bg-slate-100 py-2 text-xs font-bold text-slate-600">{branch.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}</button>
                                        <button onClick={() => remove(branch)} className="rounded-lg bg-red-50 px-3 text-red-600" title="ลบ"><Trash2 size={15} /></button>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
