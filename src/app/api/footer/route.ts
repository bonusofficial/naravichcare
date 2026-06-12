import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import FooterSettings from "@/models/FooterSettings";

export async function GET() {
    try {
        await dbConnect();
        let doc = await FooterSettings.findOne();
        if (!doc) doc = await FooterSettings.create({});
        return NextResponse.json({ success: true, data: doc });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
