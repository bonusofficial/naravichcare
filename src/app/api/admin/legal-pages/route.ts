import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import LegalPage from "@/models/LegalPage";

export async function GET() {
    try {
        await dbConnect();
        const pages = await LegalPage.find({ slug: { $in: ["privacy", "terms"] } });
        const privacy = pages.find(p => p.slug === "privacy") || await ensurePage("privacy", "นโยบายความเป็นส่วนตัว", "เนื้อหานโยบายความเป็นส่วนตัว — แก้ไขได้จากหลังบ้าน");
        const terms = pages.find(p => p.slug === "terms") || await ensurePage("terms", "เงื่อนไขการใช้บริการ", "เนื้อหาเงื่อนไขการใช้บริการ — แก้ไขได้จากหลังบ้าน");
        return NextResponse.json({
            success: true,
            data: {
                privacy: { title: privacy.title, content: privacy.content },
                terms: { title: terms.title, content: terms.content },
            },
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function ensurePage(slug: string, title: string, content: string) {
    let page = await LegalPage.findOne({ slug });
    if (!page) page = await LegalPage.create({ slug, title, content });
    return page;
}

export async function PUT(req: Request) {
    try {
        await dbConnect();
        const body = await req.json();
        const { privacy, terms } = body;

        if (privacy) {
            await LegalPage.findOneAndUpdate(
                { slug: "privacy" },
                { slug: "privacy", title: privacy.title ?? "", content: privacy.content ?? "" },
                { upsert: true, new: true }
            );
        }
        if (terms) {
            await LegalPage.findOneAndUpdate(
                { slug: "terms" },
                { slug: "terms", title: terms.title ?? "", content: terms.content ?? "" },
                { upsert: true, new: true }
            );
        }

        const pages = await LegalPage.find({ slug: { $in: ["privacy", "terms"] } });
        const p = pages.find(x => x.slug === "privacy");
        const t = pages.find(x => x.slug === "terms");
        return NextResponse.json({
            success: true,
            data: {
                privacy: { title: p?.title ?? "", content: p?.content ?? "" },
                terms: { title: t?.title ?? "", content: t?.content ?? "" },
            },
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
