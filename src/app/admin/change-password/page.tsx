"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";

export default function ChangePasswordPage() {
    const router = useRouter();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError("");

        if (newPassword !== confirmPassword) {
            setError("ยืนยันรหัสผ่านใหม่ไม่ตรงกัน");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch("/api/auth/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "ไม่สามารถเปลี่ยนรหัสผ่านได้");
                return;
            }

            router.replace("/admin/login");
            router.refresh();
        } catch {
            setError("ไม่สามารถเชื่อมต่อระบบได้");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto py-10">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden">
                <div className="bg-slate-950 px-8 py-7 text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-cyan-400/15 text-cyan-300 flex items-center justify-center">
                            <KeyRound size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black">เปลี่ยนรหัสผ่าน</h1>
                            <p className="text-xs text-slate-400 mt-1">ระบบจะให้ออกจากระบบหลังเปลี่ยนสำเร็จ</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 p-4 sm:p-8">
                    <PasswordField label="รหัสผ่านปัจจุบัน" value={currentPassword} onChange={setCurrentPassword} />
                    <PasswordField label="รหัสผ่านใหม่" value={newPassword} onChange={setNewPassword} />
                    <PasswordField label="ยืนยันรหัสผ่านใหม่" value={confirmPassword} onChange={setConfirmPassword} />

                    <div className="flex gap-3 rounded-2xl bg-cyan-50 border border-cyan-100 p-4 text-xs text-cyan-900">
                        <ShieldCheck className="shrink-0 text-cyan-600" size={18} />
                        <p>อย่างน้อย 12 ตัวอักษร และต้องมีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก ตัวเลข และสัญลักษณ์</p>
                    </div>

                    {error && <p className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm font-bold text-red-600">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-2xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 py-3.5 font-black transition-colors flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 size={18} className="animate-spin" />}
                        บันทึกรหัสผ่านใหม่
                    </button>
                </form>
            </div>
        </div>
    );
}

function PasswordField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
    return (
        <label className="block space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</span>
            <input
                type="password"
                required
                value={value}
                onChange={(event) => onChange(event.target.value)}
                autoComplete="new-password"
                className="w-full rounded-2xl border-2 border-slate-100 px-4 py-3 outline-none focus:border-cyan-500 transition-colors"
            />
        </label>
    );
}
