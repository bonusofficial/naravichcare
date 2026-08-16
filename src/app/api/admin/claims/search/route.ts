import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Registration from "@/models/Registration";
import CoveragePlan from "@/models/CoveragePlan";
import Claim from "@/models/Claim";
import { checkPermission } from "@/lib/check-permission";

export async function POST(req: NextRequest) {
    try {
        const { authorized, error } = await checkPermission(req, "view_claims");
        if (!authorized) return error;

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
            .select("firstName lastName imei idCard brand model policyNumber packageType status coverageStatus coverageSnapshot.coverageEndAt approvedAt createdAt")
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

        const expiredByDate = registration.coverageSnapshot?.coverageEndAt && new Date(registration.coverageSnapshot.coverageEndAt).getTime() <= Date.now();
        if (registration.coverageStatus === "bought_back" || registration.coverageStatus === "expired" || expiredByDate) {
            return NextResponse.json({ error: "สิทธิ์แพ็กคุ้มครองสิ้นสุดแล้ว" }, { status: 409 });
        }
        const buybackLock = await Buyback.findOne({
            registrationId: registration._id,
            status: { $in: ["pending_approval", "processing", "approved"] },
        }).select("status").lean();
        if (buybackLock) {
            return NextResponse.json({ error: "แพ็กอยู่ระหว่างหรือเสร็จสิ้นการซื้อคืน ไม่สามารถเปิดเคลมได้", buybackStatus: buybackLock.status }, { status: 409 });
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
