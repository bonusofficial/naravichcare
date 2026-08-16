import mongoose from "mongoose";

/**
 * Shared filtering and money rules for the profit report.
 *
 * Both /api/admin/profit-report (grouped summary) and its /details drill-down
 * import from here so the two views can never disagree about which sales count
 * or how a refund is valued.
 */

/** Statuses that represent a sale that actually reached the books. */
export const SALE_STATUSES = ["approved", "cancelled", "refunded"];

export interface ProfitFilterInput {
    startDate?: string | null;
    endDate?: string | null;
    packageId?: string | null;
    agentCode?: string | null;
    branchId?: string | null;
    status?: string | null;
}

export function buildProfitMatch({
    startDate,
    endDate,
    packageId,
    agentCode,
    branchId,
    status,
}: ProfitFilterInput): Record<string, any> {
    const filter: any = {};

    // Cancelled and refunded sales stay in the result set: they are not counted
    // as sales, but their package cost still has to hit the bottom line.
    filter.status = status ? status : { $in: SALE_STATUSES };

    if (startDate || endDate) {
        filter.approvedAt = {};
        if (startDate) filter.approvedAt.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            // A bare YYYY-MM-DD parses to midnight, which would exclude that whole
            // day's sales; treat it as inclusive of the entire day.
            if (/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
                end.setHours(23, 59, 59, 999);
            }
            filter.approvedAt.$lte = end;
        }
    }

    if (packageId) filter.packageType = packageId;
    if (agentCode) filter.agentCode = agentCode;

    // $match inside an aggregation does not get Mongoose's schema casting, so an
    // ObjectId path has to be cast by hand or it silently matches nothing.
    if (branchId && mongoose.isValidObjectId(branchId)) {
        filter.branchId = new mongoose.Types.ObjectId(branchId);
    }

    return filter;
}

const IS_VOID = {
    $or: [{ $eq: ["$isCancelled", true] }, { $eq: ["$isRefunded", true] }],
};

/**
 * Derives the effective money columns for each sale.
 *
 * Cancelled/refunded sales are refunded in full and the agent's commission is
 * clawed back, so both go to zero. The package cost and any other expenses were
 * still incurred, which leaves those rows as a loss of exactly that amount.
 */
export const PROFIT_EFFECTIVE_STAGES: any[] = [
    {
        $addFields: {
            isVoid: IS_VOID,
            effectivePackageCost: { $ifNull: ["$packageCost", 0] },
            effectiveOtherExpenses: { $ifNull: ["$otherExpenses", 0] },
            effectiveRevenue: { $cond: [IS_VOID, 0, { $ifNull: ["$salePrice", 0] }] },
            effectiveCommission: { $cond: [IS_VOID, 0, { $ifNull: ["$agentCommission", 0] }] },
        },
    },
    {
        $addFields: {
            effectiveTotalCost: {
                $add: [
                    "$effectivePackageCost",
                    "$effectiveCommission",
                    "$effectiveOtherExpenses",
                ],
            },
        },
    },
    {
        $addFields: {
            effectiveProfit: {
                $subtract: ["$effectiveRevenue", "$effectiveTotalCost"],
            },
        },
    },
];
