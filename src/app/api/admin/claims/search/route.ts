import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Registration from "@/models/Registration";
import CoveragePlan from "@/models/CoveragePlan";
import Claim from "@/models/Claim";

export async function POST(req: Request) {
    try {
        await dbConnect();
        const { query } = await req.json();

        if (!query || query.trim().length === 0) {
            return NextResponse.json({ error: "ระบุข้อความสำหรับค้นหา" }, { status: 400 });
        }

        // ค้นหาจาก IMEI หรือ เลขบัตรประชาชน แบบตรงๆ
        const cleanQuery = query.trim();
        // Optimized lookup
        const registration = await Registration.findOne({
            $or: [
                { imei: cleanQuery },
                { idCard: cleanQuery }
            ]
        })
            .select("firstName lastName imei idCard brand model policyNumber packageType status approvedAt createdAt")
            .sort({ createdAt: -1 })
            .lean();

        if (!registration) {
            return NextResponse.json({ error: "ไม่พบข้อมูลในระบบ หรือไม่มีกรมธรรม์ที่เปิดใช้งานอยู่" }, { status: 404 });
        }

        if (registration.status !== "approved") {
            return NextResponse.json({
                error: "ประกันของลูกค้ายังไม่ได้รับการอนุมัติ สถานะปัจจุบัน: " + registration.status
            }, { status: 403 });
        }

        // Parallel execution for remaining data
        const [coveragePlan, previousClaims, draftClaim] = await Promise.all([
            CoveragePlan.findById(registration.packageType).lean(),
            Claim.find({
                registrationId: registration._id,
                status: "completed"
            }).select("consumedQuotaName status").lean(),
            Claim.findOne({
                registrationId: registration._id,
                status: "draft"
            }).sort({ updatedAt: -1 }).lean()
        ]);

        return NextResponse.json({
            success: true,
            data: {
                ...registration,
                coveragePlan: coveragePlan || null,
                previousClaims: previousClaims || [],
                draftClaim: draftClaim || null
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
