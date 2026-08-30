"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DollarSign, TrendingUp, Package as PackageIcon, Users, Download, Filter, ChevronRight, X, Pencil } from "lucide-react";

interface ProfitData {
    packageId?: string;
    packageName?: string;
    agentCode?: string;
    agentName?: string;
    salesCount: number;
    cancelledCount: number;
    refundedCount: number;
    totalRevenue: number;
    totalCost: number;
    totalPackageCost: number;
    totalCommission: number;
    totalOtherExpenses: number;
    totalProfit: number;
    avgProfitPerSale: number;
    profitMargin: number;
}

interface Summary {
    totalSales: number;
    cancelledCount: number;
    refundedCount: number;
    totalRevenue: number;
    totalCost: number;
    totalCommission: number;
    totalProfit: number;
    profitMargin: number;
}

interface SaleRow {
    _id: string;
    approvedAt?: string;
    policyNumber?: string;
    referenceNumber?: string;
    customerName: string;
    packageName: string;
    agentName: string;
    salePrice: number;
    packageCost: number;
    agentCommission: number;
    otherExpenses: number;
    netProfit: number;
    status: string;
    isVoid?: boolean;
}

type GroupBy = "package" | "agent" | "both";

interface EditForm {
    salePrice: number;
    packageCost: number;
    agentCommission: number;
    otherExpenses: number;
}

/** The row the user drilled into, plus which axis to break it down by. */
interface Drill {
    label: string;
    packageId?: string;
    agentCode?: string;
    breakdownBy: Exclude<GroupBy, "both">;
}

const STATUS_LABELS: Record<string, string> = {
    approved: "สำเร็จ",
    cancelled: "ยกเลิก",
    refunded: "คืนเงิน",
};

