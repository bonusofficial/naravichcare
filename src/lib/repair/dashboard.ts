import mongoose, { type PipelineStage } from "mongoose";
import dbConnect from "@/lib/mongodb";
import RepairJob from "@/models/RepairJob";
import Branch from "@/models/Branch";
import { isBranchInScope, scopeFilter, type RepairScope } from "./branch-scope";
import type { ReportPeriod } from "./period";
import { REPAIR_STATUSES, TERMINAL_STATUSES } from "./status";
import { OVERDUE_EXEMPT_STATUSES } from "./summary";

/**
 * Per-branch figures for the repair dashboard (server only).
 *
 * The definitions match src/lib/repair/summary.ts, computed in MongoDB:
 * - open: status is not completed or cancelled (ready_pickup still counts);
 * - overdue: appointmentDate has passed and the status is not in
 *   OVERDUE_EXEMPT_STATUSES (same as isOverdue);
 * - received: deposits + payments - refunds whose receivedAt falls in the
 *   period, voided entries excluded;
 * - outstanding: over jobs that are not cancelled, max(totalPrice - net, 0)
 *   where net counts every non-voided payment ever received (summarizePayments);
 * - externalCost: actualCost of external_repair movements returned in the
 *   period (sentAt when returnedAt is missing).
 * Counts and outstanding are a snapshot at `now`; received and externalCost
 * belong to the period.
 */

/** branchId value that selects jobs with no branch (callers who see all branches only). */
export const UNASSIGNED_BRANCH = "none";
export const UNASSIGNED_BRANCH_LABEL = "ยังไม่ผูกสาขา";

export interface DashboardFigures {
    openJobs: number;
    overdueJobs: number;
    readyPickup: number;
    /** Net money received in the period (refunds already subtracted). */
    received: number;
    /** Refunds paid out in the period, shown next to `received`. */
    refunded: number;
    outstanding: number;
    externalCost: number;
}

export interface DashboardBranchRow extends DashboardFigures {
    /** null for the row of jobs that have no branch. */
    branchId: string | null;
    name: string;
    isActive: boolean;
}

export interface DashboardStatusCount {
    status: string;
    count: number;
}

export interface RepairDashboard {
    period: { from: string; to: string; fromDate: string; toDate: string };
    generatedAt: string;
    /** The caller sees every branch (and jobs with no branch). */
    allBranches: boolean;
    /** The branch filter applied: a branch id, UNASSIGNED_BRANCH, or null for all. */
    branchId: string | null;
    branches: DashboardBranchRow[];
    totals: DashboardFigures;
    statusBreakdown: DashboardStatusCount[];
}

const round2 = (value: number) => Math.round(value * 100) / 100;

const emptyFigures = (): DashboardFigures => ({
    openJobs: 0, overdueJobs: 0, readyPickup: 0, received: 0, refunded: 0, outstanding: 0, externalCost: 0,
});

const FIGURE_KEYS = Object.keys(emptyFigures()) as (keyof DashboardFigures)[];

/**
 * The job filter for a branch choice, or null when the branch is outside the
 * caller's scope (the API answers 404). Shared with the job list.
 */
export function branchChoiceFilter(scope: RepairScope, branchId: string | null | undefined): Record<string, unknown> | null {
    const choice = branchId?.trim();
    if (!choice) return scopeFilter(scope);
    if (choice === UNASSIGNED_BRANCH) return scope.all ? { branchId: null } : null;
    if (!mongoose.isValidObjectId(choice) || !isBranchInScope(scope, choice)) return null;
    return { branchId: new mongoose.Types.ObjectId(choice) };
}

/** Mongo query condition for jobs whose appointment has passed (same rule as isOverdue). */
export function overdueFilter(now: Date): Record<string, unknown> {
    return { appointmentDate: { $lt: now }, status: { $nin: [...OVERDUE_EXEMPT_STATUSES] } };
}

