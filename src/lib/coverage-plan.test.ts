import { describe, expect, it } from "vitest";
import {
    getCoveragePlanDeviceLabel,
    isCoveragePlanDeviceType,
    supportsDeviceType,
} from "./coverage-plan";

describe("coverage plan device targeting", () => {
    it("makes an all-device plan available to every supported customer device", () => {
        for (const deviceType of ["iPhone", "iPad", "Smartphone", "Tablet"]) {
            expect(supportsDeviceType("all", deviceType)).toBe(true);
        }
    });

    it("keeps a device-specific plan limited to the matching device", () => {
        expect(supportsDeviceType("iPhone", "iPhone")).toBe(true);
        expect(supportsDeviceType("iPhone", "iPad")).toBe(false);
    });

    it("shows every active plan when a customer chooses all for a manually entered model", () => {
        for (const planDeviceType of ["all", "iPhone", "iPad", "Smartphone", "Tablet"]) {
            expect(supportsDeviceType(planDeviceType, "all")).toBe(true);
        }
    });

    it("validates and labels the all-device option", () => {
        expect(isCoveragePlanDeviceType("all")).toBe(true);
        expect(isCoveragePlanDeviceType("unknown")).toBe(false);
        expect(getCoveragePlanDeviceLabel("all")).toBe("เลือกทั้งหมด");
    });
});
