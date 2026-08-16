import { NextRequest, NextResponse } from "next/server";
import { checkPermission } from "@/lib/check-permission";
import { PERMISSION_CATALOG } from "@/lib/permissions";

// GET /api/admin/roles/available-permissions - Get all available permissions
export async function GET(req: NextRequest) {
  try {
    const { authorized, error } = await checkPermission(req, "view_roles");
    if (!authorized) return error;

    // Sourced from the single permission catalog so the picker can never
    // drift from what the role matrix and the API guards actually use.
    return NextResponse.json({ permissions: PERMISSION_CATALOG });
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch permissions" },
      { status: 500 }
    );
  }
}
