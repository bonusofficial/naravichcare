"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Lock, User, Eye, EyeOff, Loader2, ArrowRight, ShieldCheck, Globe } from "lucide-react";

export default function AdminLoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (res.ok) {
                router.push("/admin");
                router.refresh();
            } else {
                const errorMessage = data.debug_message
                    ? `${data.error}: ${data.debug_message}`
                    : (data.error || "Username หรือ Password ไม่ถูกต้อง");
                setError(errorMessage);
            }
        } catch (err) {
            setError("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่ภายหลัง");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Premium Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-100/40 blur-[150px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-100/30 blur-[150px] rounded-full" />

                {/* Subtle Grid Pattern */}
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#2563eb 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }} />
            </div>

            <main className="w-full max-w-[480px] relative z-10">
                {/* Header Section */}
                <div className="text-center mb-10 group">
                    <div className="inline-flex relative mb-4">
                        <div className="absolute inset-0 bg-blue-600 blur-3xl opacity-10 group-hover:opacity-20 transition-opacity"></div>
                        <Image
                            src="/canvas.png"
                            alt="NaravichCare"
                            width={220}
                            height={80}
                            style={{ height: "auto" }}
                            className="relative object-contain transition-transform duration-500 group-hover:scale-105"
                            priority
                        />
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                        Naravich<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Care</span>
                    </h1>
                    <div className="flex items-center justify-center gap-2 text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">
                        <ShieldCheck size={12} className="text-blue-500" />
                        Administrator Access
                    </div>
                </div>

                {/* Login Card */}
                <div className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-10 shadow-[0_32px_80px_-20px_rgba(0,0,0,0.08)] border border-white/60 relative overflow-hidden group/card text-left">
                    {/* Top Accent Line */}
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500" />

                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="bg-red-50/80 border border-red-100 text-red-600 text-[13px] font-bold p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                                <AlertCircleIcon className="shrink-0" size={16} />
                                {error}
                            </div>
                        )}

                        <div className="space-y-5">
                            {/* Username Field */}
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    Username
                                </label>
                                <div className="relative group/input">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within/input:text-blue-500 transition-colors">
                                        <User size={18} strokeWidth={2.5} />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-white border-2 border-gray-100 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-semibold text-gray-800 placeholder:text-gray-300 shadow-sm"
                                        placeholder="ระบุชื่อผู้ใช้งาน"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        Password
                                    </label>
                                    <button type="button" className="text-[11px] font-bold text-gray-300 hover:text-blue-600 transition-colors uppercase tracking-widest">
                                        ลืมรหัสผ่าน?
                                    </button>
                                </div>
                                <div className="relative group/input">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within/input:text-blue-500 transition-colors">
                                        <Lock size={18} strokeWidth={2.5} />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        className="w-full bg-white border-2 border-gray-100 rounded-2xl py-4 pl-12 pr-12 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-semibold text-gray-800 placeholder:text-gray-300 shadow-sm"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 px-1">
                            <label className="flex items-center gap-3 cursor-pointer group/check">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 rounded-lg border-2 border-gray-200 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                                />
                                <span className="text-sm font-bold text-gray-500 group-hover/check:text-gray-800 transition-colors">
                                    จดจำบัญชีนี้ในอุปกรณ์
                                </span>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full relative group/btn overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 group-hover/btn:scale-105 transition-transform duration-500 rounded-2xl"></div>
                            <div className="relative w-full py-4 text-white font-black flex items-center justify-center gap-2 group-hover/btn:gap-4 transition-all duration-300">
                                {loading ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <>
                                        เข้าสู่ระบบแผงจัดการ
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </div>
                        </button>
                    </form>

                    {/* Security Info */}
                    <div className="mt-8 pt-8 border-t border-gray-50 flex items-center justify-between text-gray-300">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest">
                            <Globe size={12} />
                            Secured Connection
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-widest">
                            v2.1.0
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="mt-12 text-center text-gray-400 font-medium text-sm relative z-10 pointer-events-none">
                <p>&copy; {new Date().getFullYear()} NaravichCare. <span className="text-gray-300">Internal System Authorization.</span></p>
            </footer>
        </div>
    );
}

function AlertCircleIcon({ size, className }: { size: number, className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    )
}
