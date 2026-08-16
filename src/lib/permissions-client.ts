/**
 * Client-side permission checking
 * This fetches the user's role permissions from the database
 */

export async function hasPermissionClient(user: any, permission: string): Promise<boolean> {
    if (!user) return false;

    try {
        // Fetch user's role from API
        const res = await fetch(`/api/admin/roles?name=${user.role}`);
        if (!res.ok) return false;

        const data = await res.json();
        const role = data.roles?.find((r: any) => r.name === user.role);

        if (!role) return false;

        // Check if the role has the required permission
        return role.permissions.includes(permission);
    } catch (error) {
        console.error("Error checking permission:", error);
        return false;
    }
}

/**
 * Sync version for client components (assumes permissions are already loaded)
 * Use this in components where you've already fetched the role data
 */
export function hasPermissionSync(userPermissions: string[], permission: string): boolean {
    return userPermissions.includes(permission);
}
