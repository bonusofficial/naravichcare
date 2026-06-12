"use client";

import React, { useEffect, useState } from "react";
import { 
    User, 
    UserPlus, 
    Shield, 
    Edit2, 
    Trash2, 
    Loader2, 
    ChevronRight, 
    CheckCircle, 
    X, 
    ArrowLeft,
    ShieldAlert,
    Save
} from "lucide-react";
import Link from "next/link";

export default function UserManagement() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    
    // Form States
    const [formData, setFormData] = useState({
        username: "",
        password: "",
        name: "",
        role: "staff",
        email: ""
    });
    const [submitting, setSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/users");
            const data = await res.json();
            if (Array.isArray(data)) {
                setUsers(data);
            } else {
                console.error("API Error or Invalid format:", data);
                setUsers([]);
            }
        } catch (error) {
            console.error("Fetch Users Error:", error);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (user: any = null) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                username: user.username,
                password: "", // Keep password blank for editing
                name: user.name,
                role: user.role,
                email: user.email
            });
        } else {
            setEditingUser(null);
            setFormData({
                username: "",
                password: "",
                name: "",
                role: "staff",
                email: ""
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const method = editingUser ? "PATCH" : "POST";
            const body = editingUser ? { ...formData, id: editingUser._id } : formData;

            const res = await fetch("/api/admin/users", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000);
                setIsModalOpen(false);
                fetchUsers();
            }
        } catch (error) {
            console.error("Submit User Error:", error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("คุณต้องการลบพนักงานคนนี้ใช่หรือไม่?")) return;
        try {
            const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
            if (res.ok) fetchUsers();
        } catch (error) {
            console.error("Delete User Error:", error);
        }
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case "super_admin": return "Super Admin";
            case "admin": return "ผู้ช่วยแอดมิน";
            case "technician": return "ช่างเทคนิค";
            case "staff": return "พนักงานรับเครื่อง";
            default: return role;
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-32 text-gray-400">
            <Loader2 className="animate-spin mb-4" size={40} />
            <p className="text-sm font-black uppercase tracking-widest italic tracking-tighter">Loading staff directory...</p>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-5 duration-700">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-5">
                <div className="flex items-center gap-4">
                    <Link href="/admin/repair" className="w-8 h-8 bg-white rounded-lg shadow-sm border border-gray-100 flex items-center justify-center text-gray-400 hover:text-blue-600 transition-all">
                        <ArrowLeft size={16} />
                    </Link>
                    <div>
                        <h1 className="text-xl font-black text-slate-800 tracking-tighter uppercase italic">Staff Management</h1>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Manage access & roles / {users.length} Active accounts</p>
                    </div>
                </div>
                <button onClick={() => handleOpenModal()} className="bg-slate-900 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2 shadow-lg">
                    <UserPlus size={14} /> เพิ่มพนักงานใหม่
                </button>
            </div>

            {/* User List Cards */}
            <div className="grid gap-3">
                {users.length === 0 ? (
                    <div className="bg-white border border-dashed border-gray-200 py-16 rounded-3xl text-center text-gray-300 flex flex-col items-center gap-3">
                        <ShieldAlert size={40} className="opacity-20" />
                        <p className="text-xs font-black uppercase tracking-widest italic opacity-50">ยังไม่มีข้อมูลพนักงานในระบบซ่อม</p>
                        <p className="text-[9px] font-bold uppercase tracking-tighter text-gray-400">กรุณากดปุ่มเพิ่มพนักงานใหม่ที่มุมบนขวา</p>
                    </div>
                ) : (
                    users.map((user) => (
                        <div key={user._id} className="bg-white border border-gray-100 p-4 rounded-2xl flex items-center justify-between hover:border-slate-300 transition-all group group shadow-sm">
                            <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                                     <User size={20} />
                                 </div>
                                 <div>
                                     <div className="flex items-center gap-2">
                                         <p className="text-sm font-black text-slate-800 uppercase italic leading-none">{user.name}</p>
                                         <span className="bg-slate-100 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest text-slate-500">{getRoleLabel(user.role)}</span>
                                     </div>
                                     <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 italic opacity-60">@{user.username} / {user.email || "-"}</p>
                                 </div>
                            </div>
                            <div className="flex items-center gap-2">
                                 <button onClick={() => handleOpenModal(user)} className="p-2 bg-gray-50 text-slate-400 rounded-lg hover:bg-slate-900 hover:text-white transition-all">
                                     <Edit2 size={14} />
                                 </button>
                                 <button onClick={() => handleDelete(user._id)} className="p-2 bg-gray-50 text-red-400 rounded-lg hover:bg-red-600 hover:text-white transition-all">
                                     <Trash2 size={14} />
                                 </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal Form */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-[2px]">
                    <div className="bg-white rounded-3xl w-full max-w-sm relative shadow-2xl p-8 space-y-6 animate-in zoom-in-95">
                        <div className="text-center">
                            <h2 className="text-base font-black text-slate-800 uppercase tracking-tighter italic">
                                {editingUser ? "Edit Account" : "Access Creation"}
                            </h2>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Configure staff credentials</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic ml-1 leading-none">FullName / ชื่อพนักงาน</label>
                                <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-black italic outline-none focus:border-blue-500" placeholder="John Doe" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic ml-1 leading-none">Username</label>
                                <input type="text" required value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-black italic outline-none focus:border-blue-500" placeholder="johndoe123" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic ml-1 leading-none">{editingUser ? "New Password (Optional)" : "Password"}</label>
                                <input type="password" required={!editingUser} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-black italic outline-none focus:border-blue-500" placeholder="••••••••" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic ml-1 leading-none">Email Address</label>
                                <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-black italic outline-none focus:border-blue-500" placeholder="staff@naravich.com" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic ml-1 leading-none">Role Access</label>
                                <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest outline-none focus:border-blue-500 italic">
                                     <option value="super_admin">Super Admin</option>
                                     <option value="admin">Admin / ผู้จัดการ</option>
                                     <option value="technician">Technician / ช่างซ่อม</option>
                                     <option value="staff">Staff / พนักงานรับเครื่อง</option>
                                </select>
                            </div>
                            
                            <div className="flex gap-2 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">Cancel</button>
                                <button type="submit" disabled={submitting} className="flex-[2] py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-600 transition-all">
                                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="hidden" />} {editingUser ? "Save Changes" : "Create Account"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Success Toast */}
            {showSuccess && (
                <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-10">
                    <CheckCircle size={18} />
                    <p className="text-[10px] font-black uppercase tracking-widest">Update Success!</p>
                </div>
            )}
        </div>
    );
}
