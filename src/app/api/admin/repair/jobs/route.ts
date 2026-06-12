import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import RepairJob from "@/models/RepairJob";
import RepairCustomer from "@/models/RepairCustomer";
import { recordAdminLog } from "@/lib/admin-log";

export async function GET(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status");
        const query = searchParams.get("q");

        let filter: any = {};
        if (status && status !== "all") {
            filter.status = status;
        }

        if (query) {
            filter.$or = [
                { jobId: { $regex: query, $options: "i" } },
                { imei: { $regex: query, $options: "i" } },
                { serialNumber: { $regex: query, $options: "i" } },
            ];
        }

        const jobs = await RepairJob.find(filter)
            .populate("customer")
            .sort({ createdAt: -1 })
            .limit(100);

        return NextResponse.json(jobs);
    } catch (error) {
        console.error("Fetch RepairJobs Error:", error);
        return NextResponse.json({ error: "Failed to fetch repair jobs" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        await dbConnect();
        const data = await req.json();

        // If customer ID is not provided, we might need to create a new customer
        let customerId = data.customer;
        if (!customerId && data.newCustomer) {
            const customer = await RepairCustomer.create(data.newCustomer);
            customerId = customer._id;
        }

        if (!customerId) {
            return NextResponse.json({ error: "กรุณาระบุข้อมูลลูกค้า (Customer info required)" }, { status: 400 });
        }

        if (!data.brand || !data.deviceModel || !data.reportedSymptom) {
            return NextResponse.json({ 
                error: "กรุณากรอกข้อมูล แบรนด์, รุ่น และอาการเสียให้ครบถ้วน" 
            }, { status: 400 });
        }

        // Job details
        const job = await RepairJob.create({
            ...data,
            customer: customerId,
        });

        // Log the action
        await recordAdminLog({
            req,
            action: "create_repair_job",
            description: `ลงทะเบียนรับเครื่องซ่อมใหม่เลขที่ ${job.jobId} (${job.brand} ${job.deviceModel})`,
            targetId: job._id.toString(),
            targetType: "RepairJob"
        });

        return NextResponse.json(job, { status: 201 });
    } catch (error: any) {
        console.error("Create RepairJob Error:", error);
        return NextResponse.json({ error: error.message || "Failed to create repair job" }, { status: 500 });
    }
}
