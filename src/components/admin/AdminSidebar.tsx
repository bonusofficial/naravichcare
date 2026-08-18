"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard, Smartphone, ShieldCheck, Users,
    ClipboardList, FileText, LogOut, TrendingDown, Percent,
    UserCog, UserCircle, ChevronDown, Settings, Bell, Zap,
    Circle, ChevronsLeft, ChevronsRight, History, LayoutTemplate, MessageCircle, Shield,
    DollarSign,
} from "lucide-react";
import { useCurrentAdmin } from "@/hooks/useCurrentAdmin";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/permissions";

type NavItem = { title: string; icon: React.ReactNode; href: string; badge?: string | number; permission?: string };
type NavGroup = { group: string; items: NavItem[] };

const navGroups: NavGroup[] = [
    {
        group: "ภาพรวม",
        items: [{ title: "Dashboard", icon: <LayoutDashboard size={18} />, href: "/admin", permission: "view_dashboard" }],
    },
    {
        group: "การดำเนินงาน",
        items: [
            { title: "รายการลงทะเบียน", icon: <ClipboardList size={18} />, href: "/admin/registrations", permission: "view_registrations" },
            { title: "จัดการแพ็กเกจ", icon: <Zap size={18} />, href: "/admin/packages", permission: "view_packages" },
            { title: "จัดการแผน (Step 3)", icon: <ShieldCheck size={18} />, href: "/admin/coverage-plans", permission: "view_coverage_plans" },
            { title: "งานเคลม", icon: <ClipboardList size={18} />, href: "/admin/claims", badge: "ใหม่", permission: "view_claims" },
            { title: "ประวัติการเคลม", icon: <History size={18} />, href: "/admin/claims-history", permission: "view_claims" },
        ],
    },
    {
        group: "ระบบงานซ่อม & เคลม",
        items: [
            { title: "แดชบอร์ดซ่อม", icon: <LayoutDashboard size={18} />, href: "/admin/repair", permission: "view_repair_jobs" },
            { title: "รับเครื่องซ่อม/เคลม", icon: <Zap size={18} />, href: "/admin/repair/jobs/new", permission: "create_repair_jobs" },
            { title: "รายการงานซ่อม", icon: <ClipboardList size={18} />, href: "/admin/repair/jobs", permission: "view_repair_jobs" },
            { title: "จัดการพนักงานซ่อม", icon: <UserCog size={18} />, href: "/admin/repair/users", permission: "view_admin_users" },
        ],
    },
    {
        group: "ซื้อคืนแพ็ก (Buyback)",
        items: [
            { title: "รายการซื้อคืน", icon: <TrendingDown size={18} />, href: "/admin/buybacks", permission: "view_buybacks" },
            { title: "เปิดรายการซื้อคืน", icon: <Zap size={18} />, href: "/admin/buybacks/new", permission: "create_buybacks" },
            { title: "แก้ข้อมูลแพ็กเก่า", icon: <Settings size={18} />, href: "/admin/buybacks/coverage-data", permission: "edit_coverage_data" },
        ],
    },
    {
        group: "บุคลากร",
        items: [
            { title: "จัดการแอดมิน", icon: <UserCog size={18} />, href: "/admin/users", permission: "view_admin_users" },
            { title: "จัดการสิทธิ์ (Roles)", icon: <Shield size={18} />, href: "/admin/roles", permission: "view_roles" },
            { title: "จัดการสาขา", icon: <LayoutTemplate size={18} />, href: "/admin/branches", permission: "view_branches" },
            { title: "ตัวแทน (Agents)", icon: <Users size={18} />, href: "/admin/agents", permission: "view_agents" },
        ],
    },
    {
        group: "รายงาน & บัญชี",
        items: [
            { title: "กำไรสุทธิ", icon: <DollarSign size={18} />, href: "/admin/profit-report", permission: "view_profit_report" },
            { title: "กำไรจริง (Amortization)", icon: <Percent size={18} />, href: "/admin/accounting", permission: "view_accounting" },
            { title: "บันทึกการใช้งาน (Logs)", icon: <History size={18} />, href: "/admin/logs", permission: "view_logs" },
        ],
    },
    {
        group: "เนื้อหาเว็บไซต์",
        items: [
            { title: "Hero Banner", icon: <LayoutTemplate size={18} />, href: "/admin/hero-banner", permission: "edit_hero_banner" },
            { title: "Footer", icon: <LayoutTemplate size={18} />, href: "/admin/footer", permission: "edit_footer" },
            { title: "Floating Chat", icon: <MessageCircle size={18} />, href: "/admin/floating-chat", permission: "edit_floating_chat" },
            { title: "นโยบาย & เงื่อนไข", icon: <Shield size={18} />, href: "/admin/legal-pages", permission: "edit_legal_pages" },
            { title: "เงื่อนไข & ข้อตกลง", icon: <FileText size={18} />, href: "/admin/terms", permission: "edit_terms" },
            { title: "ตารางคำขอรับบริการ", icon: <History size={18} />, href: "/admin/service-request", permission: "edit_service_request" },
        ],
    },
];

