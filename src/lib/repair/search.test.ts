import { describe, expect, it } from "vitest";
import { customerSearchFilter, escapeRegex, phoneSearchPattern } from "./search";

type Clause = { $or: Record<string, { $regex: string }>[] };

const matches = (clause: Clause, field: string, value: string) =>
    clause.$or.some((entry) => entry[field] && new RegExp(entry[field].$regex, "i").test(value));

describe("customerSearchFilter", () => {
    it("matches one word against either name, the phone or the customer id", () => {
        const filter = customerSearchFilter("ทเวลฟ์เทสรับซ่อม") as Clause;
        expect(matches(filter, "firstName", "ทเวลฟ์เทสรับซ่อม")).toBe(true);
        expect(matches(filter, "lastName", "ทเวลฟ์เทสรับซ่อม")).toBe(true);
        expect(matches(customerSearchFilter("CUS00004") as Clause, "customerId", "CUS00004")).toBe(true);
    });

    it("needs every word of a full name to match", () => {
        const filter = customerSearchFilter("  ทเวลฟ์เทสรับซ่อม   ทเวลฟ์เทสคุณคลัง ") as { $and: Clause[] };
        expect(filter.$and).toHaveLength(2);
        expect(matches(filter.$and[0], "firstName", "ทเวลฟ์เทสรับซ่อม")).toBe(true);
        expect(matches(filter.$and[1], "lastName", "ทเวลฟ์เทสคุณคลัง")).toBe(true);
    });

    it("finds a phone number written with or without separators", () => {
        const plain = customerSearchFilter("0812345678") as Clause;
        expect(matches(plain, "phone", "081-234-5678")).toBe(true);
        expect(matches(plain, "phone", "0812345678")).toBe(true);
        const dashed = customerSearchFilter("081-234-5678") as Clause;
        expect(matches(dashed, "phone", "0812345678")).toBe(true);
        expect(phoneSearchPattern("081 234 5678")).not.toBeNull();
        expect(phoneSearchPattern("ab")).toBeNull();
    });

    it("treats regex characters literally and ignores empty text", () => {
        expect(escapeRegex("a.*(b)")).toBe("a\\.\\*\\(b\\)");
        const filter = customerSearchFilter(".*") as Clause;
        expect(matches(filter, "firstName", "สมชาย")).toBe(false);
        expect(customerSearchFilter("   ")).toBeNull();
    });
});
