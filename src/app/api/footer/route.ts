import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import FooterSettings from "@/models/FooterSettings";
import { getErrorMessage } from "@/lib/errors";

export async function GET() {
    try {
        await dbConnect();
        let doc = await FooterSettings.findOne();
        if (!doc) doc = await FooterSettings.create({});
        return NextResponse.json({ success: true, data: doc });
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}
