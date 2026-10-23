import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import RepairJob from "@/models/RepairJob";
import RepairCustomer from "@/models/RepairCustomer";
import { recordAdminLog } from "@/lib/admin-log";
import { checkPermission } from "@/lib/check-permission";
import { assertClaimEligible, ClaimEligibilityError } from "@/lib/claim-eligibility";
import { AdminValidationError, parseAdminCreate } from "@/lib/repair/admin-validation";
import { saveNewRepairJob } from "@/lib/repair/service";
import { isRepairStatus } from "@/lib/repair/status";

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: NextRequest) {
    try {
        const { authorized, error } = await checkPermission(req, "view_repair_jobs");
        if (!authorized) return error;

        await dbConnect();
        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status");
        const query = searchParams.get("q")?.trim().slice(0, 100);

        const filter: Record<string, unknown> = {};
        if (status && status !== "all" && isRepairStatus(status)) {
            filter.status = status;
        }

        if (query) {
            // Escaped: the search text is matched literally, never run as a pattern.
            const pattern = { $regex: escapeRegex(query), $options: "i" };
            filter.$or = [
                { jobId: pattern },
                { imei: pattern },
                { serialNumber: pattern },
                { externalRef: pattern },
                { "integration.productCode": pattern },
            ];
        }

        const jobs = await RepairJob.find(filter)
            .select("-photosBefore -photosAfter")
            .populate("customer")
            .sort({ createdAt: -1 })
            .limit(100);

        return NextResponse.json(jobs);
    } catch (error) {
        console.error("Fetch RepairJobs Error:", error);
        return NextResponse.json({ error: "Failed to fetch repair jobs" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { authorized, error, user } = await checkPermission(req, "create_repair_jobs");
        if (!authorized) return error;

        await dbConnect();
        const body = await req.json().catch(() => null);
        if (!body || typeof body !== "object" || Array.isArray(body)) {
            return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
        }
        const input = parseAdminCreate(body);

        if (input.job.jobType === "claim") await assertClaimEligible({ imei: input.job.imei as string });

        let customerId = input.customerId;
        if (customerId && !(await RepairCustomer.exists({ _id: customerId }))) {
            return NextResponse.json({ error: "ไม่พบข้อมูลลูกค้า" }, { status: 400 });
        }
        if (!customerId && input.newCustomer) {
            const customer = await RepairCustomer.create(input.newCustomer);
            customerId = String(customer._id);
        }

        const now = new Date();
        const job = await saveNewRepairJob({
            ...input.job,
            customer: customerId,
            receivedAt: now,
            statusHistory: [{
                status: "pending",
                changedBy: user.username,
                actorType: "admin",
                actorId: String(user._id),
                changedAt: now,
                note: "สร้างใบรับซ่อม",
            }],
        });

        // Log the action
        await recordAdminLog({
            req,
            actor: { id: String(user._id), name: user.username },
            action: "create_repair_job",
            description: `ลงทะเบียนรับเครื่องซ่อมใหม่เลขที่ ${job.jobId} (${job.brand} ${job.deviceModel})`,
            targetId: job._id.toString(),
            targetType: "RepairJob"
        });

        return NextResponse.json(job, { status: 201 });
    } catch (error: unknown) {
        if (error instanceof AdminValidationError) return NextResponse.json({ error: error.message, code: "VALIDATION_ERROR", fields: error.fields }, { status: 400 });
        if (error instanceof ClaimEligibilityError) return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
        console.error("Create RepairJob Error:", error);
        return NextResponse.json({ error: "Failed to create repair job" }, { status: 500 });
    }
}
