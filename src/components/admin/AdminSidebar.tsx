"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard, Smartphone, ShieldCheck, Users,
    ClipboardList, FileText, LogOut, TrendingDown, Percent,
    UserCog, UserCircle, ChevronDown, Settings, Bell, Zap,
    Circle, ChevronsLeft, ChevronsRight, History, LayoutTemplate, MessageCircle, Shield,
} from "lucide-react";

type NavItem = { title: string; icon: React.ReactNode; href: string; badge?: string | number };
type NavGroup = { group: string; items: NavItem[] };

const navGroups: NavGroup[] = [
    {
        group: "ภาพรวม",
        items: [{ title: "Dashboard", icon: <LayoutDashboard size={18} />, href: "/admin" }],
    },
    {
        group: "การดำเนินงาน",
        items: [
            { title: "รายการลงทะเบียน", icon: <ClipboardList size={18} />, href: "/admin/registrations" },
            { title: "จัดการแพ็กเกจ", icon: <Zap size={18} />, href: "/admin/packages" },
            { title: "จัดการแผน (Step 3)", icon: <ShieldCheck size={18} />, href: "/admin/coverage-plans" },
            { title: "งานเคลม", icon: <ClipboardList size={18} />, href: "/admin/claims", badge: "ใหม่" },
            { title: "ประวัติการเคลม", icon: <History size={18} />, href: "/admin/claims-history" },
        ],
    },
    {
        group: "ระบบงานซ่อม & เคลม",
        items: [
            { title: "แดชบอร์ดซ่อม", icon: <LayoutDashboard size={18} />, href: "/admin/repair" },
            { title: "รับเครื่องซ่อม/เคลม", icon: <Zap size={18} />, href: "/admin/repair/jobs/new" },
            { title: "รายการงานซ่อม", icon: <ClipboardList size={18} />, href: "/admin/repair/jobs" },
            { title: "จัดการพนักงานซ่อม", icon: <UserCog size={18} />, href: "/admin/repair/users" },
        ],
    },
    {
        group: "บุคลากร",
        items: [
            { title: "จัดการแอดมิน", icon: <UserCog size={18} />, href: "/admin/users" },
            { title: "ตัวแทน (Agents)", icon: <Users size={18} />, href: "/admin/agents" },
        ],
    },
    {
        group: "รายงาน & บัญชี",
        items: [
            { title: "กำไรจริง (Amortization)", icon: <Percent size={18} />, href: "/admin/accounting" },
            { title: "บันทึกการใช้งาน (Logs)", icon: <History size={18} />, href: "/admin/logs" },
        ],
    },
    {
        group: "เนื้อหาเว็บไซต์",
        items: [
            { title: "Hero Banner", icon: <LayoutTemplate size={18} />, href: "/admin/hero-banner" },
            { title: "Footer", icon: <LayoutTemplate size={18} />, href: "/admin/footer" },
            { title: "Floating Chat", icon: <MessageCircle size={18} />, href: "/admin/floating-chat" },
            { title: "นโยบาย & เงื่อนไข", icon: <Shield size={18} />, href: "/admin/legal-pages" },
            { title: "เงื่อนไข & ข้อตกลง", icon: <FileText size={18} />, href: "/admin/terms" },
            { title: "ตารางคำขอรับบริการ", icon: <History size={18} />, href: "/admin/service-request" },
        ],
    },
];

interface AdminSidebarProps {
    collapsed: boolean;
    onToggle: () => void;
}

