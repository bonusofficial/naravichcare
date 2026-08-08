import { describe, expect, it } from "vitest";
import { DEFAULT_HERO_IMAGE_URL, serializeHeroBanner } from "./hero-banner";
import { resolveHeroBannerStoragePath, saveHeroBannerAsset } from "./hero-banner-storage";

describe("hero banner content", () => {
    it("uses built-in assets when no custom image is configured", () => {
        const result = serializeHeroBanner();
        expect(result.heroImageUrl).toBe(DEFAULT_HERO_IMAGE_URL);
        expect(result.badge2IconUrl).toBeNull();
        expect(result.hasCustomHeroImage).toBe(false);
    });

    it("returns versioned public URLs without exposing storage paths", () => {
        const result = serializeHeroBanner({
            heroImage: { relativePath: "images/private-hero.webp", version: "hero-v1" },
            badge2Icon: { relativePath: "images/private-icon.png", version: "icon-v1" },
        });
        expect(result.heroImageUrl).toBe("/api/hero-banner/image/heroImage?v=hero-v1");
        expect(result.badge2IconUrl).toBe("/api/hero-banner/image/badge2Icon?v=icon-v1");
        expect(JSON.stringify(result)).not.toContain("private-hero.webp");
    });
});

describe("hero banner storage", () => {
    it("blocks absolute paths and traversal", () => {
        expect(() => resolveHeroBannerStoragePath("../outside.webp")).toThrow("escapes configured root");
        expect(() => resolveHeroBannerStoragePath("/tmp/outside.webp")).toThrow("Invalid hero banner storage path");
    });

    it("validates the real file content", async () => {
        const fakeImage = new File(["not an image"], "hero.png", { type: "image/png" });
        await expect(saveHeroBannerAsset(fakeImage, "heroImage")).rejects.toThrow("ไม่ใช่รูปภาพที่ถูกต้อง");
    });

    it("rejects files larger than 10 MB before decoding", async () => {
        const oversized = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "hero.png", { type: "image/png" });
        await expect(saveHeroBannerAsset(oversized, "heroImage")).rejects.toThrow("ไม่เกิน 10 MB");
    });
});
