/**
 * Repair cost semantics. The RepairJob document keeps its historical field
 * names; this maps them to unambiguous names for the integration API:
 *
 *   partsPurchaseCost   job.partsPurchaseCost  what the shop paid for parts
 *   partsSellingPrice   job.partsCost          what the parts are charged at
 *   laborCost           job.laborCost
 *   inventoryCostTotal  partsPurchaseCost + laborCost
 *   customerChargeTotal partsSellingPrice + laborCost  (= job.totalPrice)
 *
 * Arithmetic runs in satang so totals never pick up float error.
 */

export const MAX_MONEY = 10_000_000;

export interface RepairCostInput {
    laborCost?: number | null;
    partsCost?: number | null;
    partsPurchaseCost?: number | null;
}

export interface RepairCostBreakdown {
    partsPurchaseCost: number;
    partsSellingPrice: number;
    laborCost: number;
    inventoryCostTotal: number;
    customerChargeTotal: number;
}

const toSatang = (value: number | null | undefined) => Math.round((Number(value) || 0) * 100);
const fromSatang = (satang: number) => satang / 100;

export function computeRepairCosts(input: RepairCostInput): RepairCostBreakdown {
    const purchase = toSatang(input.partsPurchaseCost);
    const selling = toSatang(input.partsCost);
    const labor = toSatang(input.laborCost);
    return {
        partsPurchaseCost: fromSatang(purchase),
        partsSellingPrice: fromSatang(selling),
        laborCost: fromSatang(labor),
        inventoryCostTotal: fromSatang(purchase + labor),
        customerChargeTotal: fromSatang(selling + labor),
    };
}

/** A money amount from a client: finite, non-negative, at most 2 decimals. */
export function isValidMoney(value: unknown): value is number {
    return typeof value === "number"
        && Number.isFinite(value)
        && value >= 0
        && value <= MAX_MONEY
        && Math.abs(Math.round(value * 100) - value * 100) < 1e-6;
}
