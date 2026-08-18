import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Role from "@/models/Role";
import AdminUser from "@/models/AdminUser";
import { checkPermission } from "@/lib/check-permission";
import { recordAdminLog } from "@/lib/admin-log";

// GET /api/admin/roles/[id] - Get single role
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, error } = await checkPermission(request, "view_roles");
    if (!authorized) return error;

    const { id } = await params;

    await connectDB();
    const role = await Role.findById(id);

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    return NextResponse.json({ role });
  } catch (error) {
    console.error("Error fetching role:", error);
    return NextResponse.json({ error: "Failed to fetch role" }, { status: 500 });
  }
}

// PUT /api/admin/roles/[id] - Update role
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, error } = await checkPermission(request, "edit_roles");
    if (!authorized) return error;

    const body = await request.json();
    const { displayName, description, permissions, color } = body;

    const { id } = await params;

    await connectDB();
    const role = await Role.findById(id);

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // super_admin is the only locked role: it is the account that grants every
    // other permission, so letting it be narrowed could strip the last user
    // able to restore access. Other system roles stay editable.
    if (role.name === "super_admin") {
      return NextResponse.json(
        { error: "ไม่สามารถแก้ไข Super Admin ได้" },
        { status: 400 }
      );
    }

    // Update role
    role.displayName = displayName || role.displayName;
    role.description = description !== undefined ? description : role.description;
    role.permissions = permissions || role.permissions;
    role.color = color || role.color;

    await role.save();

    await recordAdminLog({
      req: request,
      action: "update_role",
      description: `แก้ไข Role: ${role.displayName} (@${role.name})`,
      targetId: role._id.toString(),
      targetType: "Role",
      details: { permissionCount: role.permissions.length, isSystem: role.isSystem },
    });

    return NextResponse.json({ role });
  } catch (error) {
    console.error("Error updating role:", error);
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
  }
}

// DELETE /api/admin/roles/[id] - Delete role
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, error } = await checkPermission(request, "delete_roles");
    if (!authorized) return error;

    const { id } = await params;

    await connectDB();
    const role = await Role.findById(id);

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // System roles stay undeletable even though they are now editable: existing
    // accounts reference them by name, and seed-roles would recreate them anyway.
    if (role.isSystem) {
      return NextResponse.json(
        { error: "ไม่สามารถลบ System Role ได้ (แก้ไขสิทธิ์ได้แทน)" },
        { status: 400 }
      );
    }

    const inUse = await AdminUser.countDocuments({ role: role.name });
    if (inUse > 0) {
      return NextResponse.json(
        { error: `ยังมีผู้ใช้ ${inUse} บัญชีใช้ Role นี้อยู่ กรุณาย้ายผู้ใช้ก่อนลบ` },
        { status: 409 }
      );
    }

    await Role.findByIdAndDelete(id);

    await recordAdminLog({
      req: request,
      action: "delete_role",
      description: `ลบ Role: ${role.displayName} (@${role.name})`,
      targetId: id,
      targetType: "Role",
    });

    return NextResponse.json({ message: "Role deleted successfully" });
  } catch (error) {
    console.error("Error deleting role:", error);
    return NextResponse.json({ error: "Failed to delete role" }, { status: 500 });
  }
}
