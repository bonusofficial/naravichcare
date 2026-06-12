import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import TermsPage from "@/models/TermsPage";

const DEFAULT_TERMS = [
    {
        title: "เงื่อนไขการสมัครแพ็กเกจ",
        content: `• ต้องสมัครภายใน 30 วันนับจากวันที่ซื้ออุปกรณ์\n• อุปกรณ์ต้องอยู่ในสภาพที่ดีก่อนสมัคร ไม่มีรอยแตก หน้าจอเสียหาย หรือน้ำเข้า\n• ต้องลงทะเบียนด้วยหมายเลข IMEI ของอุปกรณ์จริง\n• 1 เลขประจำตัวประชาชน สามารถสมัครได้สูงสุด 3 อุปกรณ์\n• แพ็กเกจไม่สามารถโอนสิทธิ์ให้ผู้อื่นได้`,
        order: 0, isActive: true,
    },
    {
        title: "แพ็กเกจ Naravich Mobile Care MAX | Apple Care Service (เฉพาะ Apple)",
        content: `• คุ้มครองอุบัติเหตุจากการตกหล่น แตกหัก น้ำเข้า และไฟไหม้\n• เปลี่ยนเครื่องใหม่ได้สูงสุด 2 ครั้ง (Device Swap) ภายในประเทศเท่านั้น\n• รับเครื่องทดแทนได้ 1 ครั้ง (Replacement) ภายในประเทศ\n• ซ่อมอุบัติเหตุไม่จำกัดจำนวนครั้ง บริการด้าน Hardware ไม่จำกัดครั้ง\n• กรณีแบตเตอรี่ต่ำกว่า 80% เปลี่ยนได้ตลอดอายุแพ็กเกจ\n• รับบริการที่ Apple Store และ Apple Authorized Service Provider ทั่วโลก`,
        order: 1, isActive: true,
    },
    {
        title: "แพ็กเกจ Naravich Mobile Care Standard (Full Coverage)",
        content: `• คุ้มครองอุบัติเหตุจากการตกหล่น แตกหัก และน้ำเข้า\n• ซ่อมอุบัติเหตุได้ไม่จำกัดจำนวนครั้งตลอดอายุแพ็กเกจ\n• บริการรับ-ส่งอุปกรณ์ถึงบ้าน (Door to Door)\n• ค่าซ่อมส่วนเกิน (Deductible) ขึ้นอยู่กับประเภทความเสียหาย\n• ไม่คุ้มครองกรณีสูญหาย หรือถูกขโมย`,
        order: 2, isActive: true,
    },
    {
        title: "แพ็กเกจบริการดูแลหน้าจอ (Screen Only)",
        content: `• คุ้มครองเฉพาะความเสียหายของหน้าจอจากอุบัติเหตุ\n• ซ่อมหน้าจอได้สูงสุด 2 ครั้งตลอดอายุแพ็กเกจ\n• ค่า Deductible สำหรับการซ่อมหน้าจอ 1,000 บาทต่อครั้ง\n• ไม่ครอบคลุมความเสียหายของตัวเครื่อง น้ำเข้า หรืออุบัติเหตุอื่น`,
        order: 3, isActive: true,
    },
];

export async function GET() {
    try {
        await dbConnect();
        let page = await TermsPage.findOne();
        if (!page) {
            page = await TermsPage.create({ items: DEFAULT_TERMS });
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
        let page = await TermsPage.findOne();
        if (!page) {
            page = await TermsPage.create({ items: body.items });
        } else {
            page.items = body.items;
            await page.save();
        }
        return NextResponse.json({ success: true, data: page });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
