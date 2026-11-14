import { afterEach, describe, expect, it, vi } from "vitest";
import { buildRepairStatusNotification, sendLineFlexMessage } from "./line-messaging";

const env = { ...process.env };
afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...env };
});

const job = {
    _id: "665f00000000000000000001",
    jobId: "JOB2611-0004",
    brand: "Apple",
    deviceModel: "iPhone 13",
    status: "ready_pickup",
    customer: { customerId: "CUS00004", firstName: "ทเวลฟ์เทสรับซ่อม", lastName: "ทเวลฟ์เทสคุณคลัง", phone: "000-000-7196", lineId: "twelve.test" },
    branchId: { name: "น้ำยืน" },
};

const texts = (value: unknown): string[] => JSON.stringify(value).match(/"text":"[^"]*"/g)?.map((t) => t.slice(8, -1)) ?? [];

describe("buildRepairStatusNotification", () => {
    it("puts the job id and the customer's name, phone and LINE ID in the message", () => {
        const { messages, meta } = buildRepairStatusNotification(job, "ซ่อมเสร็จ/รอรับคืน", "#3B82F6");
        const shown = texts(messages);
        for (const value of ["JOB2611-0004", "ทเวลฟ์เทสรับซ่อม ทเวลฟ์เทสคุณคลัง", "000-000-7196", "twelve.test", "น้ำยืน", "ซ่อมเสร็จ/รอรับคืน"]) {
            expect(shown).toContain(value);
        }
        expect(messages[0].altText).toContain("000-000-7196");
        expect(meta).toMatchObject({
            event: "repair_status_changed",
            jobId: "JOB2611-0004",
            status: "ready_pickup",
            customer: { customerId: "CUS00004", phone: "000-000-7196", lineId: "twelve.test" },
        });
    });

    it("labels the admin link for staff and offers a call button with a clean number", () => {
        const { messages } = buildRepairStatusNotification(job, "x", "#000");
        const footer = JSON.stringify(messages[0].contents);
        expect(footer).toContain("เปิดใบงาน (พนักงาน)");
        expect(footer).toContain("tel:0000007196");
        expect(footer).not.toContain("ตรวจสถานะออนไลน์");
    });

    it("handles a store-owned job and an unpopulated customer", () => {
        const store = buildRepairStatusNotification({ ...job, customer: null }, "x", "#000");
        expect(texts(store.messages)).toContain("เครื่องของร้าน");
        expect(store.meta.customer).toBeNull();
        const unpopulated = buildRepairStatusNotification({ ...job, customer: "665f00000000000000000002" }, "x", "#000");
        expect(unpopulated.meta.customer).toBeNull();
        expect(JSON.stringify(unpopulated.messages)).not.toContain("tel:");
    });
});

describe("sendLineFlexMessage", () => {
    const capture = () => {
        process.env.LINE_PORTAL_NOTIFY_URL = "https://line-portal.example/notify/site";
        process.env.LINE_PORTAL_API_TOKEN = "secret";
        const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
        vi.stubGlobal("fetch", fetchMock);
        return () => JSON.parse(fetchMock.mock.calls[0][1].body);
    };

    it("keeps the portal request to { messages } by default", async () => {
        const body = capture();
        delete process.env.LINE_PORTAL_SEND_RECIPIENT;
        await sendLineFlexMessage(job, "x", "#000");
        expect(Object.keys(body())).toEqual(["messages"]);
    });

    it("adds the recipient block when LINE_PORTAL_SEND_RECIPIENT=true", async () => {
        const body = capture();
        process.env.LINE_PORTAL_SEND_RECIPIENT = "true";
        await sendLineFlexMessage(job, "x", "#000");
        expect(body().recipient.customer.phone).toBe("000-000-7196");
        expect(body().messages).toHaveLength(1);
    });
});
