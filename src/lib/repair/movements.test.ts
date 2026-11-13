import { describe, expect, it } from "vitest";
import {
    checkCanSend, currentHolderLabel, holderAfterReturn, holderText, movementState, openExternalRepair,
    parseReturnInput, parseSendInput, returnableMovement, type CustodyJobLike, type MovementRecordLike,
} from "./movements";

const NOW = new Date("2026-11-13T10:00:00.000Z");
const BRANCH_A = "64b000000000000000000001";
const BRANCH_B = "64b000000000000000000002";

const movement = (overrides: Partial<MovementRecordLike> = {}): MovementRecordLike => ({
    _id: "m1",
    type: "transfer",
    toKind: "technician",
    toLabel: "ช่างเอ",
    sentAt: "2026-11-13T08:00:00.000Z",
    returnedAt: null,
    ...overrides,
});

const job = (overrides: Partial<CustodyJobLike> = {}): CustodyJobLike => ({
    status: "in_progress",
    receivedAt: "2026-11-13T07:00:00.000Z",
    currentHolder: { kind: "branch", label: "สาขา A", branchId: BRANCH_A },
    movements: [],
    ...overrides,
});

function expectError(result: { ok: boolean }, code: string, field?: string) {
    expect(result.ok).toBe(false);
    const error = result as unknown as { code: string; fields?: string[] };
    expect(error.code).toBe(code);
    if (field) expect(error.fields).toEqual([field]);
}

describe("parseSendInput", () => {
    it("derives the movement type from the destination", () => {
        const branch = parseSendInput({ toKind: "branch", toBranchId: BRANCH_B, sentBy: " สมชาย ", note: "ส่งเปลี่ยนจอ" }, NOW);
        expect(branch).toEqual({
            ok: true,
            value: { type: "transfer", toKind: "branch", toBranchId: BRANCH_B, toLabel: "", sentBy: "สมชาย", receivedBy: "", sentAt: NOW, note: "ส่งเปลี่ยนจอ" },
        });

        const technician = parseSendInput({ toKind: "technician", toLabel: "ช่างบี" }, NOW);
        expect(technician.ok && technician.value).toMatchObject({ type: "transfer", toKind: "technician", toLabel: "ช่างบี" });

        const external = parseSendInput({ toKind: "external", vendorName: "ร้านซ่อมบอร์ด", type: "external_repair" }, NOW);
        expect(external.ok && external.value).toMatchObject({ type: "external_repair", toKind: "external", toLabel: "ร้านซ่อมบอร์ด", vendorName: "ร้านซ่อมบอร์ด" });
    });

    it("requires what identifies the destination", () => {
        expectError(parseSendInput({}, NOW), "VALIDATION_ERROR", "toKind");
        expectError(parseSendInput({ toKind: "customer" }, NOW), "VALIDATION_ERROR", "toKind");
        expectError(parseSendInput({ toKind: "branch" }, NOW), "VALIDATION_ERROR", "toBranchId");
        expectError(parseSendInput({ toKind: "branch", toBranchId: "not-an-id" }, NOW), "VALIDATION_ERROR", "toBranchId");
        expectError(parseSendInput({ toKind: "technician", toLabel: "  " }, NOW), "VALIDATION_ERROR", "toLabel");
        expectError(parseSendInput({ toKind: "external" }, NOW), "VALIDATION_ERROR", "vendorName");
    });

    it("rejects a type that contradicts the destination, unknown fields and bad text", () => {
        expectError(parseSendInput({ toKind: "technician", toLabel: "ช่างบี", type: "external_repair" }, NOW), "VALIDATION_ERROR", "type");
        expectError(parseSendInput({ toKind: "external", vendorName: "ร้าน", type: "transfer" }, NOW), "VALIDATION_ERROR", "type");
        expectError(parseSendInput({ toKind: "technician", toLabel: "ช่างบี", currentHolder: {} }, NOW), "VALIDATION_ERROR", "currentHolder");
        expectError(parseSendInput({ toKind: "technician", toLabel: "x".repeat(101) }, NOW), "VALIDATION_ERROR", "toLabel");
        expectError(parseSendInput({ toKind: "technician", toLabel: "ช่าง", sentBy: 5 }, NOW), "VALIDATION_ERROR", "sentBy");
        expectError(parseSendInput({ toKind: "technician", toLabel: "ช่าง", note: "a\u0000b" }, NOW), "VALIDATION_ERROR", "note");
        expectError(parseSendInput(null, NOW), "VALIDATION_ERROR");
        expectError(parseSendInput([], NOW), "VALIDATION_ERROR");
    });

    it("defaults sentAt to now and refuses times in the future", () => {
        const given = parseSendInput({ toKind: "technician", toLabel: "ช่าง", sentAt: "2026-11-13T09:30:00.000Z" }, NOW);
        expect(given.ok && given.value.sentAt.toISOString()).toBe("2026-11-13T09:30:00.000Z");
        // A minute of clock skew is tolerated.
        expect(parseSendInput({ toKind: "technician", toLabel: "ช่าง", sentAt: "2026-11-13T10:00:30.000Z" }, NOW).ok).toBe(true);
        expectError(parseSendInput({ toKind: "technician", toLabel: "ช่าง", sentAt: "2026-11-13T11:00:00.000Z" }, NOW), "VALIDATION_ERROR", "sentAt");
        expectError(parseSendInput({ toKind: "technician", toLabel: "ช่าง", sentAt: "yesterday" }, NOW), "VALIDATION_ERROR", "sentAt");
    });
});

