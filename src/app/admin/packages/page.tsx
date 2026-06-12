"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Edit2, Save, X, Smartphone, ShieldCheck } from "lucide-react";

interface IPackage {
    _id?: string;
    name: string;
    title: string;
    range: string;
    monthlyPrice: number;
    yearlyPrice: number;
    isActive: boolean;
    order: number;
    highlights: string[];
}

export default function PackagesAdmin() {
    const [packages, setPackages] = useState<IPackage[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<IPackage | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newForm, setNewForm] = useState<IPackage>({
        name: "",
        title: "ราคาเครื่อง",
        range: "",
        monthlyPrice: 0,
        yearlyPrice: 0,
        isActive: true,
        order: 0,
        highlights: []
    });

    useEffect(() => {
        fetchPackages();
    }, []);

    const fetchPackages = async () => {
        try {
            const res = await fetch("/api/packages");
            const data = await res.json();
            setPackages(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/packages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newForm)
            });
            if (res.ok) {
                fetchPackages();
                setShowAddForm(false);
                setNewForm({ name: "", title: "ราคาเครื่อง", range: "", monthlyPrice: 0, yearlyPrice: 0, isActive: true, order: 0, highlights: [] });
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleUpdate = async (id: string) => {
        if (!editForm) return;
        try {
            const res = await fetch(`/api/packages/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editForm)
            });
            if (res.ok) {
                setEditingId(null);
                fetchPackages();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("ยืนยันการลบแพ็กเกจนี้?")) return;
        try {
            const res = await fetch(`/api/packages/${id}`, { method: "DELETE" });
            if (res.ok) fetchPackages();
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    return (
        <div className="p-4 md:p-8 max-w-[1440px] mx-auto bg-gray-50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">จัดการแพ็กเกจบริการ</h1>
                    <p className="text-gray-500 font-medium">จัดการราคาเครื่องและเบี้ยประกันรายเดือน/รายปี</p>
                </div>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-blue-200 hover:scale-105 transition-all text-sm"
                >
                    <Plus size={18} /> เพิ่มแพ็กเกจใหม่
                </button>
            </div>

            {/* Add/Edit Overlay */}
            {(showAddForm || editingId) && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-gray-900">
                                {showAddForm ? "เพิ่มแพ็กเกจใหม่" : "แก้ไขแพ็กเกจ"}
                            </h2>
                            <button
                                onClick={() => { setShowAddForm(false); setEditingId(null); }}
                                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={showAddForm ? handleAdd : (e) => { e.preventDefault(); handleUpdate(editingId!); }} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 ml-1 uppercase">ชื่อแพ็กเกจ (สำหรับแอดมิน)</label>
                                <input
                                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 focus:border-blue-500 outline-none transition-all font-medium text-sm"
                                    placeholder="เช่น Plan A, Gold, Platinum"
                                    value={showAddForm ? newForm.name : editForm?.name}
                                    onChange={e => showAddForm ? setNewForm({ ...newForm, name: e.target.value }) : setEditForm({ ...editForm!, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 ml-1 uppercase">หัวข้อบนการ์ด (เช่น ราคาเครื่อง)</label>
                                <input
                                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 focus:border-blue-500 outline-none transition-all font-medium text-sm"
                                    placeholder="เช่น ราคาเครื่อง"
                                    value={showAddForm ? newForm.title : editForm?.title}
                                    onChange={e => showAddForm ? setNewForm({ ...newForm, title: e.target.value }) : setEditForm({ ...editForm!, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 ml-1 uppercase">ช่วงราคาเครื่อง (แสดงหน้าเว็บ)</label>
                                <input
                                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 focus:border-blue-500 outline-none transition-all font-medium text-sm"
                                    placeholder="เช่น 8,001 - 20,000 บาท"
                                    value={showAddForm ? newForm.range : editForm?.range}
                                    onChange={e => showAddForm ? setNewForm({ ...newForm, range: e.target.value }) : setEditForm({ ...editForm!, range: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-left">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 ml-1 uppercase">ราคารายเดือน</label>
                                    <input
                                        type="number"
                                        className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 focus:border-blue-500 outline-none transition-all font-medium text-sm"
                                        value={showAddForm ? newForm.monthlyPrice : editForm?.monthlyPrice}
                                        onChange={e => showAddForm ? setNewForm({ ...newForm, monthlyPrice: Number(e.target.value) }) : setEditForm({ ...editForm!, monthlyPrice: Number(e.target.value) })}
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 ml-1 uppercase">ราคารายปี</label>
                                    <input
                                        type="number"
                                        className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 focus:border-blue-500 outline-none transition-all font-medium text-sm"
                                        value={showAddForm ? newForm.yearlyPrice : editForm?.yearlyPrice}
                                        onChange={e => showAddForm ? setNewForm({ ...newForm, yearlyPrice: Number(e.target.value) }) : setEditForm({ ...editForm!, yearlyPrice: Number(e.target.value) })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 ml-1 uppercase">ลำดับการแสดงผล (0 = แรก)</label>
                                <input
                                    type="number"
                                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 focus:border-blue-500 outline-none transition-all font-medium text-sm"
                                    value={showAddForm ? newForm.order : editForm?.order}
                                    onChange={e => showAddForm ? setNewForm({ ...newForm, order: Number(e.target.value) }) : setEditForm({ ...editForm!, order: Number(e.target.value) })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 ml-1 uppercase">ไฮไลท์สิทธิประโยชน์</label>
                                <div className="space-y-2">
                                    {(showAddForm ? newForm.highlights : editForm?.highlights || []).map((h, i) => (
                                        <div key={i} className="flex gap-2">
                                            <input
                                                className="flex-1 border border-gray-100 rounded-lg px-3 py-2 text-xs font-medium"
                                                value={h}
                                                onChange={e => {
                                                    const updated = [...(showAddForm ? newForm.highlights : editForm!.highlights)];
                                                    updated[i] = e.target.value;
                                                    showAddForm ? setNewForm({ ...newForm, highlights: updated }) : setEditForm({ ...editForm!, highlights: updated });
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const updated = (showAddForm ? newForm.highlights : editForm!.highlights).filter((_, idx) => idx !== i);
                                                    showAddForm ? setNewForm({ ...newForm, highlights: updated }) : setEditForm({ ...editForm!, highlights: updated });
                                                }}
                                                className="text-red-400 hover:text-red-600"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const updated = [...(showAddForm ? newForm.highlights : editForm?.highlights || []), ""];
                                            showAddForm ? setNewForm({ ...newForm, highlights: updated }) : setEditForm({ ...editForm!, highlights: updated });
                                        }}
                                        className="text-[10px] font-bold text-blue-600 hover:underline"
                                    >
                                        + เพิ่มไฮไลท์
                                    </button>
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-black text-base hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 mt-2"
                            >
                                {showAddForm ? "สร้างแพ็กเกจ" : "บันทึกการแก้ไข"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {packages.map((pkg) => (
                    <div key={pkg._id} className="relative group animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Admin Controls */}
                        <div className="absolute top-4 right-4 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => { setEditingId(pkg._id!); setEditForm(pkg); }}
                                className="w-8 h-8 bg-white shadow-md rounded-lg flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-all"
                            >
                                <Edit2 size={14} />
                            </button>
                            <button
                                onClick={() => handleDelete(pkg._id!)}
                                className="w-8 h-8 bg-white shadow-md rounded-lg flex items-center justify-center text-red-600 hover:bg-red-50 transition-all"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>

                        {/* The Card UI (Matching Project Theme) */}
                        <div className="bg-white rounded-3xl p-8 shadow-xl shadow-gray-200/40 border border-gray-100 flex flex-col h-full transition-all duration-300">
                            {/* Header */}
                            <div className="mb-6">
                                <h3 className="text-lg font-black text-gray-800 mb-0.5 leading-tight">{pkg.title || "ราคาเครื่อง"}</h3>
                                <p className="text-base font-bold text-gray-500">{pkg.range}</p>
                            </div>

                            {/* Pricing Rows */}
                            <div className="space-y-6 flex-1">
                                {/* Monthly */}
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex-1">
                                        <div className="flex items-baseline gap-1.5 flex-wrap">
                                            <span className="text-[13px] font-bold text-gray-600">รายเดือน</span>
                                            <span className="text-3xl font-black text-gray-900">{pkg.monthlyPrice.toLocaleString()}</span>
                                            <span className="text-[13px] font-bold text-gray-500">บาท</span>
                                        </div>
                                        <p className="text-[10px] text-gray-400 font-bold ml-12">ราคารวม VAT</p>
                                    </div>
                                    <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-xl font-black text-[12px] shadow-md shadow-blue-100 whitespace-nowrap">
                                        สมัครบริการ
                                    </div>
                                </div>

                                {/* Yearly */}
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex-1">
                                        <div className="flex items-baseline gap-1.5 flex-wrap">
                                            <span className="text-[13px] font-bold text-gray-600">รายปี</span>
                                            <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500">{pkg.yearlyPrice.toLocaleString()}</span>
                                            <span className="text-[13px] font-bold text-gray-500">บาท</span>
                                        </div>
                                        <p className="text-[10px] text-gray-400 font-bold ml-12">ราคารวม VAT</p>
                                    </div>
                                    <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-xl font-black text-[12px] shadow-md shadow-blue-100 whitespace-nowrap">
                                        สมัครบริการ
                                    </div>
                                </div>

                                {/* Highlights Preview */}
                                <div className="pt-4 border-t border-gray-50">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">สิทธิประโยชน์</p>
                                    <ul className="space-y-1.5">
                                        {(pkg.highlights || []).map((h, idx) => (
                                            <li key={idx} className="flex gap-2 text-[11px] font-semibold text-gray-500 leading-tight">
                                                <span className="text-blue-500 text-[14px]">•</span>
                                                {h}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-gray-50 flex justify-between items-center text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                                <span>Order: {pkg.order}</span>
                                <span>{pkg.name}</span>
                            </div>
                        </div>
                    </div>
                ))}

                {packages.length === 0 && (
                    <div className="col-span-full bg-white rounded-3xl p-16 text-center border-2 border-dashed border-gray-100">
                        <Smartphone size={40} className="mx-auto text-gray-200 mb-4" />
                        <h3 className="text-xl font-black text-gray-400">ยังไม่มีแพ็กเกจในระบบ</h3>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="text-blue-600 font-bold mt-4 hover:underline text-sm"
                        >
                            เริ่มสร้างแพ็กเกจแรกของคุณที่นี่
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
