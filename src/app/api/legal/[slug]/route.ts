import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import LegalPage from "@/models/LegalPage";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        if (!slug || !["privacy", "terms"].includes(slug)) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        await dbConnect();
        let page = await LegalPage.findOne({ slug });
        if (!page) {
            const defaults: Record<string, { title: string; content: string }> = {
                privacy: {
                    title: "นโยบายความเป็นส่วนตัว",
                    content: "เนื้อหานโยบายความเป็นส่วนตัว — แก้ไขได้จากหลังบ้าน Admin > นโยบาย & เงื่อนไข",
                },
                terms: {
                    title: "เงื่อนไขการใช้บริการ",
                    content: "เนื้อหาเงื่อนไขการใช้บริการ — แก้ไขได้จากหลังบ้าน Admin > นโยบาย & เงื่อนไข",
                },
            };
            const d = defaults[slug];
            page = await LegalPage.create({ slug, title: d.title, content: d.content });
        }
        return NextResponse.json({ success: true, data: page });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
