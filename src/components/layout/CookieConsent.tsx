"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "naravich_cookie_consent";

export function CookieConsent() {
    const pathname = usePathname();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) setVisible(true);
    }, []);

    const accept = (type: "all" | "settings") => {
        localStorage.setItem(STORAGE_KEY, type);
        setVisible(false);
    };

    if (pathname?.startsWith("/admin") || !visible) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 pb-10 md:p-6 md:pb-12 pointer-events-none">
            <div className="w-full max-w-2xl pointer-events-auto animate-in fade-in slide-in-from-bottom-6 duration-500">
                <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.12)] p-8 md:p-10 border border-gray-100 flex flex-col md:flex-row items-center gap-6 md:gap-10">

                    <div className="flex-1 text-center md:text-left">
                        <h3 className="text-xl font-black text-gray-900 mb-2">เว็บไซต์นี้ใช้คุกกี้</h3>
                        <p className="text-[13px] md:text-sm text-gray-500 leading-relaxed font-medium">
                            เพื่อมอบประสบการณ์ที่ดีในการใช้งานเว็บไซต์ เราใช้คุกกี้เพื่อวิเคราะห์การใช้งาน และนำเสนอคอนเทนต์ที่ตรงใจคุณมากขึ้น
                            ศึกษา รายละเอียดได้ที่{" "}
                            <Link href="/privacy" className="text-cyan-500 font-bold hover:underline">
                                ประกาศความเป็นส่วนตัว
                            </Link>
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 shrink-0 w-full md:w-auto">
                        <button
                            onClick={() => accept("all")}
                            className="w-full md:px-10 py-3.5 bg-gradient-to-r from-cyan-400 to-purple-600 text-white font-black text-sm rounded-full shadow-lg shadow-purple-100 hover:opacity-90 transition-all active:scale-[0.98]"
                        >
                            ยอมรับคุกกี้ทั้งหมด
                        </button>
                        <button
                            onClick={() => accept("settings")}
                            className="w-full md:px-10 py-3.5 bg-white border-2 border-purple-200 text-purple-600 font-black text-sm rounded-full hover:bg-purple-50 transition-all active:scale-[0.98]"
                        >
                            ตั้งค่ารายการคุกกี้
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
