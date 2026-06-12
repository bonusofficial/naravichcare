"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Edit2, X, UserCog, Mail, Shield, CheckCircle2, AlertCircle } from "lucide-react";

interface IAdminUser {
    _id?: string;
    username: string;
    password?: string;
    name: string;
    role: "super_admin" | "admin" | "viewer";
    email: string;
    isActive: boolean;
    createdAt?: string;
}

export default function AdminManagement() {
    const [users, setUsers] = useState<IAdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<IAdminUser | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newForm, setNewForm] = useState<IAdminUser>({
        username: "",
        name: "",
        role: "admin",
        email: "",
        isActive: true
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch("/api/admin-users");
            const data = await res.json();
            if (Array.isArray(data)) {
                setUsers(data);
            } else {
                console.error("API Error or Invalid format:", data);
                setUsers([]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/admin-users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newForm)
            });
            if (res.ok) {
                fetchUsers();
                setShowAddForm(false);
                setNewForm({ username: "", name: "", role: "admin", email: "", isActive: true });
            } else {
                const err = await res.json();
                alert(err.error || "Failed to add user");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleUpdate = async (id: string) => {
        if (!editForm) return;
        try {
            const res = await fetch(`/api/admin-users/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editForm)
            });
            if (res.ok) {
                setEditingId(null);
                fetchUsers();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("ยืนยันการลบผู้ใช้แอดมินนี้?")) return;
        try {
            const res = await fetch(`/api/admin-users/${id}`, { method: "DELETE" });
            if (res.ok) fetchUsers();
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
                    <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">จัดการผู้ดูแลระบบ (Admin)</h1>
                    <p className="text-gray-500 font-medium">เพิ่ม แก้ไข หรือระงับสิทธิ์การเข้าถึงหลังบ้าน</p>
                </div>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-blue-200 hover:scale-105 transition-all text-sm"
                >
                    <Plus size={18} /> เพิ่มแอดมินใหม่
                </button>
            </div>

            {/* Add/Edit Modal */}
            {(showAddForm || editingId) && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-gray-900">
                                {showAddForm ? "เพิ่มแอดมินใหม่" : "แก้ไขข้อมูลแอดมิน"}
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
                                <label className="text-xs font-bold text-gray-500 ml-1 uppercase">Username</label>
                                <input
                                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 focus:border-blue-500 outline-none transition-all font-medium text-sm"
                                    placeholder="เช่น admin_navarich"
                                    value={showAddForm ? newForm.username : editForm?.username}
                                    onChange={e => showAddForm ? setNewForm({ ...newForm, username: e.target.value }) : setEditForm({ ...editForm!, username: e.target.value })}
                                    required
                                    disabled={!!editingId}
                                />
                            </div>
                            {showAddForm && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 ml-1 uppercase">Password</label>
                                    <input
                                        type="password"
                                        className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 focus:border-blue-500 outline-none transition-all font-medium text-sm"
                                        placeholder="ระบุรหัสผ่าน"
                                        value={newForm.password || ""}
                                        onChange={e => setNewForm({ ...newForm, password: e.target.value })}
                                        required
                                    />
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 ml-1 uppercase">ชื่อ-นามสกุล</label>
                                <input
                                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 focus:border-blue-500 outline-none transition-all font-medium text-sm"
                                    placeholder="เช่น สมชาย ใจดี"
                                    value={showAddForm ? newForm.name : editForm?.name}
                                    onChange={e => showAddForm ? setNewForm({ ...newForm, name: e.target.value }) : setEditForm({ ...editForm!, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 ml-1 uppercase">อีเมล</label>
                                <input
                                    type="email"
                                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 focus:border-blue-500 outline-none transition-all font-medium text-sm"
                                    placeholder="email@example.com"
                                    value={showAddForm ? newForm.email : editForm?.email}
                                    onChange={e => showAddForm ? setNewForm({ ...newForm, email: e.target.value }) : setEditForm({ ...editForm!, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 ml-1 uppercase">บทบาท (Role)</label>
                                <select
                                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 focus:border-blue-500 outline-none transition-all font-medium text-sm bg-white"
                                    value={showAddForm ? newForm.role : editForm?.role}
                                    onChange={e => showAddForm ? setNewForm({ ...newForm, role: e.target.value as any }) : setEditForm({ ...editForm!, role: e.target.value as any })}
                                >
                                    <option value="super_admin">Super Admin</option>
                                    <option value="admin">Admin</option>
                                    <option value="viewer">Viewer</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    checked={showAddForm ? newForm.isActive : editForm?.isActive}
                                    onChange={e => showAddForm ? setNewForm({ ...newForm, isActive: e.target.checked }) : setEditForm({ ...editForm!, isActive: e.target.checked })}
                                />
                                <label htmlFor="isActive" className="text-sm font-bold text-gray-700">เปิดใช้งานบัญชีนี้ (Active)</label>
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-black text-base hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 mt-4"
                            >
                                {showAddForm ? "สร้างบัญชีแอดมิน" : "บันทึกการแก้ไข"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Users List Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {users.map((user) => (
                    <div key={user._id} className="group relative bg-white rounded-3xl p-6 shadow-xl shadow-gray-200/40 border border-gray-100 transition-all duration-300 hover:shadow-2xl">
                        {/* Status Badge */}
                        <div className="absolute top-4 right-4 flex gap-2 items-center">
                            {user.isActive ? (
                                <span className="flex items-center gap-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ring-emerald-100">
                                    <CheckCircle2 size={10} /> Active
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 bg-gray-50 text-gray-400 text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ring-gray-100">
                                    <AlertCircle size={10} /> Inactive
                                </span>
                            )}
                        </div>

                        {/* Profile Info */}
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center text-blue-600 border border-blue-100">
                                <UserCog size={24} />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-gray-800 leading-tight">{user.name}</h3>
                                <p className="text-xs font-bold text-gray-400">@{user.username}</p>
                            </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-3 mb-6">
                            <div className="flex items-center gap-3 text-gray-500">
                                <Mail size={14} className="shrink-0" />
                                <span className="text-xs font-medium truncate">{user.email}</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-500">
                                <Shield size={14} className="shrink-0" />
                                <span className="text-xs font-bold uppercase tracking-wider text-indigo-500">{user.role.replace("_", " ")}</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-4 border-t border-gray-50 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => { setEditingId(user._id!); setEditForm(user); }}
                                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all text-xs font-bold"
                            >
                                <Edit2 size={12} /> แก้ไข
                            </button>
                            <button
                                onClick={() => handleDelete(user._id!)}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}

                {users.length === 0 && (
                    <div className="col-span-full bg-white rounded-3xl p-16 text-center border-2 border-dashed border-gray-100">
                        <UserCog size={40} className="mx-auto text-gray-200 mb-4" />
                        <h3 className="text-xl font-black text-gray-400">ไม่มีข้อมูลผู้ดูแลระบบ</h3>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="text-blue-600 font-bold mt-4 hover:underline text-sm"
                        >
                            เริ่มสร้างผู้ดูแลระบบคนแรก
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
