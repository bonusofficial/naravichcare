import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import HeroBanner from "@/models/HeroBanner";
import { recordAdminLog } from "@/lib/admin-log";
import { checkPermission } from "@/lib/check-permission";

// Public: the homepage renders this banner for anonymous visitors.
export async function GET() {
    try {
        await dbConnect();
        let banner = await HeroBanner.findOne();
        if (!banner) {
            banner = await HeroBanner.create({});
        }
        return NextResponse.json({ success: true, data: banner });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const { authorized, error } = await checkPermission(req, "edit_hero_banner");
        if (!authorized) return error;

        await dbConnect();
        const body = await req.json();
        let banner = await HeroBanner.findOne();
        if (!banner) {
            banner = await HeroBanner.create(body);
        } else {
            Object.assign(banner, body);
            await banner.save();
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
