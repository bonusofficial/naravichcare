import mongoose from "mongoose";
import { NextResponse, type NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import { checkPermission } from "@/lib/check-permission";
import type { Permission } from "@/lib/permissions";
import RepairJob, { type IRepairJob } from "@/models/RepairJob";
import Branch from "@/models/Branch";
import type { RepairActor } from "./service";

/**
 * Which repair jobs an admin may see and work on.
 *
 * Users with `view_all_branches` see every job, including jobs that have no
 * branch yet (legacy jobs, or POS jobs from an unmapped POS branch). Everyone
 * else sees only jobs of their home branch (AdminUser.branchId) plus the
 * branches in AdminUser.branchIds. A user with neither sees nothing.
 *
 * Every admin route that reads or changes a repair job goes through this file.
 * Jobs outside the scope answer 404, not 403, so their existence does not leak.
 */

export type RepairScope =
    | { all: true }
    | { all: false; branchIds: mongoose.Types.ObjectId[] };

interface ScopeUser {
    branchId?: mongoose.Types.ObjectId | string | null;
    branchIds?: readonly (mongoose.Types.ObjectId | string)[] | null;
}

export function getRepairScope(user: ScopeUser, permissions: readonly string[]): RepairScope {
    if (permissions.includes("view_all_branches")) return { all: true };
    const ids = new Map<string, mongoose.Types.ObjectId>();
    for (const id of [user.branchId, ...(user.branchIds ?? [])]) {
        if (id && mongoose.isValidObjectId(id)) ids.set(String(id), new mongoose.Types.ObjectId(String(id)));
    }
    return { all: false, branchIds: [...ids.values()] };
}

/** Mongo filter on RepairJob that keeps only jobs inside the scope. */
export function scopeFilter(scope: RepairScope): Record<string, unknown> {
    return scope.all ? {} : { branchId: { $in: scope.branchIds } };
}

export function isBranchInScope(scope: RepairScope, branchId: mongoose.Types.ObjectId | string | null | undefined): boolean {
    if (scope.all) return true;
    if (!branchId) return false;
    return scope.branchIds.some((id) => String(id) === String(branchId));
}

/** The branch ids a user can choose from when opening a job. */
export async function branchesInScope(scope: RepairScope) {
    await dbConnect();
    const filter = scope.all ? { isActive: true } : { _id: { $in: scope.branchIds }, isActive: true };
    return Branch.find(filter).select("name location").sort({ name: 1 }).lean();
}

type CheckedUser = Extract<Awaited<ReturnType<typeof checkPermission>>, { authorized: true }>["user"];

export interface RepairAccess {
    user: CheckedUser;
    scope: RepairScope;
    /** Use for statusHistory, recordedBy fields and recordAdminLog. */
    actor: RepairActor;
}

export type RepairAccessResult = ({ ok: true } & RepairAccess) | { ok: false; error: NextResponse };

/** Check one permission and work out the caller's branch scope. */
export async function requireRepairAccess(req: NextRequest, permission: Permission): Promise<RepairAccessResult> {
    const check = await checkPermission(req, permission);
    if (!check.authorized) return { ok: false, error: check.error };
    const { user, permissions } = check;
    return {
        ok: true,
        user,
        scope: getRepairScope(user, permissions),
        actor: { type: "admin", id: String(user._id), name: user.username },
    };
}

export const jobNotFound = () => NextResponse.json({ error: "Job not found" }, { status: 404 });

/** `{ _id, ...scope }`, or null when the id is not an ObjectId. */
export function scopedJobFilter(scope: RepairScope, id: string): Record<string, unknown> | null {
    if (!mongoose.isValidObjectId(id)) return null;
    return { _id: new mongoose.Types.ObjectId(id), ...scopeFilter(scope) };
}

export type LeanRepairJob = IRepairJob & { _id: mongoose.Types.ObjectId };

export type ScopedJobResult = ({ ok: true; job: LeanRepairJob } & RepairAccess) | { ok: false; error: NextResponse };

/**
 * Check the permission, then load the job only if it is in the caller's
 * branch scope. Answers 404 for a bad id, a missing job, or a job in another
 * branch. `select` defaults to everything except the inline photos.
 *
 * Typical use in a route under /api/admin/repair/jobs/[id]/...:
 *
 *     const access = await loadScopedRepairJob(req, id, "edit_repair_jobs");
 *     if (!access.ok) return access.error;
 *     const { job, actor } = access;
 */
export async function loadScopedRepairJob(
    req: NextRequest,
    id: string,
    permission: Permission,
    options: { select?: string } = {},
): Promise<ScopedJobResult> {
    const access = await requireRepairAccess(req, permission);
    if (!access.ok) return access;
    const filter = scopedJobFilter(access.scope, id);
    if (!filter) return { ok: false, error: jobNotFound() };
    await dbConnect();
    const job = await RepairJob.findOne(filter)
        .select(options.select ?? "-photosBefore -photosAfter")
        .lean<LeanRepairJob>();
    if (!job) return { ok: false, error: jobNotFound() };
    return { ...access, job };
}

/**
 * Populate used by every admin endpoint that returns a full job to the UI
 * (matches RepairJobView): `RepairJob.findOne(filter).populate(ADMIN_JOB_POPULATE)`.
 */
export const ADMIN_JOB_POPULATE = [
    { path: "customer" },
    { path: "assignedTechnician", select: "name username" },
    { path: "branchId", select: "name location phone" },
];
