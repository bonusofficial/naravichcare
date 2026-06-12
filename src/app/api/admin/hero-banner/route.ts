import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import HeroBanner from "@/models/HeroBanner";

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

export async function PUT(req: Request) {
    try {
        await dbConnect();
        const body = await req.json();
        let banner = await HeroBanner.findOne();
        if (!banner) {
            banner = await HeroBanner.create(body);
        } else {
            Object.assign(banner, body);
            await banner.save();
        }
        return NextResponse.json({ success: true, data: banner });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
