"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import {
    AlertTriangle,
    Banknote,
    CheckCircle,
    ChevronRight,
    Clock,
    FileText,
    Loader2,
    ReceiptText,
    User,
    Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DashboardBranchRow, RepairDashboard } from "@/lib/repair/dashboard";
import { bangkokMonthDays, REPORT_TIME_ZONE } from "@/lib/repair/period";
import { repairStatusLabel } from "@/lib/repair/status";
import { formatBaht } from "@/components/admin/repair/format";

interface BranchOption {
    _id: string;
    name: string;
}

/** Link to the job list with the given filters (branch "none" = jobs with no branch). */
function jobsLink(filters: Record<string, string | null | undefined>): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
    const text = params.toString();
    return text ? `/admin/repair/jobs?${text}` : "/admin/repair/jobs";
}

const formatDay = (day: string) =>
    new Date(`${day}T12:00:00+07:00`).toLocaleDateString("th-TH", { dateStyle: "medium", timeZone: REPORT_TIME_ZONE });

const rowBranchParam = (row: DashboardBranchRow) => row.branchId ?? "none";

function CountLink({ href, value, tone }: { href: string; value: number; tone?: "red" | "green" }) {
    if (value === 0) return <span className="text-slate-300">0</span>;
    const color = tone === "red" ? "text-red-600" : tone === "green" ? "text-emerald-600" : "text-slate-800";
    return (
        <Link href={href} className={`font-black underline-offset-4 hover:underline ${color}`}>
            {value.toLocaleString("th-TH")}
        </Link>
    );
}

function RepairDashboardPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";
    const branchFilter = searchParams.get("branchId") || "";

    const [data, setData] = useState<RepairDashboard | null>(null);
    const [error, setError] = useState<string | null>(null);
    // The filters the shown figures belong to; loading while they differ from the URL's.
    const requestKey = `${from}|${to}|${branchFilter}`;
    const [loadedKey, setLoadedKey] = useState<string | null>(null);
    const loading = loadedKey !== requestKey;
    const [branches, setBranches] = useState<BranchOption[]>([]);
    const [allBranches, setAllBranches] = useState(false);

    const updateQuery = useCallback((changes: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        for (const [key, value] of Object.entries(changes)) {
            if (value) params.set(key, value);
            else params.delete(key);
        }
        const text = params.toString();
        router.replace(text ? `${pathname}?${text}` : pathname, { scroll: false });
    }, [pathname, router, searchParams]);

    useEffect(() => {
        fetch("/api/admin/repair/branches")
            .then((res) => (res.ok ? res.json() : null))
            .then((body: { branches?: BranchOption[]; allBranches?: boolean } | null) => {
                if (!body) return;
                setBranches(body.branches ?? []);
                setAllBranches(Boolean(body.allBranches));
            })
            .catch((err) => console.error("Fetch branches error:", err));
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        const params = new URLSearchParams();
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        if (branchFilter) params.set("branchId", branchFilter);
        fetch(`/api/admin/repair/stats?${params}`, { signal: controller.signal })
            .then(async (res) => {
                const body = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error((body as { error?: string }).error || "โหลดข้อมูลไม่สำเร็จ");
                setData(body as RepairDashboard);
                setError(null);
                setLoadedKey(requestKey);
            })
            .catch((err: Error) => {
                if (controller.signal.aborted) return;
                setError(err.message === "Branch not found" ? "ไม่พบสาขานี้ หรือไม่มีสิทธิ์ดูสาขานี้" : err.message);
                setLoadedKey(requestKey);
            });
        return () => controller.abort();
    }, [from, to, branchFilter, requestKey]);

    const thisMonth = bangkokMonthDays(new Date(), 0);
    const lastMonth = bangkokMonthDays(new Date(), -1);
    const fromDate = from || data?.period.fromDate || thisMonth.fromDate;
    const toDate = to || data?.period.toDate || thisMonth.toDate;
    const presets = [
        { label: "เดือนนี้", ...thisMonth },
        { label: "เดือนก่อน", ...lastMonth },
    ];

    const showBranchFilter = allBranches || branches.length > 1;
    const rows = data?.branches ?? [];
    const totals = data?.totals;
    const branchParam = data?.branchId ?? null;
    const scopeLabel = branchFilter
        ? rows[0]?.name ?? ""
        : !allBranches && branches.length === 1
            ? branches[0].name
            : allBranches ? "ทุกสาขา" : "สาขาที่ดูแล";
    const maxStatus = Math.max(1, ...(data?.statusBreakdown ?? []).map((entry) => entry.count));

    const cards = totals ? [
        {
            label: "งานค้าง",
            hint: "ยังไม่รับคืน/ยกเลิก",
            value: totals.openJobs.toLocaleString("th-TH"),
            icon: <Clock size={16} />,
            color: "text-slate-800",
            href: jobsLink({ status: "open", branchId: branchParam }),
        },
        {
            label: "เกินนัด",
            hint: "เลยวันนัด ยังซ่อมไม่เสร็จ",
            value: totals.overdueJobs.toLocaleString("th-TH"),
            icon: <AlertTriangle size={16} />,
            color: totals.overdueJobs > 0 ? "text-red-600" : "text-slate-800",
            href: jobsLink({ overdue: "1", branchId: branchParam }),
        },
        {
            label: "รอรับเครื่อง",
            hint: "ซ่อมเสร็จ รอลูกค้ารับ",
            value: totals.readyPickup.toLocaleString("th-TH"),
            icon: <CheckCircle size={16} />,
            color: "text-emerald-600",
            href: jobsLink({ status: "ready_pickup", branchId: branchParam }),
        },
        {
            label: "รับเงินจริง",
            hint: totals.refunded > 0 ? `หักคืนเงิน ${formatBaht(totals.refunded)} แล้ว` : "มัดจำ + ชำระ − คืนเงิน",
            value: formatBaht(totals.received),
            icon: <Banknote size={16} />,
            color: "text-blue-600",
        },
        {
            label: "ยอดค้างชำระ",
            hint: "ทุกงานที่ไม่ยกเลิก",
            value: formatBaht(totals.outstanding),
            icon: <ReceiptText size={16} />,
            color: totals.outstanding > 0 ? "text-amber-600" : "text-slate-800",
        },
    ] : [];

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col gap-4 border-b border-gray-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">ภาพรวมงานซ่อม</h1>
                    <p className="text-xs text-gray-500 font-medium mt-1">
                        {scopeLabel && <span className="font-bold text-slate-700">{scopeLabel} · </span>}
                        จำนวนงานและยอดค้างชำระเป็นสถานะปัจจุบัน ยอดรับเงินและค่าซ่อมร้านนอกตามช่วงวันที่เลือก
                    </p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <Link href="/admin/repair/jobs" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:border-slate-400">
                        <FileText size={14} /> รายการงานซ่อม
                    </Link>
                    <Link href="/admin/repair/jobs/new" className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-600">
                        <Wrench size={14} /> สร้างใบรับซ่อมใหม่
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm lg:flex-row lg:items-end">
                <div className="flex flex-wrap gap-2">
                    {presets.map((preset) => {
                        const active = fromDate === preset.fromDate && toDate === preset.toDate;
                        return (
                            <button
                                key={preset.label}
                                type="button"
                                onClick={() => updateQuery({ from: preset.fromDate, to: preset.toDate })}
                                className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${active ? "bg-slate-900 text-white" : "border border-slate-100 bg-slate-50 text-slate-500 hover:bg-white"}`}
                            >
                                {preset.label}
                            </button>
                        );
                    })}
                </div>
                <div className="grid grid-cols-2 gap-2 lg:flex">
                    <label className="text-[11px] font-bold text-slate-500">
                        ตั้งแต่
                        <input
                            type="date"
                            value={fromDate}
                            max={toDate}
                            onChange={(e) => e.target.value && updateQuery({ from: e.target.value, to: toDate })}
                            className="mt-1 block w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-500"
                        />
                    </label>
                    <label className="text-[11px] font-bold text-slate-500">
                        ถึง
                        <input
                            type="date"
                            value={toDate}
                            min={fromDate}
                            onChange={(e) => e.target.value && updateQuery({ from: fromDate, to: e.target.value })}
                            className="mt-1 block w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-500"
                        />
                    </label>
                </div>
                {showBranchFilter && (
                    <label className="text-[11px] font-bold text-slate-500 lg:ml-auto">
                        สาขา
                        <select
                            value={branchFilter}
                            onChange={(e) => updateQuery({ branchId: e.target.value || null })}
                            className="mt-1 block w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 lg:w-56"
                        >
                            <option value="">ทุกสาขา</option>
                            {branches.map((branch) => (
                                <option key={branch._id} value={branch._id}>{branch.name}</option>
                            ))}
                            {allBranches && <option value="none">ยังไม่ผูกสาขา</option>}
                        </select>
                    </label>
                )}
            </div>

            {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-bold text-red-700">{error}</div>
            ) : loading && !data ? (
                <div className="flex flex-col items-center justify-center py-32 text-gray-400">
                    <Loader2 className="animate-spin mb-4" size={40} />
                    <p className="text-sm font-bold">กำลังโหลดข้อมูล...</p>
                </div>
            ) : data && totals ? (
                <div className={`space-y-6 transition-opacity ${loading ? "opacity-60" : ""}`}>
                    <p className="text-xs font-bold text-slate-500">
                        ช่วงวันที่ {formatDay(data.period.fromDate)} – {formatDay(data.period.toDate)}
                    </p>

                    {/* Summary cards */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                        {cards.map((card) => {
                            const body = (
                                <>
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <span className={card.color}>{card.icon}</span>
                                        <span className="text-xs font-black text-slate-500">{card.label}</span>
                                        {card.href && <ChevronRight size={14} className="ml-auto opacity-0 transition-opacity group-hover:opacity-100" />}
                                    </div>
                                    <div className={`mt-2 truncate text-2xl font-black tracking-tight ${card.color}`}>{card.value}</div>
                                    <p className="mt-1 text-[10px] font-medium text-slate-400">{card.hint}</p>
                                </>
                            );
                            const className = "group min-w-0 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm";
                            return card.href ? (
                                <Link key={card.label} href={card.href} className={`${className} transition-all hover:border-slate-300 hover:shadow-md`}>
                                    {body}
                                </Link>
                            ) : (
                                <div key={card.label} className={className}>{body}</div>
                            );
                        })}
                    </div>

                    {/* Per-branch table */}
                    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                        <div className="border-b border-gray-100 px-5 py-4">
                            <h2 className="text-sm font-black text-slate-800">แยกตามสาขา</h2>
                        </div>
                        {rows.length === 0 ? (
                            <p className="px-5 py-10 text-center text-sm font-bold text-slate-400">ไม่มีสาขาที่ดูได้</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[760px] text-sm">
                                    <thead className="bg-slate-50 text-[11px] font-black text-slate-500">
                                        <tr>
                                            <th className="px-5 py-3 text-left">สาขา</th>
                                            <th className="px-3 py-3 text-right">งานค้าง</th>
                                            <th className="px-3 py-3 text-right">เกินนัด</th>
                                            <th className="px-3 py-3 text-right">รอรับเครื่อง</th>
                                            <th className="px-3 py-3 text-right">รับเงินจริง</th>
                                            <th className="px-3 py-3 text-right">ยอดค้างชำระ</th>
                                            <th className="px-5 py-3 text-right">ค่าซ่อมร้านนอก</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {rows.map((row) => {
                                            const branch = rowBranchParam(row);
                                            return (
                                                <tr key={branch} className="hover:bg-slate-50/60">
                                                    <td className="px-5 py-3 font-bold text-slate-800">
                                                        {row.branchId ? row.name : <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs text-amber-700">{row.name}</span>}
                                                        {!row.isActive && <span className="ml-2 text-[10px] font-medium text-slate-400">(ปิดใช้งาน)</span>}
                                                    </td>
                                                    <td className="px-3 py-3 text-right"><CountLink href={jobsLink({ status: "open", branchId: branch })} value={row.openJobs} /></td>
                                                    <td className="px-3 py-3 text-right"><CountLink href={jobsLink({ overdue: "1", branchId: branch })} value={row.overdueJobs} tone="red" /></td>
                                                    <td className="px-3 py-3 text-right"><CountLink href={jobsLink({ status: "ready_pickup", branchId: branch })} value={row.readyPickup} tone="green" /></td>
                                                    <td className="px-3 py-3 text-right font-bold text-slate-700">
                                                        {formatBaht(row.received)}
                                                        {row.refunded > 0 && <div className="text-[10px] font-medium text-slate-400">คืน {formatBaht(row.refunded)}</div>}
                                                    </td>
                                                    <td className={`px-3 py-3 text-right font-bold ${row.outstanding > 0 ? "text-amber-600" : "text-slate-400"}`}>{formatBaht(row.outstanding)}</td>
                                                    <td className="px-5 py-3 text-right font-bold text-slate-500">{formatBaht(row.externalCost)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    {rows.length > 1 && (
                                        <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-black text-slate-800">
                                            <tr>
                                                <td className="px-5 py-3">รวม</td>
                                                <td className="px-3 py-3 text-right">{totals.openJobs.toLocaleString("th-TH")}</td>
                                                <td className="px-3 py-3 text-right text-red-600">{totals.overdueJobs.toLocaleString("th-TH")}</td>
                                                <td className="px-3 py-3 text-right text-emerald-600">{totals.readyPickup.toLocaleString("th-TH")}</td>
                                                <td className="px-3 py-3 text-right">{formatBaht(totals.received)}</td>
                                                <td className="px-3 py-3 text-right text-amber-600">{formatBaht(totals.outstanding)}</td>
                                                <td className="px-5 py-3 text-right">{formatBaht(totals.externalCost)}</td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="grid gap-6 lg:grid-cols-3">
                        {/* Status breakdown */}
                        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2">
                            <h2 className="mb-4 text-sm font-black text-slate-800">งานตามสถานะ (ทั้งหมด)</h2>
                            {data.statusBreakdown.length === 0 ? (
                                <p className="py-6 text-center text-sm font-bold text-slate-400">ยังไม่มีงานซ่อม</p>
                            ) : (
                                <ul className="space-y-2">
                                    {data.statusBreakdown.map((entry) => (
                                        <li key={entry.status}>
                                            <Link href={jobsLink({ status: entry.status, branchId: branchParam })} className="group grid grid-cols-[8rem_1fr_3rem] items-center gap-3 text-xs sm:grid-cols-[10rem_1fr_3rem]">
                                                <span className="truncate font-bold text-slate-600 group-hover:text-blue-600">{repairStatusLabel(entry.status)}</span>
                                                <span className="h-2 overflow-hidden rounded-full bg-slate-100">
                                                    <span className="block h-full rounded-full bg-slate-700 group-hover:bg-blue-600" style={{ width: `${(entry.count / maxStatus) * 100}%` }} />
                                                </span>
                                                <span className="text-right font-black text-slate-800">{entry.count.toLocaleString("th-TH")}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Quick links */}
                        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                            <h2 className="mb-3 text-sm font-black text-slate-800">ทางลัด</h2>
                            <div className="grid gap-1">
                                {[
                                    { label: "รายการงานซ่อม", href: "/admin/repair/jobs", icon: <FileText size={14} /> },
                                    { label: "งานเกินนัด", href: jobsLink({ overdue: "1", branchId: branchParam }), icon: <AlertTriangle size={14} /> },
                                    { label: "ทะเบียนลูกค้า", href: "/admin/repair/customers", icon: <User size={14} /> },
                                ].map((link) => (
                                    <Link key={link.label} href={link.href} className="flex items-center justify-between rounded-xl p-3 text-xs font-bold text-slate-700 hover:bg-slate-900 hover:text-white">
                                        <span className="flex items-center gap-3">{link.icon} {link.label}</span>
                                        <ChevronRight size={14} />
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export default function RepairDashboardRoute() {
    return (
        <Suspense
            fallback={
                <div className="flex flex-col items-center justify-center py-32 text-gray-400">
                    <Loader2 className="animate-spin" size={40} />
                </div>
            }
        >
            <RepairDashboardPage />
        </Suspense>
    );
}
