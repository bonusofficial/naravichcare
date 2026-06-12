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

export async function PUT(req: Request) {
    try {
        await dbConnect();
        const body = await req.json();
        let doc = await FooterSettings.findOne();
        if (!doc) doc = await FooterSettings.create(body);
        else {
            if (body.description !== undefined) doc.description = body.description;
            if (body.menuTitle !== undefined) doc.menuTitle = body.menuTitle;
            if (body.menuItems !== undefined) doc.menuItems = body.menuItems;
            if (body.contactTitle !== undefined) doc.contactTitle = body.contactTitle;
            if (body.phoneDisplay !== undefined) doc.phoneDisplay = body.phoneDisplay;
            if (body.phoneHref !== undefined) doc.phoneHref = body.phoneHref;
            if (body.emailDisplay !== undefined) doc.emailDisplay = body.emailDisplay;
            if (body.emailHref !== undefined) doc.emailHref = body.emailHref;
            if (body.copyrightText !== undefined) doc.copyrightText = body.copyrightText;
            if (body.poweredByText !== undefined) doc.poweredByText = body.poweredByText;
            await doc.save();
        }
        return NextResponse.json({ success: true, data: doc });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
