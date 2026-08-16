import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { recordAdminLog } from "@/lib/admin-log";
import { checkPermission } from "@/lib/check-permission";
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

// Admin-only. The public homepage reads the banner from /api/hero-banner.
// Restored from 6bd21e5 after the fe993d6 merge gutted the upload handling;
// requireAdmin swapped for checkPermission so custom roles work here too.

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

export async function GET(req: NextRequest) {
    try {
        const { authorized, error } = await checkPermission(req, "edit_hero_banner");
        if (!authorized) return error;

        await dbConnect();
        let banner = await HeroBanner.findOne();
        if (!banner) banner = await HeroBanner.create({});
        return NextResponse.json({ success: true, data: serializeHeroBanner(banner.toObject()) });
    } catch (error: unknown) {
        return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    const newAssets: StoredHeroBannerAsset[] = [];
    try {
        const { authorized, user, error } = await checkPermission(req, "edit_hero_banner");
        if (!authorized) return error;

        await dbConnect();
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
            description: `แก้ไข Hero Banner โดย ${user?.name ?? "ไม่ระบุ"}`,
            targetId: banner._id.toString(),
            targetType: "HeroBanner",
            details: {
                heroImageChanged: Boolean(heroImage || body.resetHeroImage),
                badge2IconChanged: Boolean(badge2Icon || body.resetBadge2Icon),
            },
        }).catch((logError) => console.error("Failed to record Hero Banner admin log:", logError));
        return NextResponse.json({ success: true, data: serializeHeroBanner(banner.toObject()) });
    } catch (error: unknown) {
        // Roll back anything already written to disk before the failure.
        await Promise.allSettled(newAssets.map((asset) => deleteHeroBannerAsset(asset.relativePath)));
        const status = error instanceof HeroBannerImageValidationError ? 400 : 500;
        return NextResponse.json({ error: errorMessage(error) }, { status });
    }
}
