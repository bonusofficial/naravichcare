"use client";

import React, { useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { Bell, Search, ChevronDown, Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useAdminSession } from "./AdminSession";

const SIDEBAR_OPEN = 288;
const SIDEBAR_CLOSED = 72;

export function AdminLayout({ children }: { children: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const pathname = usePathname();
    const { user } = useAdminSession();

    // Check if current route is login page
    const isLoginPage = pathname === "/admin/login";

    if (isLoginPage) {
        return <div className="min-h-screen bg-[#F8FAFC]">{children}</div>;
    }

    return (
        <div className="relative flex min-h-screen w-full overflow-x-hidden bg-[#F1F5F9]">
            {/* Global Print Resets */}
            <style jsx global>{`
                @media print {
                    .no-print { display: none !important; }
                    .print-reset-margin { 
                        margin-left: 0 !important; 
                        padding: 0 !important; 
                        width: 100% !important;
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                    }
                    main { padding: 0 !important; }
                    body { background: white !important; }
                }
            `}</style>

            <div className="no-print">
                 <AdminSidebar
                    collapsed={collapsed}
                    mobileOpen={mobileOpen}
                    onMobileClose={() => setMobileOpen(false)}
                    onToggle={() => setCollapsed(prev => !prev)}
                 />
                 {mobileOpen && (
                    <button
                        type="button"
                        aria-label="ปิดเมนูหลังบ้าน"
                        onClick={() => setMobileOpen(false)}
                        className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] lg:hidden"
                    />
                 )}
            </div>

            <div
                className="print-reset-margin flex min-w-0 flex-1 flex-col transition-[margin] duration-300 ease-in-out lg:ml-[var(--admin-sidebar-width)]"
                style={{ "--admin-sidebar-width": `${collapsed ? SIDEBAR_CLOSED : SIDEBAR_OPEN}px` } as React.CSSProperties}
            >
                <header className="sticky top-0 z-30 flex h-14 min-w-0 items-center justify-between gap-2 border-b border-gray-200 bg-white px-3 sm:px-4 lg:px-6 no-print">
                    <button
                        type="button"
                        aria-label="เปิดเมนูหลังบ้าน"
                        onClick={() => setMobileOpen(true)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 lg:hidden"
                    >
                        <Menu size={19} />
                    </button>
                    <div className="hidden min-w-0 max-w-md flex-1 items-center gap-3 rounded-lg bg-gray-100 px-4 py-2 sm:flex">
                        <Search size={16} className="text-gray-400 shrink-0" />
                        <input type="text" placeholder="ค้นหา IMEI, เลขสัญญา, ตัวแทน..." className="bg-transparent border-none outline-none text-sm w-full placeholder:text-gray-400" />
                    </div>
                    <p className="min-w-0 flex-1 truncate text-sm font-black text-slate-700 sm:hidden">NaravichCare Admin</p>
                    <div className="flex shrink-0 items-center gap-1 sm:gap-3">
                        <button className="relative p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                            <Bell size={18} />
                            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                        </button>
                        <div className="hidden h-6 w-px bg-gray-200 sm:block"></div>
                        <div className="flex items-center gap-2.5 cursor-pointer hover:bg-gray-50 px-1 sm:px-2 py-1.5 rounded-lg transition-colors">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center text-white font-bold text-xs">{user?.name?.charAt(0).toUpperCase() || "A"}</div>
                            <div className="hidden md:block">
                                <p className="text-xs font-bold text-gray-800 leading-none">{user?.name || "Admin"}</p>
                                <p className="text-[10px] text-gray-500 mt-0.5">{user?.branch?.name || "ยังไม่ผูกสาขา"}</p>
                            </div>
                            <ChevronDown size={12} className="hidden text-gray-400 sm:block" />
                        </div>
                    </div>
                </header>
                <main className="min-w-0 flex-1 overflow-x-auto p-3 sm:p-4 lg:p-6">{children}</main>
            </div>
        </div>
    );
}
