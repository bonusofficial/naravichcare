import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Package from "@/models/Package";
import { recordAdminLog } from "@/lib/admin-log";
import { checkPermission } from "@/lib/check-permission";

// Public: the homepage pricing section and /check-policy read this while
// logged out. Gating it made those sections silently render empty.
export async function GET() {
    try {
        await connectToDatabase();
        const packages = await Package.find({}).sort({ order: 1 });
        return NextResponse.json(packages);
    } catch (error: any) {
        console.error("Failed to fetch packages:", error);
        return NextResponse.json({ message: "Failed to fetch packages", error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { authorized, user, error } = await checkPermission(req, "create_packages");
        if (!authorized) return error;

        await connectToDatabase();
        const body = await req.json();
        const newPackage = await Package.create(body);

        await recordAdminLog({
            req,
            action: "create_package",
            description: `สร้างแพ็กเกจใหม่: ${body.name || 'ไม่ระบุชื่อ'}`,
            targetId: newPackage._id.toString(),
            targetType: "Package"
        });

        return NextResponse.json(newPackage, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ message: "Failed to create package", error: error.message }, { status: 500 });
    }
}
