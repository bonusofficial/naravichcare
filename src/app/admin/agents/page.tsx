"use client";
import React, { useState, useEffect } from "react";
import { Users, Search, Filter, Plus, Award, AlertCircle, CreditCard, Loader2, Edit, Trash2, CheckCircle2, X, Store, User, MapPin, Building, Target } from "lucide-react";

export default function AgentsManagement() {
    const [agents, setAgents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: "", // ชื่อร้าน/บริษัท
        contactPerson: "",
        email: "",
        phone: "",
        address: "",
        taxId: "",
        bankName: "",
        bankAccount: "",
        bankAccountName: "",
        commissionRate: 5,
        isActive: true,
    });

    useEffect(() => {
        fetchAgents();
    }, []);

    const fetchAgents = async () => {
        try {
            const res = await fetch("/api/admin/agents");
            const data = await res.json();
            if (data.success) {
                setAgents(data.agents);
            }
        } catch (err) {
            console.error("Fetch agents failed", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const url = editingId ? `/api/admin/agents/${editingId}` : "/api/admin/agents";
            const method = editingId ? "PUT" : "POST";

            const payload = { ...formData };

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (data.success) {
                closeModal();
                fetchAgents();
            } else {
                alert(data.error);
            }
        } catch (err) {
            alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("คุณแน่ใจหรือไม่ที่จะลบตัวแทนนี้?")) return;
        try {
            const res = await fetch(`/api/admin/agents/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (data.success) {
                fetchAgents();
            } else {
                alert(data.error);
            }
        } catch (err) {
            alert("ลบข้อมูลไม่สำเร็จ");
        }
    };

    const openModal = (agent?: any) => {
        if (agent) {
            setEditingId(agent._id);
            setFormData({
                name: agent.name || "",
                contactPerson: agent.contactPerson || "",
                email: agent.email || "",
                phone: agent.phone || "",
                address: agent.address || "",
                taxId: agent.taxId || "",
                bankName: agent.bankName || "",
                bankAccount: agent.bankAccount || "",
                bankAccountName: agent.bankAccountName || "",
                commissionRate: agent.commissionRate || 5,
                isActive: agent.isActive !== undefined ? agent.isActive : true,
            });
        } else {
            setEditingId(null);
            setFormData({
                name: "", contactPerson: "", email: "", phone: "", address: "",
                taxId: "", bankName: "", bankAccount: "", bankAccountName: "",
                commissionRate: 5, isActive: true
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
    };

    const filteredAgents = agents.filter(a =>
        (a.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (a.agentCode?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (a.phone || "").includes(searchQuery)
    );

    const activeAgents = agents.filter(a => a.isActive).length;
    const avgCommission = agents.length ? (agents.reduce((acc, curr) => acc + curr.commissionRate, 0) / agents.length).toFixed(1) : "0.0";

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-gray-800">จัดการตัวแทน (Agent Management)</h2>
                    <p className="text-gray-500 text-sm mt-1">ตั้งค่าพาร์ทเนอร์ ฐานข้อมูลตัวแทน และการจ่ายค่าคอมมิชชั่น</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 bg-blue-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
                >
                    <Plus size={18} /> ลงทะเบียนตัวแทนใหม่
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                    { icon: <Users size={18} />, label: "ตัวแทนที่ใช้งาน", value: `${activeAgents} / ${agents.length}`, sub: "Active Agents", bg: "bg-blue-50", color: "text-blue-500", subColor: "text-emerald-600" },
                    { icon: <Award size={18} />, label: "ค่าคอมฯ เฉลี่ย", value: `${avgCommission}%`, sub: "Commission Rate", bg: "bg-amber-50", color: "text-amber-500", subColor: "text-gray-400" },
                ].map(s => (
                    <div key={s.label} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                        <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-5 group-hover:scale-150 transition-transform duration-700 ${s.color.replace('text', 'bg')}`}></div>
                        <div className="relative z-10 flex items-center justify-between mb-4">
                            <div className={`w-10 h-10 ${s.bg} ${s.color} rounded-xl flex items-center justify-center`}>{s.icon}</div>
                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{s.label}</p>
                        </div>
                        <div className="relative z-10">
                            <p className="text-3xl font-black text-gray-800 tracking-tight">{s.value}</p>
                            <p className={`text-[10px] font-bold mt-1 uppercase ${s.subColor}`}>{s.sub}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filter */}
            <div className="bg-white p-2 rounded-xl border border-gray-200 flex gap-2 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="ค้นหารหัส หรือ ชื่อร้านตัวแทนจำหน่าย / เบอร์โทรศัพท์..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent border-none py-2.5 pl-10 pr-4 text-sm font-bold outline-none placeholder:font-normal placeholder:text-gray-400"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                {["ตัวแทน/Agent Code", "ข้อมูลติดต่อ", "ค่าคอมฯ", "ธนาคาร", "สถานะ", "จัดการ"].map(h => (
                                    <th key={h} className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-24 text-center">
                                        <Loader2 className="animate-spin text-blue-500 mx-auto" size={32} />
                                        <p className="text-[10px] font-black text-slate-400 mt-4 uppercase tracking-[0.2em]">กำลังซิงค์ข้อมูลตัวแทน...</p>
                                    </td>
                                </tr>
                            ) : filteredAgents.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-24 text-center opacity-40">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Store size={24} className="text-gray-400" />
                                        </div>
                                        <p className="text-sm font-black uppercase tracking-widest mt-2">ไม่พบข้อมูลตัวแทน</p>
                                    </td>
                                </tr>
                            ) : filteredAgents.map((a) => (
                                <tr key={a._id} onClick={() => openModal(a)} className="hover:bg-blue-50/30 transition-colors group cursor-pointer">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500 flex items-center justify-center text-xs font-black uppercase shrink-0 shadow-inner">
                                                {a.name.substring(0, 2)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-gray-900 line-clamp-1">{a.name}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-1.5 py-0.5 rounded">{a.agentCode}</span>
                                                    {a.taxId && <span className="text-[9px] text-gray-400">Tax: {a.taxId}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5"><User size={12} className="text-gray-400" /> {a.contactPerson || '-'}</p>
                                            <p className="text-[11px] font-medium text-gray-500 flex items-center gap-1.5 whitespace-nowrap"><Search size={10} className="text-transparent" /> {a.phone}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg text-xs font-black border border-amber-100">
                                            {a.commissionRate}%
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs font-medium text-gray-600">
                                            {a.bankName ? (
                                                <>
                                                    <span className="font-bold">{a.bankName}</span><br />
                                                    <span className="text-[10px] text-gray-400">{a.bankAccount}</span>
                                                </>
                                            ) : <span className="text-gray-300 italic">-</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest ${a.isActive ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-500 border border-red-100"}`}>
                                            {a.isActive ? "Active" : "Suspended"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={(e) => handleDelete(a._id, e)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="ลบตัวแทน">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-200 my-8">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur rounded-t-[2rem] z-10">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 uppercase">{editingId ? 'แก้ไขข้อมูลพาร์ทเนอร์ตัวแทน' : 'ฟอร์มลงทะเบียนตัวแทนใหม่'}</h3>
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">Authorized Agency Registration</p>
                            </div>
                            <button onClick={closeModal} className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-800 rounded-xl transition-all">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-8">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Left Col - Info */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                                        <Store size={18} className="text-blue-500" />
                                        <h4 className="text-sm font-black text-gray-800 uppercase tracking-wide">ข้อมูลพื้นฐานตัวแทน</h4>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">ชื่อร้าน / ชื่อบริษัท *</label>
                                            <input
                                                type="text" required
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:font-normal placeholder:text-gray-300"
                                                value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="บริษัท จำกัด / ร้านโมบาย..."
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">เลขประจำตัวผู้เสียภาษี / บัตรประชาชน</label>
                                            <input
                                                type="text"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:font-normal placeholder:text-gray-300"
                                                value={formData.taxId} onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                                                placeholder="เลข 13 หลัก"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">ชื่อผู้ติดต่อหลัก *</label>
                                                <input
                                                    type="text" required
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:font-normal placeholder:text-gray-300"
                                                    value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                                                    placeholder="คุณสมชาย"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">เบอร์มือถือติดต่อ *</label>
                                                <input
                                                    type="text" required
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:font-normal placeholder:text-gray-300"
                                                    value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                    placeholder="08X-XXX-XXXX"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">อีเมลติดต่อ</label>
                                            <input
                                                type="email"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:font-normal placeholder:text-gray-300"
                                                value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="email@example.com"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">ที่อยู่ร้านตั้งต้น</label>
                                            <textarea
                                                rows={2}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 focus:bg-white outline-none transition-all resize-none placeholder:font-normal placeholder:text-gray-300"
                                                value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                                placeholder="บ้านเลขที่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Right Col - Banking & System */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                                        <Building size={18} className="text-emerald-500" />
                                        <h4 className="text-sm font-black text-gray-800 uppercase tracking-wide">ข้อมูลการรับเงิน (Bank Details)</h4>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">ชื่อธนาคาร</label>
                                            <select
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 focus:bg-white outline-none transition-all cursor-pointer"
                                                value={formData.bankName} onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                            >
                                                <option value="" disabled>-- เลือกธนาคาร --</option>
                                                <option value="กสิกรไทย">ธนาคารกสิกรไทย (KBANK)</option>
                                                <option value="ไทยพาณิชย์">ธนาคารไทยพาณิชย์ (SCB)</option>
                                                <option value="กรุงเทพ">ธนาคารกรุงเทพ (BBL)</option>
                                                <option value="กรุงไทย">ธนาคารกรุงไทย (KTB)</option>
                                                <option value="กรุงศรีอยุธยา">ธนาคารกรุงศรีอยุธยา (BAY)</option>
                                                <option value="ทหารไทยธนชาต">ธนาคารทหารไทยธนชาต (TTB)</option>
                                                <option value="ออมสิน">ธนาคารออมสิน (GSB)</option>
                                                <option value="ธกส">ธ.ก.ส. (BAAC)</option>
                                                <option value="อาคารสงเคราะห์">ธนาคารอาคารสงเคราะห์ (GHB)</option>
                                                <option value="เกียรตินาคินภัทร">ธนาคารเกียรตินาคินภัทร (KKP)</option>
                                                <option value="ซีไอเอ็มบี ไทย">ธนาคารซีไอเอ็มบี ไทย (CIMBT)</option>
                                                <option value="ทิสโก้">ธนาคารทิสโก้ (TISCO)</option>
                                                <option value="ยูโอบี">ธนาคารยูโอบี (UOB)</option>
                                                <option value="แลนด์ แอนด์ เฮ้าส์">ธนาคารแลนด์ แอนด์ เฮ้าส์ (LHBANK)</option>
                                                <option value="ไอซีบีซี">ธนาคารไอซีบีซี ไทย (ICBCT)</option>
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">เลขที่บัญชี</label>
                                                <input
                                                    type="text"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:font-normal placeholder:text-gray-300"
                                                    value={formData.bankAccount} onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                                                    placeholder="XXX-X-XXXXX-X"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">ชื่อบัญชี</label>
                                                <input
                                                    type="text"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:font-normal placeholder:text-gray-300"
                                                    value={formData.bankAccountName} onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
                                                    placeholder="นาย สมชาย..."
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 border-b border-gray-100 pb-2 pt-4">
                                        <Target size={18} className="text-amber-500" />
                                        <h4 className="text-sm font-black text-gray-800 uppercase tracking-wide">สิทธิ์ตัวแทน (System config)</h4>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 flex justify-between">
                                                <span>Rate Commission (%)</span>
                                                <span className="text-amber-500">กำไรตัวแทน</span>
                                            </label>
                                            <input
                                                type="number" required min="0" max="100" step="0.1"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-2xl font-black text-amber-600 focus:border-amber-500 focus:bg-white outline-none transition-all text-center"
                                                value={formData.commissionRate} onChange={(e) => setFormData({ ...formData, commissionRate: Number(e.target.value) })}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 mt-4">
                                            <div>
                                                <p className="text-sm font-black text-gray-800">สถานะตัวแทน (Active)</p>
                                                <p className="text-[10px] font-medium text-gray-500 mt-1">หากปิดตัวแทนจะไม่สามารถส่งงานผ่าน Portal ได้</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                                <input
                                                    type="checkbox" className="sr-only peer"
                                                    checked={formData.isActive}
                                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                                />
                                                <div className="w-14 h-7 bg-red-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-8 mt-6 border-t border-gray-100">
                                <button type="button" onClick={closeModal} className="w-1/3 py-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold rounded-xl text-sm transition-colors">
                                    ยกเลิก
                                </button>
                                <button type="submit" disabled={isSaving} className="w-2/3 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-sm tracking-widest transition-all flex justify-center items-center gap-2 shadow-lg shadow-blue-600/30 disabled:opacity-50 hover:scale-[1.01]">
                                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                                    {isSaving ? "กำลังบันทึกข้อมูล..." : "ยืนยันการตั้งค่าตัวแทน"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
