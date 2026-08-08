import { describe, expect, it } from "vitest";
import { resolveBuybackStoragePath, saveBuybackImage } from "./buyback-storage";

describe("buyback private storage", () => {
    it("rejects path traversal outside the configured root", () => {
        expect(() => resolveBuybackStoragePath("../outside.pdf")).toThrow("escapes configured root");
        expect(() => resolveBuybackStoragePath("/tmp/outside.pdf")).toThrow("Invalid storage path");
    });

    it("rejects content that is not a real image", async () => {
        const fakeImage = new File(["not an image"], "fake.png", { type: "image/png" });
        await expect(saveBuybackImage(fakeImage, "test-id", "customer-signature", "upload"))
            .rejects.toThrow("ไม่ใช่รูปภาพที่ถูกต้อง");
    });

    it("rejects files over 10 MB before decoding", async () => {
        const oversized = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.png", { type: "image/png" });
        await expect(saveBuybackImage(oversized, "test-id", "payment-proof", "upload"))
            .rejects.toThrow("ไม่เกิน 10 MB");
    });
});
