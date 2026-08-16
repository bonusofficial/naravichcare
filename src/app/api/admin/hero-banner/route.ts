import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import HeroBanner from "@/models/HeroBanner";
import { recordAdminLog } from "@/lib/admin-log";
import { checkPermission } from "@/lib/check-permission";

// Public: the homepage renders this banner for anonymous visitors.
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

export async function PUT(req: NextRequest) {
    try {
        const { authorized, error } = await checkPermission(req, "edit_hero_banner");
        if (!authorized) return error;

        await dbConnect();
        const body = await req.json();
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

        await recordAdminLog({
            req,
            action: "update_hero_banner",
            description: "อัปเดต Hero Banner หน้าแรก",
            targetId: banner._id.toString(),
            targetType: "HeroBanner"
        });

        return NextResponse.json({ success: true, data: banner });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
