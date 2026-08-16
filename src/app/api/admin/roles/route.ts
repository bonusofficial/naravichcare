import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Role from "@/models/Role";
import { checkPermission } from "@/lib/check-permission";

// GET /api/admin/roles - Get all roles
export async function GET(request: NextRequest) {
  try {
    // DB-backed check, so a custom role that grants view_roles works here too.
    const { authorized, error } = await checkPermission(request, "view_roles");
    if (!authorized) return error;

    await connectDB();
    const roles = await Role.find().sort({ isSystem: -1, name: 1 });

    return NextResponse.json({ roles });
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json({ error: "Failed to fetch roles" }, { status: 500 });
  }
}

// POST /api/admin/roles - Create new custom role
export async function POST(request: NextRequest) {
  try {
    const { authorized, error } = await checkPermission(request, "create_roles");
    if (!authorized) return error;

    const body = await request.json();
    const { name, displayName, description, permissions, color } = body;

    if (!name || !displayName) {
      return NextResponse.json(
        { error: "Name and displayName are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if role already exists
    const existing = await Role.findOne({ name: name.toLowerCase() });
    if (existing) {
      return NextResponse.json(
        { error: "Role with this name already exists" },
        { status: 400 }
      );
    }

    const role = await Role.create({
      name: name.toLowerCase().replace(/\s+/g, "_"),
      displayName,
      description,
      permissions: permissions || [],
      color: color || "gray",
      isSystem: false,
    });

    return NextResponse.json({ role }, { status: 201 });
  } catch (error) {
    console.error("Error creating role:", error);
    return NextResponse.json({ error: "Failed to create role" }, { status: 500 });
  }
}