describe("checkCanSend", () => {
    const toTechnician = { toKind: "technician" as const, toLabel: "ช่างบี", sentAt: NOW };

    it("allows a hand-off from an open job", () => {
        expect(checkCanSend(job(), toTechnician)).toBeNull();
        // Chaining: a technician can pass the device on before it comes back.
        expect(checkCanSend(job({ movements: [movement()], currentHolder: { kind: "technician", label: "ช่างเอ" } }), toTechnician)).toBeNull();
    });

    it("refuses completed and cancelled jobs", () => {
        expectError(checkCanSend(job({ status: "completed" }), toTechnician)!, "REPAIR_CLOSED");
        expectError(checkCanSend(job({ status: "cancelled" }), toTechnician)!, "REPAIR_CLOSED");
    });

    it("refuses a new movement while an outside repair is still open", () => {
        const atShop = job({
            movements: [movement({ type: "external_repair", toKind: "external", toLabel: "ร้านซ่อมบอร์ด" })],
            currentHolder: { kind: "external", label: "ร้านซ่อมบอร์ด" },
        });
        const error = checkCanSend(atShop, toTechnician)!;
        expectError(error, "EXTERNAL_REPAIR_OPEN");
        expect(error.message).toContain("ร้านซ่อมบอร์ด");
        // Once it is back, sending is fine again.
        const back = job({ movements: [movement({ type: "external_repair", returnedAt: "2026-11-13T09:00:00.000Z" })] });
        expect(checkCanSend(back, toTechnician)).toBeNull();
    });

    it("refuses sending the device where it already is", () => {
        expectError(checkCanSend(job(), { toKind: "branch", toLabel: "", toBranchId: BRANCH_A, sentAt: NOW })!, "SAME_HOLDER");
        expect(checkCanSend(job(), { toKind: "branch", toLabel: "", toBranchId: BRANCH_B, sentAt: NOW })).toBeNull();
        const withTech = job({ currentHolder: { kind: "technician", label: "ช่างบี" } });
        expectError(checkCanSend(withTech, { ...toTechnician, toLabel: " ช่างบี " })!, "SAME_HOLDER");
    });

    it("refuses a send time before the job was received", () => {
        expectError(checkCanSend(job(), { ...toTechnician, sentAt: new Date("2026-11-13T06:00:00.000Z") })!, "VALIDATION_ERROR", "sentAt");
        // datetime-local drops seconds; a send in the same minute as intake is fine.
        expect(checkCanSend(job({ receivedAt: "2026-11-13T07:00:42.000Z" }), { ...toTechnician, sentAt: new Date("2026-11-13T07:00:00.000Z") })).toBeNull();
    });
});