export function AdminSidebar({ collapsed, onToggle }: AdminSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        if (!confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) return;
        try {
            const res = await fetch("/api/auth/logout", { method: "POST" });
            if (res.ok) {
                router.push("/admin/login");
                router.refresh();
            }
        } catch (error) {
            console.error(error);
        }
    };
    return (
        <aside
            className="h-screen bg-white flex flex-col fixed left-0 top-0 z-50 border-r border-gray-200 transition-all duration-300 ease-in-out"
            style={{ width: collapsed ? "72px" : "288px" }}
        >
            {/* Brand */}
            <div className="flex items-center h-16 border-b border-gray-100 shrink-0 px-4 relative overflow-hidden">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                    <Zap size={18} className="text-white" />
                </div>
                <div
                    className="ml-3 overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap"
                    style={{ opacity: collapsed ? 0 : 1, maxWidth: collapsed ? 0 : 200 }}
                >
                    <p className="text-[15px] font-bold text-gray-800 leading-none tracking-tight">NaravichCare</p>
                    <p className="text-[10px] text-blue-500 font-semibold uppercase tracking-[0.15em] mt-1">Admin Panel</p>
                </div>
                <button
                    onClick={onToggle}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-all"
                >
                    {collapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
                </button>
            </div>

            {/* Profile */}
            {!collapsed ? (
                <div className="px-4 pt-4 shrink-0">
                    <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 cursor-pointer group">
                        <div className="relative shrink-0">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-[13px] font-black">S</div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-gray-800 truncate">Super Admin</p>
                            <p className="text-[11px] text-gray-400 mt-0.5 truncate">owner@naravich.com</p>
                        </div>
                        <ChevronDown size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
                    </div>
                </div>
            ) : (
                <div className="flex justify-center pt-4 shrink-0">
                    <div className="relative">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-[13px] font-black cursor-pointer">S</div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white"></div>
                    </div>
                </div>
            )}

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: "none" }}>
                <style jsx>{`nav::-webkit-scrollbar { display: none; }`}</style>
                {navGroups.map((group) => (
                    <div key={group.group} className="mb-4">
                        {!collapsed
                            ? <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 px-3 mb-2">{group.group}</p>
                            : <div className="w-full h-px bg-gray-100 my-2" />
                        }
                        <div className="space-y-0.5">
                            {group.items.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link key={item.href} href={item.href} title={collapsed ? item.title : undefined}
                                        className={`relative flex items-center rounded-lg transition-all duration-150 group/item overflow-hidden ${collapsed ? "justify-center px-0 py-3" : "gap-3 px-3 py-2.5"} ${isActive ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}>
                                        {isActive && !collapsed && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-500 rounded-r-full" />}
                                        <span className={`shrink-0 transition-colors ${isActive ? "text-blue-600" : "text-gray-400 group-hover/item:text-gray-600"}`}>{item.icon}</span>
                                        {!collapsed && (
                                            <>
                                                <span className="flex-1 truncate text-[13.5px] font-medium">{item.title}</span>
                                                {item.badge !== undefined && (
                                                    <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${typeof item.badge === "string" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"}`}>{item.badge}</span>
                                                )}
                                            </>
                                        )}
                                        {collapsed && item.badge !== undefined && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            <div className="mx-4 border-t border-gray-100 shrink-0" />

            {/* Footer */}
            <div className="px-3 py-3 space-y-0.5 shrink-0">
                {[{ icon: <Bell size={18} />, label: "แจ้งเตือน", badge: "3", href: "/admin" }, { icon: <Settings size={18} />, label: "ตั้งค่าระบบ", href: "/admin" }].map((a) => (
                    <Link key={a.label} href={a.href} title={collapsed ? a.label : undefined}
                        className={`flex items-center rounded-lg text-[13.5px] font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-all group/item ${collapsed ? "justify-center py-3" : "gap-3 px-3 py-2.5"}`}>
                        <span className="shrink-0 text-gray-400 group-hover/item:text-gray-600">{a.icon}</span>
                        {!collapsed && <><span className="flex-1">{a.label}</span>{"badge" in a && a.badge && <span className="text-[10px] font-bold bg-red-100 text-red-500 px-2 py-0.5 rounded-full">{a.badge}</span>}</>}
                    </Link>
                ))}
                <button
                    title={collapsed ? "ออกจากระบบ" : undefined}
                    onClick={handleLogout}
                    className={`w-full flex items-center rounded-lg text-[13.5px] font-medium text-red-400 hover:text-red-600 hover:bg-red-50 transition-all ${collapsed ? "justify-center py-3" : "gap-3 px-3 py-2.5"}`}
                >
                    <LogOut size={18} className="shrink-0" />
                    {!collapsed && <span>ออกจากระบบ</span>}
                </button>
            </div>

            {!collapsed && (
                <div className="px-4 pb-4 shrink-0">
                    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200">
                        <Circle size={7} className="text-emerald-500 fill-emerald-500 shrink-0" />
                        <span className="text-[11px] text-gray-400 font-medium">All systems operational</span>
                    </div>
                </div>
            )}
        </aside>
    );
}