export default function ProfitReportPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<ProfitData[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [groupBy, setGroupBy] = useState<GroupBy>("package");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedPackage, setSelectedPackage] = useState("");
    const [selectedAgent, setSelectedAgent] = useState("");
    const [status, setStatus] = useState("");

    // Filter dropdown options
    const [packages, setPackages] = useState<any[]>([]);
    const [agents, setAgents] = useState<any[]>([]);

    // Drill-down
    const [drill, setDrill] = useState<Drill | null>(null);
    const [drillData, setDrillData] = useState<ProfitData[]>([]);
    const [drillSales, setDrillSales] = useState<SaleRow[]>([]);
    const [drillLoading, setDrillLoading] = useState(false);
    const [exporting, setExporting] = useState(false);

    // Inline correction of a single sale
    const [editing, setEditing] = useState<SaleRow | null>(null);
    const [editForm, setEditForm] = useState<EditForm>({ salePrice: 0, packageCost: 0, agentCommission: 0, otherExpenses: 0 });
    const [saving, setSaving] = useState(false);

    const updateEditField = (field: keyof EditForm, value: number) =>
        setEditForm(prev => ({ ...prev, [field]: value }));

    const baseParams = useCallback(() => {
        const params = new URLSearchParams();
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);
        if (selectedPackage) params.append("packageId", selectedPackage);
        if (selectedAgent) params.append("agentCode", selectedAgent);
        if (status) params.append("status", status);
        return params;
    }, [startDate, endDate, selectedPackage, selectedAgent, status]);

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const params = baseParams();
            params.append("groupBy", groupBy);

            const res = await fetch(`/api/admin/profit-report?${params.toString()}`);
            const json = await res.json();

            if (json.success) {
                setData(json.data);
                setSummary(json.summary);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [baseParams, groupBy]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    // Load the filter dropdown options once.
    useEffect(() => {
        fetch("/api/packages")
            .then(res => res.ok ? res.json() : [])
            .then(json => setPackages(Array.isArray(json) ? json : []))
            .catch(() => setPackages([]));

        // Returns { success, agents }. Degrades to an empty dropdown for a role
        // that can read the report but not the agent list.
        fetch("/api/admin/agents")
            .then(res => res.ok ? res.json() : null)
            .then(json => setAgents(json?.agents ?? []))
            .catch(() => setAgents([]));
    }, []);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("th-TH", {
            style: "currency",
            currency: "THB",
            minimumFractionDigits: 0,
        }).format(value || 0);
    };

    const formatPercent = (value: number) => `${(value || 0).toFixed(2)}%`;

    const formatDate = (value?: string) =>
        value ? new Date(value).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" }) : "-";

    /**
     * Open the opposite view of the row that was clicked: a package row breaks
     * down by agent, an agent row breaks down by package.
     */
    const openDrill = async (row: ProfitData) => {
        const byAgentRow = groupBy === "agent";
        const next: Drill = {
            label: byAgentRow ? (row.agentName || "ไม่ระบุ") : (row.packageName || "ไม่ระบุ"),
            packageId: byAgentRow ? undefined : row.packageId,
            agentCode: byAgentRow ? row.agentCode : undefined,
            breakdownBy: byAgentRow ? "package" : "agent",
        };

        // In the combined view a row already pins both axes.
        if (groupBy === "both") {
            next.agentCode = row.agentCode;
            next.label = `${row.packageName} · ${row.agentName}`;
        }

        setDrill(next);
        setDrillLoading(true);

        try {
            const params = baseParams();
            if (next.packageId) params.set("packageId", next.packageId);
            if (next.agentCode) params.set("agentCode", next.agentCode);

            const groupParams = new URLSearchParams(params);
            groupParams.append("groupBy", next.breakdownBy);

            const detailParams = new URLSearchParams(params);
            detailParams.append("limit", "100");

            const [groupRes, salesRes] = await Promise.all([
                fetch(`/api/admin/profit-report?${groupParams.toString()}`),
                fetch(`/api/admin/profit-report/details?${detailParams.toString()}`),
            ]);

            const groupJson = await groupRes.json();
            const salesJson = await salesRes.json();

            setDrillData(groupJson?.success ? groupJson.data : []);
            setDrillSales(salesJson?.success ? salesJson.data : []);
        } catch (error) {
            console.error(error);
            setDrillData([]);
            setDrillSales([]);
        } finally {
            setDrillLoading(false);
        }
    };

    const closeDrill = () => {
        setDrill(null);
        setDrillData([]);
        setDrillSales([]);
    };

    const toCsv = (table: (string | number)[][]) =>
        table.map(cols => cols.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");

    const download = (csv: string, filename: string) => {
        // BOM so Excel reads the Thai column headers correctly.
        const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    };

    const summaryTable = () => {
        const headers = [
            ...(groupBy !== "agent" ? ["แพ็กเกจ"] : []),
            ...(groupBy !== "package" ? ["เอเจนต์"] : []),
            "ยอดขาย", "ยกเลิก", "คืนเงิน", "รายได้", "ต้นทุนรวม",
            "ต้นทุนแพ็ก", "ค่าคอมมิชชั่น", "ค่าใช้จ่ายอื่น", "กำไรสุทธิ", "กำไรเฉลี่ย/รายการ", "% Margin",
        ];
        const rows = data.map(row => [
            ...(groupBy !== "agent" ? [row.packageName ?? ""] : []),
            ...(groupBy !== "package" ? [row.agentName ?? ""] : []),
            row.salesCount, row.cancelledCount, row.refundedCount,
            row.totalRevenue, row.totalCost, row.totalPackageCost,
            row.totalCommission, row.totalOtherExpenses, row.totalProfit,
            Math.round(row.avgProfitPerSale), row.profitMargin.toFixed(2),
        ]);
        return [headers, ...rows];
    };

    // Exports the individual sales, not just the per-package totals — the totals
    // alone are not enough to reconcile a month against the policies behind it.
    const exportSalesCsv = async () => {
        setExporting(true);
        try {
            const params = baseParams();
            params.append("page", "1");
            // One page big enough to hold the whole filtered result set; the
            // endpoint defaults to 50, which silently truncated the export.
            params.append("limit", "10000");
            const response = await fetch(`/api/admin/profit-report/details?${params.toString()}`);
            const json = await response.json();
            const sales: SaleRow[] = json?.data ?? [];

            if (sales.length === 0) {
                alert("ไม่มีรายการขายในช่วงที่เลือก");
                return;
            }

            const headers = [
                "วันที่ขาย", "เลขกรมธรรม์", "เลขอ้างอิง", "ลูกค้า", "แพ็กเกจ", "เอเจนต์",
                "ราคาขาย", "ต้นทุนแพ็ก", "ค่าคอมมิชชั่น", "ค่าใช้จ่ายอื่น", "กำไรสุทธิ", "สถานะ",
            ];
            const rows = sales.map(sale => [
                sale.approvedAt ? new Date(sale.approvedAt).toLocaleDateString("th-TH") : "",
                sale.policyNumber ?? "",
                sale.referenceNumber ?? "",
                sale.customerName ?? "",
                sale.packageName ?? "",
                sale.agentName ?? "",
                sale.salePrice, sale.packageCost, sale.agentCommission,
                sale.otherExpenses, sale.netProfit,
                sale.isVoid ? "ยกเลิก/คืนเงิน" : "สำเร็จ",
            ]);

            // Both views in one file: the per-sale detail, then the totals below it.
            const csv = [
                ...[headers, ...rows],
                [],
                ["สรุปตามกลุ่ม"],
                ...summaryTable(),
            ];
            download(toCsv(csv), `profit-report-${new Date().toISOString().slice(0, 10)}.csv`);
        } catch (error) {
            console.error(error);
            alert("ส่งออกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
        } finally {
            setExporting(false);
        }
    };

    const startEdit = (sale: SaleRow) => {
        setEditing(sale);
        setEditForm({
            salePrice: sale.salePrice || 0,
            packageCost: sale.packageCost || 0,
            agentCommission: sale.agentCommission || 0,
            otherExpenses: sale.otherExpenses || 0,
        });
    };

    const saveEdit = async () => {
        if (!editing) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/admin/profit-report/${editing._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editForm),
            });
            if (!res.ok) {
                const err = await res.json();
                alert(err.message || err.error || "บันทึกไม่สำเร็จ");
                return;
            }
            setEditing(null);
            await fetchReport();
            if (drill) {
                const row = data.find(r => r.packageId === drill.packageId || r.agentCode === drill.agentCode);
                if (row) await openDrill(row);
            }
        } catch (error) {
            console.error(error);
            alert("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        } finally {
            setSaving(false);
        }
    };

    const colSpan = groupBy === "both" ? 10 : 9;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">รายงานกำไรสุทธิ</h1>
                    <p className="text-sm text-gray-500 mt-1">สรุปกำไร-ขาดทุนจากการขายประกัน</p>
                </div>
                <button
                    onClick={exportSalesCsv}
                    disabled={data.length === 0 || exporting}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Download size={16} />
                    <span className="font-medium">{exporting ? "กำลังส่งออก..." : "ส่งออก CSV"}</span>
                </button>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl p-5 border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                <PackageIcon size={20} className="text-blue-600" />
                            </div>
                            <span className="text-xs font-semibold text-gray-400">ยอดขาย</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{summary.totalSales.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 mt-1">
                            รายการ
                            {(summary.cancelledCount > 0 || summary.refundedCount > 0) && (
                                <span className="text-red-500">
                                    {" "}· ยกเลิก {summary.cancelledCount} · คืนเงิน {summary.refundedCount}
                                </span>
                            )}
                        </p>
                    </div>

                    <div className="bg-white rounded-xl p-5 border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                                <DollarSign size={20} className="text-green-600" />
                            </div>
                            <span className="text-xs font-semibold text-gray-400">รายได้รวม</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalRevenue)}</p>
                        <p className="text-xs text-gray-500 mt-1">ต้นทุนรวม {formatCurrency(summary.totalCost)}</p>
                    </div>

                    <div className="bg-white rounded-xl p-5 border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                                <TrendingUp size={20} className="text-purple-600" />
                            </div>
                            <span className="text-xs font-semibold text-gray-400">กำไรสุทธิ</span>
                        </div>
                        <p className={`text-2xl font-bold ${summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(summary.totalProfit)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{formatPercent(summary.profitMargin)} Margin</p>
                    </div>

                    <div className="bg-white rounded-xl p-5 border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                                <Users size={20} className="text-orange-600" />
                            </div>
                            <span className="text-xs font-semibold text-gray-400">ค่าคอมมิชชั่น</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalCommission)}</p>
                        <p className="text-xs text-gray-500 mt-1">THB</p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-xl p-5 border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                    <Filter size={18} className="text-gray-400" />
                    <h3 className="text-sm font-bold text-gray-700">ตัวกรอง</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">จัดกลุ่มตาม</label>
                        <select
                            value={groupBy}
                            onChange={(e) => { closeDrill(); setGroupBy(e.target.value as GroupBy); }}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="package">แพ็กเกจ</option>
                            <option value="agent">เอเจนต์</option>
                            <option value="both">แพ็กเกจ + เอเจนต์</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">วันที่เริ่มต้น</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">วันที่สิ้นสุด</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">แพ็กประกัน</label>
                        <select
                            value={selectedPackage}
                            onChange={(e) => { closeDrill(); setSelectedPackage(e.target.value); }}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">ทั้งหมด</option>
                            {packages.map((p: any) => (
                                <option key={p._id} value={p._id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">เอเจนต์</label>
                        <select
                            value={selectedAgent}
                            onChange={(e) => { closeDrill(); setSelectedAgent(e.target.value); }}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">ทั้งหมด</option>
                            {agents.map((a: any) => (
                                <option key={a._id || a.agentCode} value={a.agentCode}>{a.name} ({a.agentCode})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">สถานะรายการ</label>
                        <select
                            value={status}
                            onChange={(e) => { closeDrill(); setStatus(e.target.value); }}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">ทั้งหมด</option>
                            <option value="approved">สำเร็จ</option>
                            <option value="cancelled">ยกเลิก</option>
                            <option value="refunded">คืนเงิน</option>
                        </select>
                    </div>
                </div>
                <p className="text-xs text-gray-400 mt-3">
                    รายการที่ยกเลิก/คืนเงินไม่ถูกนับเป็นยอดขาย รายได้และค่าคอมถูกหักคืน แต่ต้นทุนแพ็กยังคงคิดเป็นค่าใช้จ่าย
                </p>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                {groupBy !== "agent" && <th className="text-left py-3 px-4 text-xs font-bold text-gray-600 uppercase">แพ็กเกจ</th>}
                                {groupBy !== "package" && <th className="text-left py-3 px-4 text-xs font-bold text-gray-600 uppercase">เอเจนต์</th>}
                                <th className="text-right py-3 px-4 text-xs font-bold text-gray-600 uppercase">ยอดขาย</th>
                                <th className="text-right py-3 px-4 text-xs font-bold text-gray-600 uppercase">รายได้</th>
                                <th className="text-right py-3 px-4 text-xs font-bold text-gray-600 uppercase">ต้นทุน</th>
                                <th className="text-right py-3 px-4 text-xs font-bold text-gray-600 uppercase">คอมมิชชั่น</th>
                                <th className="text-right py-3 px-4 text-xs font-bold text-gray-600 uppercase">กำไรสุทธิ</th>
                                <th className="text-right py-3 px-4 text-xs font-bold text-gray-600 uppercase">เฉลี่ย/รายการ</th>
                                <th className="text-right py-3 px-4 text-xs font-bold text-gray-600 uppercase">% Margin</th>
                                <th className="text-center py-3 px-4 text-xs font-bold text-gray-600 uppercase">รายละเอียด</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={colSpan} className="text-center py-12 text-gray-400">กำลังโหลด...</td>
                                </tr>
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={colSpan} className="text-center py-12 text-gray-400">ไม่พบข้อมูล</td>
                                </tr>
                            ) : (
                                data.map((row, idx) => (
                                    <tr
                                        key={idx}
                                        onClick={() => openDrill(row)}
                                        className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                                    >
                                        {groupBy !== "agent" && (
                                            <td className="py-3 px-4">
                                                <p className="text-sm font-semibold text-gray-800">{row.packageName}</p>
                                            </td>
                                        )}
                                        {groupBy !== "package" && (
                                            <td className="py-3 px-4">
                                                <p className="text-sm font-semibold text-gray-800">{row.agentName}</p>
                                                <p className="text-xs text-gray-500">{row.agentCode}</p>
                                            </td>
                                        )}
                                        <td className="py-3 px-4 text-right text-sm font-medium text-gray-700">
                                            {row.salesCount}
                                            {(row.cancelledCount > 0 || row.refundedCount > 0) && (
                                                <span className="block text-xs text-red-500">
                                                    -{row.cancelledCount + row.refundedCount}
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-right text-sm font-medium text-gray-800">{formatCurrency(row.totalRevenue)}</td>
                                        <td className="py-3 px-4 text-right text-sm text-gray-600">{formatCurrency(row.totalCost)}</td>
                                        <td className="py-3 px-4 text-right text-sm text-orange-600">{formatCurrency(row.totalCommission)}</td>
                                        <td className={`py-3 px-4 text-right text-sm font-bold ${row.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatCurrency(row.totalProfit)}
                                        </td>
                                        <td className="py-3 px-4 text-right text-sm text-gray-600">{formatCurrency(row.avgProfitPerSale)}</td>
                                        <td className="py-3 px-4 text-right text-sm font-medium text-gray-700">{formatPercent(row.profitMargin)}</td>
                                        <td className="py-3 px-4 text-center">
                                            <ChevronRight size={18} className="inline text-blue-600" />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Drill-down */}
            {drill && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50">
                        <div>
                            <h3 className="text-sm font-bold text-gray-800">{drill.label}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {drill.breakdownBy === "agent" ? "แยกตามเอเจนต์ที่ขายแพ็กนี้" : "แยกตามแพ็กที่เอเจนต์คนนี้ขาย"}
                            </p>
                        </div>
                        <button onClick={closeDrill} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    {drillLoading ? (
                        <div className="text-center py-10 text-gray-400 text-sm">กำลังโหลด...</div>
                    ) : (
                        <>
                            <div className="overflow-x-auto border-b border-gray-200">
                                <table className="w-full">
                                    <thead className="bg-gray-50/60">
                                        <tr>
                                            <th className="text-left py-2.5 px-4 text-xs font-bold text-gray-600 uppercase">
                                                {drill.breakdownBy === "agent" ? "เอเจนต์" : "แพ็กเกจ"}
                                            </th>
                                            <th className="text-right py-2.5 px-4 text-xs font-bold text-gray-600 uppercase">ยอดขาย</th>
                                            <th className="text-right py-2.5 px-4 text-xs font-bold text-gray-600 uppercase">รายได้</th>
                                            <th className="text-right py-2.5 px-4 text-xs font-bold text-gray-600 uppercase">ต้นทุน</th>
                                            <th className="text-right py-2.5 px-4 text-xs font-bold text-gray-600 uppercase">กำไรสุทธิ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {drillData.length === 0 ? (
                                            <tr><td colSpan={5} className="text-center py-6 text-gray-400 text-sm">ไม่พบข้อมูล</td></tr>
                                        ) : drillData.map((row, idx) => (
                                            <tr key={idx}>
                                                <td className="py-2.5 px-4 text-sm text-gray-800">
                                                    {drill.breakdownBy === "agent" ? row.agentName : row.packageName}
                                                </td>
                                                <td className="py-2.5 px-4 text-right text-sm text-gray-700">{row.salesCount}</td>
                                                <td className="py-2.5 px-4 text-right text-sm text-gray-700">{formatCurrency(row.totalRevenue)}</td>
                                                <td className="py-2.5 px-4 text-right text-sm text-gray-600">{formatCurrency(row.totalCost)}</td>
                                                <td className={`py-2.5 px-4 text-right text-sm font-bold ${row.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {formatCurrency(row.totalProfit)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="px-5 py-3 text-xs font-bold text-gray-600 uppercase bg-gray-50/60">รายการขาย</div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50/60">
                                        <tr>
                                            <th className="text-left py-2.5 px-4 text-xs font-bold text-gray-600 uppercase">วันที่ขาย</th>
                                            <th className="text-left py-2.5 px-4 text-xs font-bold text-gray-600 uppercase">เลขกรมธรรม์</th>
                                            <th className="text-left py-2.5 px-4 text-xs font-bold text-gray-600 uppercase">ลูกค้า</th>
                                            <th className="text-left py-2.5 px-4 text-xs font-bold text-gray-600 uppercase">แพ็ก</th>
                                            <th className="text-left py-2.5 px-4 text-xs font-bold text-gray-600 uppercase">เอเจนต์</th>
                                            <th className="text-right py-2.5 px-4 text-xs font-bold text-gray-600 uppercase">ราคาขาย</th>
                                            <th className="text-right py-2.5 px-4 text-xs font-bold text-gray-600 uppercase">ต้นทุนแพ็ก</th>
                                            <th className="text-right py-2.5 px-4 text-xs font-bold text-gray-600 uppercase">ค่าคอม</th>
                                            <th className="text-right py-2.5 px-4 text-xs font-bold text-gray-600 uppercase">อื่น ๆ</th>
                                            <th className="text-right py-2.5 px-4 text-xs font-bold text-gray-600 uppercase">กำไร</th>
                                            <th className="text-center py-2.5 px-4 text-xs font-bold text-gray-600 uppercase">สถานะ</th>
                                            <th className="text-center py-2.5 px-4 text-xs font-bold text-gray-600 uppercase">แก้ไข</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {drillSales.length === 0 ? (
                                            <tr><td colSpan={12} className="text-center py-6 text-gray-400 text-sm">ไม่พบรายการ</td></tr>
                                        ) : drillSales.map((sale) => (
                                            <tr key={sale._id} className={sale.isVoid ? "bg-red-50/40" : ""}>
                                                <td className="py-2.5 px-4 text-sm text-gray-600">{formatDate(sale.approvedAt)}</td>
                                                <td className="py-2.5 px-4 text-sm text-gray-700">{sale.policyNumber || sale.referenceNumber || "-"}</td>
                                                <td className="py-2.5 px-4 text-sm text-gray-800">{sale.customerName}</td>
                                                <td className="py-2.5 px-4 text-sm text-gray-600">{sale.packageName}</td>
                                                <td className="py-2.5 px-4 text-sm text-gray-600">{sale.agentName}</td>
                                                <td className="py-2.5 px-4 text-right text-sm text-gray-800">{formatCurrency(sale.salePrice)}</td>
                                                <td className="py-2.5 px-4 text-right text-sm text-gray-600">{formatCurrency(sale.packageCost)}</td>
                                                <td className="py-2.5 px-4 text-right text-sm text-orange-600">{formatCurrency(sale.agentCommission)}</td>
                                                <td className="py-2.5 px-4 text-right text-sm text-gray-600">{formatCurrency(sale.otherExpenses)}</td>
                                                <td className={`py-2.5 px-4 text-right text-sm font-bold ${sale.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {formatCurrency(sale.netProfit)}
                                                </td>
                                                <td className="py-2.5 px-4 text-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sale.isVoid ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                                                        {STATUS_LABELS[sale.status] || sale.status}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-4 text-center">
                                                    <button
                                                        onClick={() => startEdit(sale)}
                                                        className="text-blue-600 hover:text-blue-700 transition-colors"
                                                        title="แก้ไขตัวเลข"
                                                    >
                                                        <Pencil size={15} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Edit modal */}
            {editing && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">แก้ไขตัวเลขต้นทุน/กำไร</h3>
                                <p className="text-xs text-gray-500 mt-0.5">{editing.customerName} · {editing.policyNumber || "-"}</p>
                            </div>
                            <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            {([
                                ["salePrice", "ราคาขายให้ลูกค้า"],
                                ["packageCost", "ต้นทุนของแพ็กประกัน"],
                                ["agentCommission", "ค่าคอมมิชชั่นเอเจนต์"],
                                ["otherExpenses", "ค่าใช้จ่ายอื่น"],
                            ] as [keyof EditForm, string][]).map(([field, label]) => (
                                <div key={field}>
                                    <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={editForm[field]}
                                        onChange={(e) => updateEditField(field, Number(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
                            <div className="flex justify-between text-gray-600">
                                <span>ต้นทุนรวม</span>
                                <span>{formatCurrency(editForm.packageCost + editForm.agentCommission + editForm.otherExpenses)}</span>
                            </div>
                            <div className="flex justify-between font-bold mt-1">
                                <span>กำไรสุทธิ</span>
                                <span className={editForm.salePrice - (editForm.packageCost + editForm.agentCommission + editForm.otherExpenses) >= 0 ? "text-green-600" : "text-red-600"}>
                                    {formatCurrency(editForm.salePrice - (editForm.packageCost + editForm.agentCommission + editForm.otherExpenses))}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-5">
                            <button
                                onClick={() => setEditing(null)}
                                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={saveEdit}
                                disabled={saving}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                            >
                                {saving ? "กำลังบันทึก..." : "บันทึก"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
