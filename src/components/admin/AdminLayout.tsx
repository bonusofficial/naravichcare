"use client";

import React, { useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { Bell, Search, ChevronDown } from "lucide-react";
import { usePathname } from "next/navigation";

const SIDEBAR_OPEN = 288;
const SIDEBAR_CLOSED = 72;

export function AdminLayout({ children }: { children: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);
    const pathname = usePathname();

    // Check if current route is login page
    const isLoginPage = pathname === "/admin/login";

    if (isLoginPage) {
        return <div className="min-h-screen bg-[#F8FAFC]">{children}</div>;
    }

    return (
        <div className="min-h-screen bg-[#F1F5F9] flex relative">
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
                 <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed(prev => !prev)} />
            </div>

            <div className="flex-1 flex flex-col transition-all duration-300 ease-in-out print-reset-margin" style={{ marginLeft: collapsed ? SIDEBAR_CLOSED : SIDEBAR_OPEN }}>
                <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-40 no-print">
                    <div className="flex items-center gap-3 bg-gray-100 px-4 py-2 rounded-lg w-80">
                        <Search size={16} className="text-gray-400 shrink-0" />
                        <input type="text" placeholder="ค้นหา IMEI, เลขสัญญา, ตัวแทน..." className="bg-transparent border-none outline-none text-sm w-full placeholder:text-gray-400" />
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="relative p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                            <Bell size={18} />
                            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                        </button>
                        <div className="h-6 w-px bg-gray-200"></div>
                        <div className="flex items-center gap-2.5 cursor-pointer hover:bg-gray-50 px-2 py-1.5 rounded-lg transition-colors">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center text-white font-bold text-xs">S</div>
                            <div className="hidden md:block">
                                <p className="text-xs font-bold text-gray-800 leading-none">Super Admin</p>
                                <p className="text-[10px] text-gray-500 mt-0.5">HQ</p>
                            </div>
                            <ChevronDown size={12} className="text-gray-400" />
                        </div>
                    </div>
                </header>
                <main className="flex-1 p-6">{children}</main>
            </div>
        </div>
    );
}
