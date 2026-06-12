import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import AdminLog from "@/models/AdminLog";

export async function GET(req: Request) {
    try {
        await dbConnect();

        // Get query parameters for pagination or filtering if needed
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get("limit") || "50");
        const page = parseInt(searchParams.get("page") || "1");
        const skip = (page - 1) * limit;

        const logs = await AdminLog.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await AdminLog.countDocuments();

        return NextResponse.json({
            success: true,
            data: logs,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
