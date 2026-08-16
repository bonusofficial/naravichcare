import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { serializeHeroBanner } from "@/lib/hero-banner";
import HeroBanner from "@/models/HeroBanner";

export async function GET() {
    try {
        await dbConnect();
        const banner = await HeroBanner.findOne().lean();
        return NextResponse.json({ success: true, data: serializeHeroBanner(banner || undefined) });
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load hero banner" }, { status: 500 });
    }
}
