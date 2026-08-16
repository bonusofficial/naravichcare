import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Insurance from "@/models/Insurance";
import Loan from "@/models/Loan";
import { checkPermission } from "@/lib/check-permission";

export async function GET(req: NextRequest) {
    try {
        const { authorized, error } = await checkPermission(req, "view_insurance");
        if (!authorized) return error;

        await dbConnect();
        // Populate with loan details to get customer name and imei
        const policies = await Insurance.find()
            .populate({
                path: 'loanId',
                select: 'customerName deviceModel imei'
            })
            .sort({ createdAt: -1 });

        return NextResponse.json({ success: true, policies });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
