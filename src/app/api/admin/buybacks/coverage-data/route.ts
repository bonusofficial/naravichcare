import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { authErrorResponse, requireAdmin } from "@/lib/admin-auth";
import { differenceInBangkokCalendarDays, parseBahtToSatang } from "@/lib/buyback";
import { getErrorMessage } from "@/lib/buyback-api";
import { recordAdminLog } from "@/lib/admin-log";
import Registration from "@/models/Registration";

export async function GET() {
    try {
        await requireAdmin(["super_admin"]);
        const registrations = await Registration.find({
            status: "approved",
            $or: [
                { "coverageSnapshot.packagePriceSatang": { $exists: false } },
                { "coverageSnapshot.coverageStartAt": { $exists: false } },
                { "coverageSnapshot.coverageEndAt": { $exists: false } },
                { "coverageSnapshot.totalCoverageDays": { $exists: false } },
            ],
        }).select("firstName lastName idCard imei policyNumber packageType devicePrice approvedAt createdAt").sort({ createdAt: -1 }).lean();
        return NextResponse.json({ registrations });
    } catch (error) {
        const auth = authErrorResponse(error);
        return NextResponse.json({ error: auth?.message || getErrorMessage(error) }, { status: auth?.status || 500 });
    }
}

export async function PUT(req: Request) {
    try {
        await requireAdmin(["super_admin"]);
        const body = await req.json();
        if (!mongoose.isValidObjectId(body.registrationId)) return NextResponse.json({ error: "Invalid registration ID" }, { status: 400 });
        const packagePriceSatang = parseBahtToSatang(body.packagePrice);
        if (packagePriceSatang === null) return NextResponse.json({ error: "ราคาแพ็กไม่ถูกต้อง" }, { status: 400 });
        const start = new Date(`${body.coverageStartDate}T00:00:00+07:00`);
        const end = new Date(`${body.coverageEndDate}T00:00:00+07:00`);
        const totalCoverageDays = differenceInBangkokCalendarDays(end, start);
        if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || totalCoverageDays < 1) {
            return NextResponse.json({ error: "ช่วงวันคุ้มครองไม่ถูกต้อง" }, { status: 400 });
        }
        const planName = typeof body.planName === "string" ? body.planName.trim() : "";
        if (!planName) return NextResponse.json({ error: "กรุณาระบุชื่อแพ็ก" }, { status: 400 });
        const registration = await Registration.findByIdAndUpdate(
            body.registrationId,
            {
                $set: {
                    coverageStatus: differenceInBangkokCalendarDays(end, new Date()) > 0 ? "active" : "expired",
                    coverageSnapshot: {
                        planId: body.packageType || undefined,
                        planName,
                        packagePriceSatang,
                        coverageStartAt: start,
                        coverageEndAt: end,
                        totalCoverageDays,
                        snapshottedAt: new Date(),
                    },
                },
            },
            { returnDocument: "after" }
        );
        if (!registration) return NextResponse.json({ error: "ไม่พบแพ็ก" }, { status: 404 });
        await recordAdminLog({ req, action: "repair_coverage_snapshot", description: `แก้ข้อมูลช่วงคุ้มครองแพ็ก ${registration.policyNumber || registration._id}`, targetId: registration._id.toString(), targetType: "Registration", details: { packagePriceSatang, start, end, totalCoverageDays } });
        return NextResponse.json({ success: true });
    } catch (error) {
        const auth = authErrorResponse(error);
        return NextResponse.json({ error: auth?.message || getErrorMessage(error) }, { status: auth?.status || 500 });
    }
}