const inPeriod = (field: unknown, period: ReportPeriod) => ({
    $and: [{ $gte: [field, period.from] }, { $lte: [field, period.to] }],
});

function dashboardPipeline(match: Record<string, unknown>, period: ReportPeriod, now: Date): PipelineStage[] {
    const signedAmount = {
        $switch: {
            branches: [
                { case: { $in: ["$$p.kind", ["deposit", "payment"]] }, then: { $ifNull: ["$$p.amount", 0] } },
                { case: { $eq: ["$$p.kind", "refund"] }, then: { $multiply: [{ $ifNull: ["$$p.amount", 0] }, -1] } },
            ],
            default: 0,
        },
    };
    const sumPayments = (cond: Record<string, unknown> | true, value: unknown) => ({
        $sum: {
            $map: {
                input: { $filter: { input: "$livePayments", as: "p", cond } },
                as: "p",
                in: value,
            },
        },
    });

    return [
        { $match: match },
        // Keep only what the figures need; jobs carry inline photos.
        {
            $project: {
                _id: 0,
                branchId: { $ifNull: ["$branchId", null] },
                status: 1,
                appointmentDate: 1,
                totalPrice: { $round: [{ $ifNull: ["$totalPrice", 0] }, 2] },
                livePayments: {
                    $filter: {
                        input: { $ifNull: ["$payments", []] },
                        as: "p",
                        cond: { $not: [{ $ifNull: ["$$p.voidedAt", false] }] },
                    },
                },
                movements: { $ifNull: ["$movements", []] },
            },
        },
        {
            $facet: {
                byBranch: [
                    {
                        $project: {
                            branchId: 1,
                            open: { $cond: [{ $in: ["$status", [...TERMINAL_STATUSES]] }, 0, 1] },
                            overdue: {
                                $cond: [
                                    {
                                        $and: [
                                            // $lt alone would treat a missing appointment (null) as earlier than any date.
                                            { $eq: [{ $type: "$appointmentDate" }, "date"] },
                                            { $lt: ["$appointmentDate", now] },
                                            { $not: [{ $in: ["$status", [...OVERDUE_EXEMPT_STATUSES]] }] },
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                            ready: { $cond: [{ $eq: ["$status", "ready_pickup"] }, 1, 0] },
                            received: sumPayments(inPeriod("$$p.receivedAt", period), signedAmount),
                            refunded: sumPayments(
                                { $and: [{ $eq: ["$$p.kind", "refund"] }, inPeriod("$$p.receivedAt", period)] },
                                { $ifNull: ["$$p.amount", 0] },
                            ),
                            outstanding: {
                                $cond: [
                                    { $eq: ["$status", "cancelled"] },
                                    0,
                                    { $max: [{ $subtract: ["$totalPrice", { $round: [sumPayments(true, signedAmount), 2] }] }, 0] },
                                ],
                            },
                            externalCost: {
                                $sum: {
                                    $map: {
                                        input: {
                                            $filter: {
                                                input: "$movements",
                                                as: "m",
                                                cond: {
                                                    $and: [
                                                        { $eq: ["$$m.type", "external_repair"] },
                                                        inPeriod({ $ifNull: ["$$m.returnedAt", "$$m.sentAt"] }, period),
                                                    ],
                                                },
                                            },
                                        },
                                        as: "m",
                                        in: { $ifNull: ["$$m.actualCost", 0] },
                                    },
                                },
                            },
                        },
                    },
                    {
                        $group: {
                            _id: "$branchId",
                            jobs: { $sum: 1 },
                            openJobs: { $sum: "$open" },
                            overdueJobs: { $sum: "$overdue" },
                            readyPickup: { $sum: "$ready" },
                            received: { $sum: "$received" },
                            refunded: { $sum: "$refunded" },
                            outstanding: { $sum: "$outstanding" },
                            externalCost: { $sum: "$externalCost" },
                        },
                    },
                ],
                byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
            },
        },
    ];
}

interface BranchGroup extends DashboardFigures {
    _id: mongoose.Types.ObjectId | null;
    jobs: number;
}

interface BranchDoc {
    _id: mongoose.Types.ObjectId;
    name: string;
    isActive?: boolean;
}

/**
 * Dashboard figures for the caller's scope. Returns null when `branchId`
 * names a branch outside the scope (or does not exist).
 */
export async function getRepairDashboard(options: {
    scope: RepairScope;
    period: ReportPeriod;
    branchId?: string | null;
    now?: Date;
}): Promise<RepairDashboard | null> {
    const { scope, period } = options;
    const now = options.now ?? new Date();
    const branchId = options.branchId?.trim() || null;
    const match = branchChoiceFilter(scope, branchId);
    if (!match) return null;

    await dbConnect();

    // Branches that get a row even with no jobs: the chosen one, the caller's
    // own branches, or (for callers who see everything) every active branch.
    let listed: BranchDoc[] = [];
    if (branchId && branchId !== UNASSIGNED_BRANCH) {
        listed = await Branch.find({ _id: branchId }).select("name isActive").lean<BranchDoc[]>();
        if (listed.length === 0) return null;
    } else if (!branchId) {
        listed = await Branch.find(scope.all ? { isActive: true } : { _id: { $in: scope.branchIds } })
            .select("name isActive")
            .lean<BranchDoc[]>();
    }

    const [result] = await RepairJob.aggregate<{ byBranch: BranchGroup[]; byStatus: { _id: string; count: number }[] }>(
        dashboardPipeline(match, period, now),
    );
    const groups = new Map((result?.byBranch ?? []).map((group) => [group._id ? String(group._id) : null, group]));

    // Branches that have jobs but were not listed (e.g. deactivated since).
    const missing = [...groups.keys()].filter((id): id is string => id !== null && !listed.some((b) => String(b._id) === id));
    if (missing.length > 0) {
        listed = listed.concat(await Branch.find({ _id: { $in: missing } }).select("name isActive").lean<BranchDoc[]>());
    }

    const toFigures = (group?: BranchGroup): DashboardFigures => {
        const figures = emptyFigures();
        if (group) for (const key of FIGURE_KEYS) figures[key] = round2(Number(group[key]) || 0);
        return figures;
    };

    const branches: DashboardBranchRow[] = listed
        .map((branch) => ({
            branchId: String(branch._id),
            name: branch.name,
            isActive: branch.isActive !== false,
            ...toFigures(groups.get(String(branch._id))),
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "th"));

    // A job can point at a branch that was deleted; keep its money visible.
    const orphans = [...groups.entries()].filter(([id]) => id !== null && !listed.some((b) => String(b._id) === id));
    for (const [id, group] of orphans) {
        branches.push({ branchId: id, name: "สาขาที่ถูกลบ", isActive: false, ...toFigures(group) });
    }

    const unassigned = groups.get(null);
    if (scope.all && (branchId === UNASSIGNED_BRANCH || (!branchId && unassigned && unassigned.jobs > 0))) {
        branches.push({ branchId: null, name: UNASSIGNED_BRANCH_LABEL, isActive: true, ...toFigures(unassigned) });
    }

    const totals = emptyFigures();
    for (const row of branches) for (const key of FIGURE_KEYS) totals[key] += row[key];
    for (const key of FIGURE_KEYS) totals[key] = round2(totals[key]);

    const statusCounts = new Map((result?.byStatus ?? []).map((entry) => [entry._id, entry.count]));
    const statusBreakdown = REPAIR_STATUSES
        .filter((status) => statusCounts.has(status))
        .map((status) => ({ status, count: statusCounts.get(status)! }));

    return {
        period: {
            from: period.from.toISOString(),
            to: period.to.toISOString(),
            fromDate: period.fromDate,
            toDate: period.toDate,
        },
        generatedAt: now.toISOString(),
        allBranches: scope.all,
        branchId,
        branches,
        totals,
        statusBreakdown,
    };
}
