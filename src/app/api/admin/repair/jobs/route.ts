import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import RepairJob from "@/models/RepairJob";
import RepairCustomer from "@/models/RepairCustomer";
import { recordAdminLog } from "@/lib/admin-log";
import { assertClaimEligible, ClaimEligibilityError } from "@/lib/claim-eligibility";
import { AdminValidationError, parseAdminCreate } from "@/lib/repair/admin-validation";
import { isBranchInScope, requireRepairAccess } from "@/lib/repair/branch-scope";
import { branchChoiceFilter, overdueFilter } from "@/lib/repair/dashboard";
import { saveNewRepairJob } from "@/lib/repair/service";
import { isRepairStatus, TERMINAL_STATUSES } from "@/lib/repair/status";
import Branch from "@/models/Branch";
import { customerSearchFilter, escapeRegex } from "@/lib/repair/search";
import { assertActiveTechnician } from "@/lib/repair/technicians";

export async function GET(req: NextRequest) {
    try {
        const access = await requireRepairAccess(req, "view_repair_jobs");
        if (!access.ok) return access.error;

        await dbConnect();
        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status");
        const query = searchParams.get("q")?.trim().slice(0, 100);

        // branchId: a branch in scope, or "none" (jobs with no branch); anything else lists nothing.
        const branchFilter = branchChoiceFilter(access.scope, searchParams.get("branchId"));
        if (!branchFilter) return NextResponse.json([]);
        const filter: Record<string, unknown> = { ...branchFilter };
        if (status === "open") {
            filter.status = { $nin: [...TERMINAL_STATUSES] };
        } else if (status && status !== "all" && isRepairStatus(status)) {
            filter.status = status;
        }
        const overdue = searchParams.get("overdue") === "1";
        if (overdue) filter.$and = [overdueFilter(new Date())];

        if (query) {
            // Escaped: the search text is matched literally, never run as a pattern.
            const pattern = { $regex: escapeRegex(query), $options: "i" };
            // Customer name (one name or "first last"), phone or customer id.
            const customerFilter = customerSearchFilter(query);
            const customerIds = customerFilter
                ? await RepairCustomer.find(customerFilter).select("_id").limit(500).lean().then((rows) => rows.map((row) => row._id))
                : [];
            filter.$or = [
                { jobId: pattern },
                { imei: pattern },
                { serialNumber: pattern },
                { externalRef: pattern },
                { "integration.productCode": pattern },
                ...(customerIds.length ? [{ customer: { $in: customerIds } }] : []),
            ];
        }

        const jobs = await RepairJob.find(filter)
            .select("-photosBefore -photosAfter")
            .populate("customer")
            .populate("branchId", "name location")
            .sort(overdue ? { appointmentDate: 1 } : { createdAt: -1 })
            .limit(100);

        return NextResponse.json(jobs);
    } catch (error) {
        console.error("Fetch RepairJobs Error:", error);
        return NextResponse.json({ error: "Failed to fetch repair jobs" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const access = await requireRepairAccess(req, "create_repair_jobs");
        if (!access.ok) return access.error;
        const { user, scope } = access;

        await dbConnect();
        const body = await req.json().catch(() => null);
        if (!body || typeof body !== "object" || Array.isArray(body)) {
            return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
        }
        const input = parseAdminCreate(body);

        // The receiving branch: as chosen, else the only branch the user works in.
        let branchId = input.branchId;
        if (!branchId && !scope.all && scope.branchIds.length === 1) branchId = String(scope.branchIds[0]);
        if (!branchId) {
            return NextResponse.json({ error: "กรุณาเลือกสาขารับงาน", code: "VALIDATION_ERROR", fields: ["branchId"] }, { status: 400 });
        }
        const branch = isBranchInScope(scope, branchId)
            ? await Branch.findOne({ _id: branchId, isActive: true }).select("name").lean<{ name: string }>()
            : null;
        if (!branch) {
            return NextResponse.json({ error: "ไม่มีสิทธิ์รับงานในสาขานี้ หรือสาขาถูกปิดใช้งาน", code: "VALIDATION_ERROR", fields: ["branchId"] }, { status: 400 });
        }

        if (input.job.jobType === "claim") await assertClaimEligible({ imei: input.job.imei as string });
        if (input.job.assignedTechnician) await assertActiveTechnician(input.job.assignedTechnician as string);

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
            branchId,
            customer: customerId,
            receivedAt: now,
            dataBackup: {
                status: input.dataBackupStatus,
                recordedBy: user.username,
                recordedById: String(user._id),
                recordedAt: now,
            },
            currentHolder: { kind: "branch", label: branch.name, branchId },
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
