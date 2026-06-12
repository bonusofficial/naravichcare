import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import ServiceRequestPage from "@/models/ServiceRequestPage";

const DEFAULT_ROWS = [
    {
        request: "ภายในวัน (Same day)",
        delivery: "เจ้าหน้าที่เข้ารับภายในวัน",
        area: "กรุงเทพมหานคร, สมุทรปราการ, นนทบุรี, ปทุมธานี, มหาชัย, สาลาคาม",
        shade: false,
        order: 0
    },
    {
        request: "ขอรับบริการเวลา\n8.00 - 14.00 น.",
        delivery: "เจ้าหน้าที่เข้ารับเครื่องในวันตัดไป",
        area: "กรุงเทพมหานคร และปริมณฑล",
        shade: true,
        order: 1
    },
    {
        request: "ขอรับบริการ 8.00 - 14.00 น.\n(พื้นที่ต่างจังหวัด)",
        delivery: "เจ้าหน้าที่เข้ารับเครื่องภายใน 2-3 วันทำการ",
        area: "ภาคเหนือ : เชียงใหม่, ลำพูน, เชียงราย, พะเยา, น่าน, แพร่, ตาก, สุโขทัย, อุตรดิตถ์, พิษณุโลก, กำแพงเพชร และพิจิตร\nภาคกลาง : ลพบุรี, สิงห์บุรี, ชัยนาท, นครสวรรค์, อุทัยธานี, สุพรรณบุรี และอ่างทอง\nภาคตะวันออก : ชลบุรี, ระยอง, สระแก้ว, ปราจีนบุรี, จันทบุรี และตราด\nภาคตะวันตก : ราชบุรี, กาญจนบุรี, เพชรบุรี และประจวบคีรีขันธ์",
        shade: false,
        order: 2
    },
    {
        request: "ขอรับบริการ 8.00 - 14.00 น.\n(พื้นที่ห่างไกล)",
        delivery: "เจ้าหน้าที่เข้ารับเครื่องภายใน 3-5 วันทำการ",
        area: "แม่ฮ่องสอน, ยะลา, ปัตตานี, นราธิวาส เกาะต่างๆ (เกาะสมุย, เกาะพะงัน, เกาะเต้า, เกาะช้าง เป็นต้น)",
        shade: true,
        order: 3
    }
];

export async function GET() {
    try {
        await dbConnect();
        let page = await ServiceRequestPage.findOne();
        if (!page) {
            page = await ServiceRequestPage.create({ rows: DEFAULT_ROWS });
        }
        return NextResponse.json({ success: true, data: page });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        await dbConnect();
        const body = await req.json();
        let page = await ServiceRequestPage.findOne();
        if (!page) {
            page = await ServiceRequestPage.create(body);
        } else {
            // Update fields
            if (body.title) page.title = body.title;
            if (body.subtitle) page.subtitle = body.subtitle;
            if (body.columns) page.columns = body.columns;
            if (body.rows) page.rows = body.rows;
            if (body.footer) page.footer = body.footer;
            await page.save();
        }
        return NextResponse.json({ success: true, data: page });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
