"use client";

import { useState, useEffect } from "react";
import { Shield, Plus, Edit2, Trash2, X, Save, AlertCircle } from "lucide-react";

interface Role {
  _id: string;
  name: string;
  displayName: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
  color: string;
}

interface PermissionCategory {
  category: string;
  items: { value: string; label: string }[];
}

export default function RolesManagementPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<PermissionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    displayName: "",
    description: "",
    permissions: [] as string[],
    color: "gray",
  });

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/admin/roles");
      const data = await res.json();
      setRoles(data.roles || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const res = await fetch("/api/admin/roles/available-permissions");
      const data = await res.json();
      setPermissions(data.permissions || []);
    } catch (err) {
      console.error(err);
    }
  };

  const openCreateModal = () => {
    setEditingRole(null);
    setFormData({
      name: "",
      displayName: "",
      description: "",
      permissions: [],
      color: "gray",
    });
    setError("");
    setShowModal(true);
  };

  const openEditModal = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      displayName: role.displayName,
      description: role.description || "",
      permissions: role.permissions,
      color: role.color,
    });
    setError("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (editingRole) {
        // Update existing role
        const res = await fetch(`/api/admin/roles/${editingRole._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to update role");
          return;
        }
      } else {
        // Create new role
        const res = await fetch("/api/admin/roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to create role");
          return;
        }
      }

      setShowModal(false);
      fetchRoles();
    } catch (err) {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    }
  };

  const handleDelete = async (roleId: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบ Role นี้?")) return;

    try {
      const res = await fetch(`/api/admin/roles/${roleId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete role");
        return;
      }

      fetchRoles();
    } catch (err) {
      alert("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    }
  };

  const togglePermission = (permission: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const selectAllInCategory = (category: PermissionCategory) => {
    const categoryPerms = category.items.map((item) => item.value);
    const allSelected = categoryPerms.every((p) => formData.permissions.includes(p));

    setFormData((prev) => ({
      ...prev,
      permissions: allSelected
        ? prev.permissions.filter((p) => !categoryPerms.includes(p))
        : [...new Set([...prev.permissions, ...categoryPerms])],
    }));
  };

  const roleColorClasses: Record<string, { bg: string; text: string; border: string }> = {
    purple: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
    blue: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    gray: { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
    orange: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
    green: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
    red: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
    cyan: { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Shield size={28} className="text-blue-600" />
            จัดการสิทธิ์ (Roles)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            สร้างและจัดการ Role พร้อมกำหนดสิทธิ์การเข้าถึงแต่ละส่วน
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          สร้าง Role ใหม่
        </button>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((role) => {
          const colorClass = roleColorClasses[role.color] || roleColorClasses.gray;
          return (
            <div
              key={role._id}
              className={`p-5 border-2 rounded-xl ${colorClass.border} ${colorClass.bg}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{role.displayName}</h3>
                  <p className={`text-xs font-semibold ${colorClass.text} mt-1`}>
                    @{role.name}
                  </p>
                </div>
                {!role.isSystem && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditModal(role)}
                      className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
                    >
                      <Edit2 size={14} className="text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(role._id)}
                      className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} className="text-red-600" />
                    </button>
                  </div>
                )}
              </div>

              {role.description && (
                <p className="text-sm text-gray-600 mb-3">{role.description}</p>
              )}

              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">
                  {role.permissions.length} สิทธิ์
                </span>
                {role.isSystem && (
                  <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded font-semibold">
                    System Role
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">
                {editingRole ? "แก้ไข Role" : "สร้าง Role ใหม่"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    ชื่อ Role (ภาษาอังกฤษ) *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={!!editingRole}
                    placeholder="เช่น sales_manager"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    ใช้ตัวอักษรเล็ก ตัวเลข และ underscore เท่านั้น
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    ชื่อแสดง (ภาษาไทย) *
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="เช่น ผู้จัดการฝ่ายขาย"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  คำอธิบาย
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="อธิบายหน้าที่ของ Role นี้"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                  rows={2}
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">สีป้าย</label>
                <div className="flex gap-2">
                  {Object.keys(roleColorClasses).map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-10 h-10 rounded-lg border-2 ${
                        roleColorClasses[color].bg
                      } ${
                        formData.color === color
                          ? "border-gray-800 ring-2 ring-gray-300"
                          : "border-gray-300"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Permissions */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  สิทธิ์การเข้าถึง ({formData.permissions.length} รายการ)
                </label>
                <div className="space-y-4">
                  {permissions.map((category) => {
                    const categoryPerms = category.items.map((item) => item.value);
                    const allSelected = categoryPerms.every((p) =>
                      formData.permissions.includes(p)
                    );

                    return (
                      <div key={category.category} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-800">{category.category}</h4>
                          <button
                            type="button"
                            onClick={() => selectAllInCategory(category)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                          >
                            {allSelected ? "ยกเลิกทั้งหมด" : "เลือกทั้งหมด"}
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {category.items.map((item) => (
                            <label
                              key={item.value}
                              className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg"
                            >
                              <input
                                type="checkbox"
                                checked={formData.permissions.includes(item.value)}
                                onChange={() => togglePermission(item.value)}
                                className="w-4 h-4 text-blue-600 rounded border-gray-300"
                              />
                              <span className="text-sm text-gray-700">{item.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </form>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSubmit}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save size={18} />
                {editingRole ? "บันทึกการแก้ไข" : "สร้าง Role"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
