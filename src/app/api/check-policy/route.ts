import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Registration from "@/models/Registration";

export async function POST(req: Request) {
    try {
        await dbConnect();
        const { searchType, searchValue } = await req.json();

        if (!searchValue) {
            return NextResponse.json({ error: "กรุณาระบุข้อมูลสำหรับค้นหา" }, { status: 400 });
        }

        let query = {};
        if (searchType === "idCard") {
            query = { idCard: searchValue };
        } else if (searchType === "imei") {
            query = { imei: searchValue };
        } else {
            return NextResponse.json({ error: "ประเภทการค้นหาไม่ถูกต้อง" }, { status: 400 });
        }

        const registration = await Registration.findOne(query).sort({ createdAt: -1 });

        if (!registration) {
            return NextResponse.json({ error: "ไม่พบข้อมูลการลงทะเบียนในระบบ" }, { status: 404 });
        }

        if (registration.status !== "approved") {
            return NextResponse.json({
                error: "ไม่สามารถดาวน์โหลดกรมธรรม์ได้เนื่องจากสถานะปัจจุบันคือ: " +
                    (registration.status === "paid" ? "ชำระเงินแล้ว (รอแอดมินอนุมัติ)" : "รอการชำระเงิน")
            }, { status: 403 });
        }

        return NextResponse.json({
            success: true,
            data: registration
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
