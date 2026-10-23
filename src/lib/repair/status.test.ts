import { describe, expect, it } from "vitest";
import { canTransition, POS_STATUS_MAP, REPAIR_STATUSES, STATUS_TRANSITIONS, toPosStatus } from "./status";

describe("repair status state machine", () => {
    it("defines transitions for every status and only to known statuses", () => {
        for (const status of REPAIR_STATUSES) {
            expect(STATUS_TRANSITIONS[status]).toBeDefined();
            for (const next of STATUS_TRANSITIONS[status]) expect(REPAIR_STATUSES).toContain(next);
        }
    });

    it("treats completed and cancelled as terminal", () => {
        for (const to of REPAIR_STATUSES) {
            expect(canTransition("completed", to)).toBe(false);
            expect(canTransition("cancelled", to)).toBe(false);
        }
    });

    it.each([
        ["pending", "checking"],
        ["pending", "in_progress"],
        ["checking", "quoted"],
        ["quoted", "waiting_approval"],
        ["waiting_approval", "in_progress"],
        ["in_progress", "waiting_parts"],
        ["waiting_parts", "in_progress"],
        ["in_progress", "testing"],
        ["testing", "ready_pickup"],
        ["in_progress", "ready_pickup"],
        ["ready_pickup", "completed"],
        ["ready_pickup", "in_progress"],
        ["pending", "cancelled"],
        ["testing", "cancelled"],
    ])("allows %s -> %s", (from, to) => {
        expect(canTransition(from, to)).toBe(true);
    });

    it.each([
        ["pending", "completed"],
        ["pending", "ready_pickup"],
        ["checking", "completed"],
        ["waiting_parts", "ready_pickup"],
        ["ready_pickup", "cancelled"],
        ["completed", "in_progress"],
        ["cancelled", "pending"],
        ["pending", "pending"],
        ["pending", "bogus"],
        ["bogus", "pending"],
    ])("rejects %s -> %s", (from, to) => {
        expect(canTransition(from, to)).toBe(false);
    });

    it("only reaches completed through ready_pickup", () => {
        const into = REPAIR_STATUSES.filter((from) => STATUS_TRANSITIONS[from].includes("completed"));
        expect(into).toEqual(["ready_pickup"]);
    });
});

describe("POS status mapping", () => {
    it.each([
        ["pending", "sent"],
        ["checking", "repairing"],
        ["quoted", "repairing"],
        ["waiting_approval", "repairing"],
        ["in_progress", "repairing"],
        ["waiting_parts", "repairing"],
        ["testing", "repairing"],
        ["ready_pickup", "completed"],
        ["completed", "completed"],
        ["cancelled", "cancelled"],
    ])("maps %s to %s", (status, pos) => {
        expect(toPosStatus(status)).toBe(pos);
    });

    it("covers every repair status with a value the POS RepairStatus enum accepts", () => {
        const posEnum = ["pending_sync", "sent", "repairing", "completed", "failed", "cancelled"];
        for (const status of REPAIR_STATUSES) expect(posEnum).toContain(POS_STATUS_MAP[status]);
    });
});
