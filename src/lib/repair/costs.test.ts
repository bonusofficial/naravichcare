import { describe, expect, it } from "vitest";
import { computeRepairCosts, isValidMoney } from "./costs";

describe("repair cost semantics", () => {
    it("derives inventory and customer totals from the three inputs", () => {
        expect(computeRepairCosts({ partsPurchaseCost: 900, partsCost: 1500, laborCost: 500 })).toEqual({
            partsPurchaseCost: 900,
            partsSellingPrice: 1500,
            laborCost: 500,
            inventoryCostTotal: 1400,
            customerChargeTotal: 2000,
        });
    });

    it("does not accumulate float error", () => {
        const costs = computeRepairCosts({ partsPurchaseCost: 0.1, partsCost: 0.2, laborCost: 0.1 });
        expect(costs.inventoryCostTotal).toBe(0.2);
        expect(costs.customerChargeTotal).toBe(0.3);
    });

    it("treats missing values as zero", () => {
        expect(computeRepairCosts({}).customerChargeTotal).toBe(0);
    });

    it("validates money amounts", () => {
        expect(isValidMoney(10.25)).toBe(true);
        expect(isValidMoney(0)).toBe(true);
        expect(isValidMoney(-1)).toBe(false);
        expect(isValidMoney(1.234)).toBe(false);
        expect(isValidMoney(Number.NaN)).toBe(false);
        expect(isValidMoney("10")).toBe(false);
    });
});
