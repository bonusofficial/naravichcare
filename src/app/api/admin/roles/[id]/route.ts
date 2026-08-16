import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Role from "@/models/Role";
import { checkPermission } from "@/lib/check-permission";

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

    // Prevent editing system roles' core properties
    if (role.isSystem) {
      return NextResponse.json(
        { error: "Cannot edit system role" },
        { status: 400 }
      );
    }

    // Update role
    role.displayName = displayName || role.displayName;
    role.description = description !== undefined ? description : role.description;
    role.permissions = permissions || role.permissions;
    role.color = color || role.color;

    await role.save();

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

    // Prevent deleting system roles
    if (role.isSystem) {
      return NextResponse.json(
        { error: "Cannot delete system role" },
        { status: 400 }
      );
    }

    await Role.findByIdAndDelete(id);

    return NextResponse.json({ message: "Role deleted successfully" });
  } catch (error) {
    console.error("Error deleting role:", error);
    return NextResponse.json({ error: "Failed to delete role" }, { status: 500 });
  }
}
