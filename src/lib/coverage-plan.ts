export const COVERAGE_PLAN_DEVICE_OPTIONS = [
    { value: "all", label: "เลือกทั้งหมด" },
    { value: "iPhone", label: "iPhone" },
    { value: "iPad", label: "iPad" },
    { value: "Smartphone", label: "Smartphone (Android)" },
    { value: "Tablet", label: "Tablet (Android)" },
] as const;

export type CoveragePlanDeviceType = typeof COVERAGE_PLAN_DEVICE_OPTIONS[number]["value"];

export const COVERAGE_PLAN_DEVICE_TYPES = COVERAGE_PLAN_DEVICE_OPTIONS.map(({ value }) => value);

export function isCoveragePlanDeviceType(value: unknown): value is CoveragePlanDeviceType {
    return typeof value === "string" && COVERAGE_PLAN_DEVICE_TYPES.some((deviceType) => deviceType === value);
}

export function supportsDeviceType(planDeviceType: unknown, customerDeviceType: string): boolean {
    return customerDeviceType === "all" || planDeviceType === "all" || planDeviceType === customerDeviceType;
}

export function getCoveragePlanDeviceLabel(value: unknown): string {
    return COVERAGE_PLAN_DEVICE_OPTIONS.find((option) => option.value === value)?.label ?? "ไม่ระบุประเภท";
}
