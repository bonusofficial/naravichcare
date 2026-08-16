import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "./auth-middleware";
import { Permission, getRolePermissions } from "./permissions";
import Role from "@/models/Role";

/**
 * Resolve the permission list for a role name.
 *
 * Custom roles live in the Role collection. If a role is not there (e.g. the
 * seed has not been run yet) we fall back to the built-in matrix so the five
 * system roles keep working instead of locking everyone out.
 */
export async function resolveRolePermissions(roleName: string): Promise<string[]> {
  const role = await Role.findOne({ name: roleName });
  if (role) return role.permissions || [];
  return getRolePermissions(roleName);
}

/**
 * Check if user has any of the given permissions.
 * Works with both system roles and custom roles from the database.
 */
export async function checkAnyPermission(
  req: NextRequest,
  requiredPermissions: Permission[]
): Promise<{ authorized: boolean; user: any; error?: NextResponse }> {
  const user = await getCurrentAdmin(req);

  if (!user) {
    return {
      authorized: false,
      user: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  // A deactivated account keeps a valid 24h token, so this has to be checked
  // on every request rather than only at login.
  if (!user.isActive) {
    return {
      authorized: false,
      user,
      error: NextResponse.json(
        { error: "Your account is deactivated" },
        { status: 403 }
      ),
    };
  }

  const permissions = await resolveRolePermissions(user.role);

  const allowed = requiredPermissions.some((perm) => permissions.includes(perm));

  if (!allowed) {
    return {
      authorized: false,
      user,
      error: NextResponse.json(
        { error: "Forbidden: You don't have permission to perform this action" },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, user };
}

/**
 * Check if user has a specific permission.
 */
export async function checkPermission(
  req: NextRequest,
  requiredPermission: Permission
): Promise<{ authorized: boolean; user: any; error?: NextResponse }> {
  return checkAnyPermission(req, [requiredPermission]);
}