interface AdminSidebarProps {
    collapsed: boolean;
    mobileOpen: boolean;
    onMobileClose: () => void;
    onToggle: () => void;
}

export function AdminSidebar({ collapsed, mobileOpen, onMobileClose, onToggle }: AdminSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    // Permissions arrive with the user from /api/auth/me. Fetching them from
    // /api/admin/roles instead required view_roles, which technician and staff
    // don't have, so their sidebar rendered empty.
    const { user, permissions: userPermissions, loading } = useCurrentAdmin();

    // Don't render until the current user is known
    if (loading) {
        return null;
    }

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

    const roleColors = user ? ROLE_COLORS[user.role] || ROLE_COLORS.staff : ROLE_COLORS.staff;
    const roleLabel = user ? ROLE_LABELS[user.role] || user.role : "Loading...";
    const userName = user?.name || user?.username || "User";
    const userEmail = user?.email || "user@naravich.com";
    const initials = userName.substring(0, 1).toUpperCase();

    // Filter nav items based on user permissions
    const filteredNavGroups = navGroups
        .map(group => ({
            ...group,
            items: group.items.filter(item => {
                // If no permission specified, show to everyone
                if (!item.permission) return true;
                // Check if user has the required permission
                return userPermissions.includes(item.permission);
            })
        }))
        // Remove groups that have no visible items
        .filter(group => group.items.length > 0);

    return (
        <aside
            className={`fixed left-0 top-0 z-50 flex h-dvh w-[calc(100vw-2rem)] max-w-72 flex-col border-r border-gray-200 bg-white shadow-2xl transition-all duration-300 ease-in-out lg:w-[var(--admin-sidebar-width)] lg:shadow-none ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
            style={{ "--admin-sidebar-width": `${collapsed ? 72 : 288}px` } as React.CSSProperties}
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
                    className="absolute right-2 top-1/2 hidden -translate-y-1/2 w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600 lg:flex items-center justify-center transition-all"
                >
                    {collapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
                </button>
                <button
                    type="button"
                    aria-label="ปิดเมนูหลังบ้าน"
                    onClick={onMobileClose}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-gray-100 text-gray-500 lg:hidden"
                >
                    <ChevronsLeft size={16} />
                </button>
            </div>

            {/* Profile */}
            {!collapsed ? (
                <div className="px-4 pt-4 shrink-0">
                    <div className={`flex items-center gap-3 px-3 py-3 rounded-xl ${roleColors.bg} hover:opacity-90 border border-gray-200 cursor-pointer group`}>
                        <div className="relative shrink-0">
                            <div className={`w-9 h-9 rounded-xl ${user?.role === 'super_admin' ? 'bg-gradient-to-br from-purple-600 to-purple-800' : user?.role === 'admin' ? 'bg-gradient-to-br from-blue-600 to-indigo-600' : 'bg-gradient-to-br from-gray-600 to-gray-800'} flex items-center justify-center text-white text-[13px] font-black`}>
                                {initials}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-gray-800 truncate">{userName}</p>
                            <p className={`text-[11px] mt-0.5 truncate font-semibold ${roleColors.text}`}>{roleLabel}</p>
                        </div>
                        <ChevronDown size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
                    </div>
                </div>
            ) : (
                <div className="flex justify-center pt-4 shrink-0">
                    <div className="relative">
                        <div className={`w-9 h-9 rounded-xl ${user?.role === 'super_admin' ? 'bg-gradient-to-br from-purple-600 to-purple-800' : user?.role === 'admin' ? 'bg-gradient-to-br from-blue-600 to-indigo-600' : 'bg-gradient-to-br from-gray-600 to-gray-800'} flex items-center justify-center text-white text-[13px] font-black cursor-pointer`}>
                            {initials}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white"></div>
                    </div>
                </div>
            )}

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: "none" }}>
                <style jsx>{`nav::-webkit-scrollbar { display: none; }`}</style>
                {filteredNavGroups.map((group) => (
                    <div key={group.group} className="mb-4">
                        {!collapsed && (
                            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 px-3 mb-2">
                                {group.group}
                            </p>
                        )}
                        {collapsed && <div className="w-full h-px bg-gray-100 my-2" />}
                        <div className="space-y-0.5">
                            {group.items.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link key={item.href} href={item.href} onClick={onMobileClose} title={collapsed ? item.title : undefined}
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
                {[{ icon: <Bell size={18} />, label: "แจ้งเตือน", badge: "3", href: "/admin" }, { icon: <Settings size={18} />, label: "เปลี่ยนรหัสผ่าน", href: "/admin/change-password" }].map((a) => (
                    <Link key={a.label} href={a.href} onClick={onMobileClose} title={collapsed ? a.label : undefined}
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
