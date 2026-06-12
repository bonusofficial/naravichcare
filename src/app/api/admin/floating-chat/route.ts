import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import FloatingChat from "@/models/FloatingChat";

const DEFAULT_CONTACTS = [
    { iconType: "facebook", label: "Chat with us", desc: "Facebook Messenger", href: "https://m.me/naravichcare", isActive: true, order: 0 },
    { iconType: "line", label: "Add friend", desc: "@naravichcare", href: "https://line.me/ti/p/naravichcare", isActive: true, order: 1 },
    { iconType: "phone", label: "Call Support", desc: "02-XXX-XXXX", href: "tel:+66XXXXXXXXX", isActive: true, order: 2 },
];

export async function GET() {
    try {
        await dbConnect();
        let doc = await FloatingChat.findOne();
        if (!doc) {
            doc = await FloatingChat.create({ contacts: DEFAULT_CONTACTS });
        }
        return NextResponse.json({ success: true, data: doc });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        await dbConnect();
        const body = await req.json();
        let doc = await FloatingChat.findOne();
        if (!doc) {
            doc = await FloatingChat.create(body);
        } else {
            Object.assign(doc, body);
            await doc.save();
        }
        return NextResponse.json({ success: true, data: doc });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
