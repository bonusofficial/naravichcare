import { NextRequest, NextResponse } from "next/server"; // Re-sync schema
import dbConnect from "@/lib/mongodb";
import CoveragePlan from "@/models/CoveragePlan";
import { recordAdminLog } from "@/lib/admin-log";
import { checkPermission } from "@/lib/check-permission";

// Public: the registration flow (step 3) reads coverage plans before login.
export async function GET() {
    try {
        await dbConnect();
        const plans = await CoveragePlan.find({}).sort({ order: 1 });
        return NextResponse.json(plans);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { authorized, error } = await checkPermission(req, "edit_coverage_plans");
        if (!authorized) return error;

        await dbConnect();
        const body = await req.json();
        if (!Number.isInteger(Number(body.coverageDurationMonths)) || Number(body.coverageDurationMonths) < 1) {
            return NextResponse.json({ error: "กรุณาระบุระยะเวลาคุ้มครองเป็นจำนวนเดือน" }, { status: 400 });
        }
        if (!isCoveragePlanDeviceType(body.deviceType)) {
            return NextResponse.json({ error: "กรุณาเลือกประเภทอุปกรณ์ที่ถูกต้อง" }, { status: 400 });
        }
        body.coverageDurationMonths = Number(body.coverageDurationMonths);
        const plan = await CoveragePlan.create(body);

        await recordAdminLog({
            req,
            action: "create_coverage_plan",
            description: `สร้างแผนความคุ้มครองใหม่: ${body.name || 'ไม่ระบุชื่อ'}`,
            targetId: plan._id.toString(),
            targetType: "CoveragePlan"
        });

        return NextResponse.json(plan, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
