import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Registration from "@/models/Registration";
import { checkPermission } from "@/lib/check-permission";
import { recordAdminLog } from "@/lib/admin-log";

const EDITABLE_FIELDS = [
    "salePrice",
    "packageCost",
    "agentCommission",
    "otherExpenses",
] as const;

// PATCH /api/admin/profit-report/[id] - correct the money on a single sale.
// The approval route only fills these in when they are blank, so corrections
// made here are not overwritten later.
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { authorized, user, error } = await checkPermission(req, "edit_profit_data");
        if (!authorized) return error;

        await connectToDatabase();
        const { id } = await params;
        const body = await req.json();

        const registration = await Registration.findById(id);
        if (!registration) {
            return NextResponse.json({ message: "Registration not found" }, { status: 404 });
        }

        const before: Record<string, number> = {};
        const after: Record<string, number> = {};

        for (const field of EDITABLE_FIELDS) {
            if (body[field] === undefined) continue;
            const value = Number(body[field]);
            if (Number.isNaN(value) || value < 0) {
                return NextResponse.json(
                    { message: `ค่าของ ${field} ไม่ถูกต้อง` },
                    { status: 400 }
                );
            }
            before[field] = registration[field] || 0;
            after[field] = value;
            registration[field] = value;
        }

        // save() so the pre-save hook recomputes totalCost/netProfit/profitMargin.
        await registration.save();

        // Money was changed by hand, so this has to be auditable.
        await recordAdminLog({
            req,
            action: "update_profit_data",
            description: `แก้ไขตัวเลขต้นทุน/กำไรของ ${registration.firstName} ${registration.lastName} (${registration.policyNumber || id})`,
            targetId: id,
            targetType: "Registration",
            details: { before, after, netProfit: registration.netProfit },
        });

        return NextResponse.json({ success: true, data: registration });
    } catch (error: any) {
        console.error("Update profit data error:", error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
