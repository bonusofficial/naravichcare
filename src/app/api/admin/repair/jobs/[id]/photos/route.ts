import { NextRequest, NextResponse } from "next/server";
import RepairJob from "@/models/RepairJob";
import { recordAdminLog } from "@/lib/admin-log";
import { parsePhotoChange } from "@/lib/repair/admin-validation";
import { adminRepairErrorResponse, concurrentEdit, invalidBody, readJsonObject } from "@/lib/repair/admin-route";
import { ADMIN_JOB_POPULATE, loadScopedRepairJob } from "@/lib/repair/branch-scope";

interface Context {
    params: Promise<{ id: string }>;
}

const LABELS = { photosBefore: "ก่อนซ่อม", photosAfter: "หลังซ่อม" } as const;
const VERBS = { add: "เพิ่ม", replace: "เปลี่ยน", delete: "ลบ" } as const;

/**
 * Add, replace or delete one before/after photo. The client sends how many
 * photos it saw; if someone else changed that category meanwhile the update
 * matches nothing and answers 409, so a stale page never deletes or
 * overwrites the wrong photo.
 */
export async function POST(req: NextRequest, { params }: Context) {
    try {
        const { id } = await params;
        const access = await loadScopedRepairJob(req, id, "edit_repair_jobs", { select: "jobId brand deviceModel" });
        if (!access.ok) return access.error;
        const { job, actor } = access;

        const body = await readJsonObject(req);
        if (!body) return invalidBody();
        const input = parsePhotoChange(body);
        const { field, expectedCount } = input;

        const filter = {
            _id: job._id,
            $expr: { $eq: [{ $size: { $ifNull: [`$${field}`, []] } }, expectedCount] },
        };
        let result;
        if (input.action === "add") {
            result = await RepairJob.updateOne(filter, { $push: { [field]: input.image } });
        } else if (input.action === "replace") {
            result = await RepairJob.updateOne(filter, { $set: { [`${field}.${input.index}`]: input.image } });
        } else {
            // Remove by position in one atomic update: keep what is before and after it.
            result = await RepairJob.updateOne(filter, [{
                $set: {
                    [field]: {
                        $concatArrays: [
                            { $slice: [`$${field}`, input.index!] },
                            { $slice: [`$${field}`, input.index! + 1, expectedCount] },
                        ],
                    },
                },
            }], { updatePipeline: true });
        }
        if (!result.matchedCount) return concurrentEdit();

        await recordAdminLog({
            req,
            actor: { id: actor.id, name: actor.name },
            action: `${input.action}_photo_${field === "photosBefore" ? "before" : "after"}`,
            description: `${VERBS[input.action]}รูป "${LABELS[field]}"${input.index !== undefined ? ` รูปที่ ${input.index + 1}` : ""} ในงาน ${job.jobId} (${job.brand} ${job.deviceModel})`,
            targetId: id,
            targetType: "RepairJob",
            details: { field, action: input.action, index: input.index, countBefore: expectedCount },
        });

        const updated = await RepairJob.findById(job._id).populate(ADMIN_JOB_POPULATE);
        return NextResponse.json(updated);
    } catch (error) {
        const handled = adminRepairErrorResponse(error);
        if (handled) return handled;
        // BSONObjectTooLarge: the job document would pass MongoDB's 16 MB limit.
        if ((error as { code?: number })?.code === 10334 || /too large/i.test((error as Error)?.message ?? "")) {
            return NextResponse.json({ error: "รูปในงานนี้มีขนาดรวมใหญ่เกินไป กรุณาลบรูปเดิมหรือใช้รูปขนาดเล็กลง", code: "PHOTOS_TOO_LARGE" }, { status: 413 });
        }
        console.error("Repair photo change error:", error);
        return NextResponse.json({ error: "บันทึกรูปไม่สำเร็จ" }, { status: 500 });
    }
}
