import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Package from "@/models/Package";
import { recordAdminLog } from "@/lib/admin-log";
import { checkPermission } from "@/lib/check-permission";

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { authorized, user, error } = await checkPermission(req, "edit_packages");
        if (!authorized) return error;

        await connectToDatabase();
        const { id } = await params;
        const body = await req.json();
        const updatedPackage = await Package.findByIdAndUpdate(id, body, { new: true });

        await recordAdminLog({
            req,
            action: "update_package",
            description: `อัปเดตแพ็กเกจ: ${body.name || updatedPackage?.name || id}`,
            targetId: id,
            targetType: "Package",
            details: body
        });

        return NextResponse.json(updatedPackage);
    } catch (error: any) {
        return NextResponse.json({ message: "Failed to update package", error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { authorized, user, error } = await checkPermission(req, "delete_packages");
        if (!authorized) return error;

        await connectToDatabase();
        const { id } = await params;
        const pkg = await Package.findById(id);
        await Package.findByIdAndDelete(id);

        await recordAdminLog({
            req,
            action: "delete_package",
            description: `ลบแพ็กเกจ: ${pkg?.name || id}`,
            targetId: id,
            targetType: "Package"
        });

        return NextResponse.json({ message: "Package deleted successfully" });
    } catch (error: any) {
        return NextResponse.json({ message: "Failed to delete package", error: error.message }, { status: 500 });
    }
}
