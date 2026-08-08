import { NextResponse } from "next/server";
import { authErrorResponse, requireAdmin } from "@/lib/admin-auth";
import { recordAdminLog } from "@/lib/admin-log";
import {
    HERO_BANNER_TEXT_FIELDS,
    HERO_IMAGE_POSITIONS,
    serializeHeroBanner,
} from "@/lib/hero-banner";
import {
    deleteHeroBannerAsset,
    HeroBannerImageValidationError,
    saveHeroBannerAsset,
    type StoredHeroBannerAsset,
} from "@/lib/hero-banner-storage";
import HeroBanner from "@/models/HeroBanner";

type RequestPayload = Record<string, unknown>;
type ExistingAsset = { relativePath?: string } | null | undefined;

function asFile(value: FormDataEntryValue | null): File | null {
    return value instanceof File && value.size > 0 ? value : null;
}

async function readPayload(req: Request) {
    if (!req.headers.get("content-type")?.includes("multipart/form-data")) {
        return {
            body: await req.json() as RequestPayload,
            heroImage: null,
            badge2Icon: null,
        };
    }
    const form = await req.formData();
    const raw = String(form.get("data") || "{}");
    let body: RequestPayload;
    try {
        body = JSON.parse(raw) as RequestPayload;
    } catch {
        throw new HeroBannerImageValidationError("ข้อมูล Hero Banner ไม่ถูกต้อง");
    }
    return {
        body,
        heroImage: asFile(form.get("heroImage")),
        badge2Icon: asFile(form.get("badge2Icon")),
    };
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Unexpected error";
}

export async function GET() {
    try {
        await requireAdmin(["admin", "super_admin"]);
        let banner = await HeroBanner.findOne();
        if (!banner) banner = await HeroBanner.create({});
        return NextResponse.json({ success: true, data: serializeHeroBanner(banner.toObject()) });
    } catch (error: unknown) {
        const auth = authErrorResponse(error);
        return NextResponse.json({ error: auth?.message || errorMessage(error) }, { status: auth?.status || 500 });
    }
}

export async function PUT(req: Request) {
    const newAssets: StoredHeroBannerAsset[] = [];
    try {
        const admin = await requireAdmin(["admin", "super_admin"]);
        const { body, heroImage, badge2Icon } = await readPayload(req);
        let banner = await HeroBanner.findOne();
        if (!banner) banner = await HeroBanner.create({});

        for (const field of HERO_BANNER_TEXT_FIELDS) {
            const value = body[field];
            if (value === undefined) continue;
            if (typeof value !== "string" || value.length > 500) {
                return NextResponse.json({ error: `ข้อมูล ${field} ไม่ถูกต้องหรือยาวเกินไป` }, { status: 400 });
            }
            banner.set(field, value.trim());
        }
        if (body.heroImagePosition !== undefined) {
            if (typeof body.heroImagePosition !== "string" || !HERO_IMAGE_POSITIONS.includes(body.heroImagePosition as never)) {
                return NextResponse.json({ error: "ตำแหน่งรูป Hero ไม่ถูกต้อง" }, { status: 400 });
            }
            banner.set("heroImagePosition", body.heroImagePosition);
        }

        const oldHeroImage = banner.get("heroImage") as ExistingAsset;
        const oldBadge2Icon = banner.get("badge2Icon") as ExistingAsset;
        const deleteAfterSave = new Set<string>();

        if (body.resetHeroImage === true) {
            if (oldHeroImage?.relativePath) deleteAfterSave.add(oldHeroImage.relativePath);
            banner.set("heroImage", undefined);
        }
        if (body.resetBadge2Icon === true) {
            if (oldBadge2Icon?.relativePath) deleteAfterSave.add(oldBadge2Icon.relativePath);
            banner.set("badge2Icon", undefined);
        }
        if (heroImage) {
            const stored = await saveHeroBannerAsset(heroImage, "heroImage");
            newAssets.push(stored);
            if (oldHeroImage?.relativePath) deleteAfterSave.add(oldHeroImage.relativePath);
            banner.set("heroImage", stored);
        }
        if (badge2Icon) {
            const stored = await saveHeroBannerAsset(badge2Icon, "badge2Icon");
            newAssets.push(stored);
            if (oldBadge2Icon?.relativePath) deleteAfterSave.add(oldBadge2Icon.relativePath);
            banner.set("badge2Icon", stored);
        }

        await banner.save();
        await Promise.allSettled([...deleteAfterSave].map((relativePath) => deleteHeroBannerAsset(relativePath)));
        await recordAdminLog({
            req,
            action: "update_hero_banner",
            description: `แก้ไข Hero Banner โดย ${admin.name}`,
            targetId: banner._id.toString(),
            targetType: "HeroBanner",
            details: {
                heroImageChanged: Boolean(heroImage || body.resetHeroImage),
                badge2IconChanged: Boolean(badge2Icon || body.resetBadge2Icon),
            },
        }).catch((logError) => console.error("Failed to record Hero Banner admin log:", logError));
        return NextResponse.json({ success: true, data: serializeHeroBanner(banner.toObject()) });
    } catch (error: unknown) {
        await Promise.allSettled(newAssets.map((asset) => deleteHeroBannerAsset(asset.relativePath)));
        const auth = authErrorResponse(error);
        const status = auth?.status || (error instanceof HeroBannerImageValidationError ? 400 : 500);
        return NextResponse.json({ error: auth?.message || errorMessage(error) }, { status });
    }
}