describe("parseReturnInput", () => {
    const external = movement({ _id: "m2", type: "external_repair", toKind: "external", toLabel: "ร้านซ่อมบอร์ด" });

    it("returns a transfer with defaults", () => {
        const result = parseReturnInput(job({ movements: [movement()] }), "m1", {}, NOW);
        expect(result.ok && result.value).toMatchObject({ returnedAt: NOW, returnReceivedBy: "", note: "" });
        expect(result.ok && result.value.actualCost).toBeUndefined();
    });

    it("requires a valid actual cost for an outside repair and only there", () => {
        const atShop = job({ movements: [movement({ returnedAt: "2026-11-13T08:30:00.000Z" }), external] });
        expectError(parseReturnInput(atShop, "m2", {}, NOW), "VALIDATION_ERROR", "actualCost");
        expectError(parseReturnInput(atShop, "m2", { actualCost: -1 }, NOW), "VALIDATION_ERROR", "actualCost");
        expectError(parseReturnInput(atShop, "m2", { actualCost: 10.123 }, NOW), "VALIDATION_ERROR", "actualCost");
        expectError(parseReturnInput(atShop, "m2", { actualCost: "500" }, NOW), "VALIDATION_ERROR", "actualCost");
        const ok = parseReturnInput(atShop, "m2", { actualCost: 1250.5, returnReceivedBy: "สมหญิง", toBranchId: BRANCH_B }, NOW);
        expect(ok.ok && ok.value).toMatchObject({ actualCost: 1250.5, returnReceivedBy: "สมหญิง", toBranchId: BRANCH_B });
        expect(parseReturnInput(atShop, "m2", { actualCost: 0 }, NOW).ok).toBe(true);

        expectError(parseReturnInput(job({ movements: [movement()] }), "m1", { actualCost: 100 }, NOW), "VALIDATION_ERROR", "actualCost");
    });

    it("cannot record a return twice, or for a movement that was handed on", () => {
        const returned = job({ movements: [movement({ returnedAt: "2026-11-13T09:00:00.000Z" })] });
        expectError(parseReturnInput(returned, "m1", {}, NOW), "ALREADY_RETURNED");
        const chained = job({ movements: [movement(), movement({ _id: "m2", toLabel: "ช่างบี" })] });
        expectError(parseReturnInput(chained, "m1", {}, NOW), "NOT_LATEST_MOVEMENT");
        expect(parseReturnInput(chained, "m2", {}, NOW).ok).toBe(true);
        expectError(parseReturnInput(chained, "nope", {}, NOW), "MOVEMENT_NOT_FOUND");
    });

    it("checks the return time and the destination branch", () => {
        const open = job({ movements: [movement()] });
        expectError(parseReturnInput(open, "m1", { returnedAt: "2026-11-13T07:30:00.000Z" }, NOW), "VALIDATION_ERROR", "returnedAt");
        expectError(parseReturnInput(open, "m1", { returnedAt: "2026-11-14T07:30:00.000Z" }, NOW), "VALIDATION_ERROR", "returnedAt");
        expectError(parseReturnInput(open, "m1", { toBranchId: "x" }, NOW), "VALIDATION_ERROR", "toBranchId");
        expectError(parseReturnInput(open, "m1", { sentBy: "x" }, NOW), "VALIDATION_ERROR", "sentBy");
    });
});

describe("custody history helpers", () => {
    it("finds the open outside repair and the movement that can be returned", () => {
        const atShop = movement({ _id: "m2", type: "external_repair" });
        const history = job({ movements: [movement({ returnedAt: "2026-11-13T08:30:00.000Z" }), atShop] });
        expect(openExternalRepair(history)).toBe(atShop);
        expect(returnableMovement(history)).toBe(atShop);
        expect(openExternalRepair(job())).toBeUndefined();
        expect(returnableMovement(job({ movements: [movement({ returnedAt: NOW })] }))).toBeUndefined();
    });

    it("tells returned, open and handed-on movements apart", () => {
        const history = job({ movements: [movement({ _id: "a", returnedAt: NOW }), movement({ _id: "b" }), movement({ _id: "c" })] });
        expect(movementState(history, "a")).toBe("returned");
        expect(movementState(history, "b")).toBe("handed_on");
        expect(movementState(history, "c")).toBe("open");
    });

    it("puts the device back at a branch unless it was handed to the customer", () => {
        const branch = { _id: BRANCH_A, name: "สาขา A" };
        expect(holderAfterReturn(job({ status: "cancelled" }), branch)).toEqual({ kind: "branch", label: "สาขา A", branchId: BRANCH_A });
        expect(holderAfterReturn(job({ status: "completed" }), branch)).toBeNull();
        expect(holderAfterReturn(job({ currentHolder: { kind: "customer", label: "ลูกค้า" } }), branch)).toBeNull();
    });

    it("labels holders", () => {
        expect(holderText({ kind: "external", label: "ร้าน B" })).toBe("ร้านซ่อมภายนอก: ร้าน B");
        expect(holderText(undefined)).toBe("ไม่ระบุ");
        expect(currentHolderLabel(job({ currentHolder: null }))).toBe("ไม่ระบุ");
        expect(currentHolderLabel(job())).toBe("สาขา A");
    });
});
