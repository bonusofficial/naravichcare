import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Registration from "@/models/Registration";
import { recordAdminLog } from "@/lib/admin-log";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await connectToDatabase();
        const registration = await Registration.findById(id).lean();
        if (!registration) return NextResponse.json({ message: "Not found" }, { status: 404 });
        return NextResponse.json({ success: true, data: registration }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await connectToDatabase();
        const registration = await Registration.findById(id);
        if (!registration) return NextResponse.json({ message: "Not found" }, { status: 404 });

        await Registration.findByIdAndDelete(id);

        await recordAdminLog({
            req,
            action: "delete_registration",
            description: `ลบการลงทะเบียนของ ${registration.firstName} ${registration.lastName} (ID: ${id})`,
            targetId: id,
            targetType: "Registration"
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
