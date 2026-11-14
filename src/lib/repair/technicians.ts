import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import { resolveRolePermissions } from "@/lib/check-permission";
import AdminUser from "@/models/AdminUser";
import { AdminValidationError } from "./admin-validation";

export interface RepairTechnician {
    _id: string;
    name: string;
    username: string;
}

interface UserRow {
    _id: mongoose.Types.ObjectId;
    name?: string;
    username: string;
    role: string;
    branchId?: mongoose.Types.ObjectId | null;
    branchIds?: mongoose.Types.ObjectId[];
}

/**
 * Active staff who can work on repair jobs (their role has edit_repair_jobs),
 * for the "ช่างผู้รับผิดชอบ" picker. With `branchId`, only staff who work in
 * that branch or see every branch.
 */
export async function listRepairTechnicians(branchId?: string | null): Promise<RepairTechnician[]> {
    await dbConnect();
    const users = await AdminUser.find({ isActive: { $ne: false } })
        .select("name username role branchId branchIds")
        .sort({ name: 1, username: 1 })
        .lean<UserRow[]>();
    const permissionsByRole = new Map<string, string[]>();
    for (const role of new Set(users.map((user) => user.role))) {
        permissionsByRole.set(role, await resolveRolePermissions(role));
    }
    return users
        .filter((user) => {
            const permissions = permissionsByRole.get(user.role) ?? [];
            if (!permissions.includes("edit_repair_jobs")) return false;
            if (!branchId || permissions.includes("view_all_branches")) return true;
            return [user.branchId, ...(user.branchIds ?? [])].some((id) => id && String(id) === branchId);
        })
        .map((user) => ({ _id: String(user._id), name: user.name || user.username, username: user.username }));
}

/** Rejects an id that is not an active admin user. */
export async function assertActiveTechnician(id: string): Promise<void> {
    await dbConnect();
    const exists = await AdminUser.exists({ _id: id, isActive: { $ne: false } });
    if (!exists) throw new AdminValidationError("ไม่พบช่างผู้รับผิดชอบ หรือบัญชีถูกปิดใช้งาน", ["assignedTechnician"]);
}
