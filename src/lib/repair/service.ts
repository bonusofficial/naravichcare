import { createHash } from "node:crypto";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import { recordAdminLog } from "@/lib/admin-log";
import RepairJob, { type IRepairJob, type RepairStatusHistoryEntry } from "@/models/RepairJob";
import RepairCustomer from "@/models/RepairCustomer";
import Branch from "@/models/Branch";
import { computeRepairCosts } from "./costs";
import type { IntegrationCreateInput, IntegrationCustomerInput, SearchQuery } from "./integration-validation";
import { isRepairStatus, toPosStatus, type RepairStatus } from "./status";
import type { RepairOutcome } from "./options";
import { currentCostsVersion, resolveOutcome, transitionBlock, type WorkflowJob } from "./workflow";

export type RepairErrorCode =
    | "NOT_FOUND"
    | "VALIDATION_ERROR"
    | "INVALID_STATUS_TRANSITION"
    | "QUOTE_APPROVAL_REQUIRED"
    | "QC_REQUIRED"
    | "HANDOVER_REQUIRED"
    | "REPAIR_CLOSED"
    | "CONFLICT"
    | "IDEMPOTENCY_CONFLICT"
    | "EXTERNAL_REFERENCE_CONFLICT"
    | "INTEGRATION_JOB_DELETE_FORBIDDEN";

/** A business-rule failure that both the admin and integration APIs can report. */
export class RepairWorkflowError extends Error {
    constructor(public readonly code: RepairErrorCode, public readonly status: number, message: string) {
        super(message);
        this.name = "RepairWorkflowError";
    }
}

export interface RepairActor {
    type: "admin" | "integration" | "system";
    id: string | null;
    /** Username for admins, "integration:<key name>" for API clients. */
    name: string;
}

export const INTEGRATION_SOURCE = "pos";

type LeanRepairJob = IRepairJob & { _id: mongoose.Types.ObjectId };

// ---------------------------------------------------------------------------
// Status transitions (shared by admin PATCH, integration cancel/handover)
// ---------------------------------------------------------------------------

function statusSideEffects(
    job: Pick<IRepairJob, "repairCompletedAt" | "outcome">,
    to: RepairStatus,
    now: Date,
    note: string,
    options: { outcome?: RepairOutcome; handedOverAt?: Date },
) {
    const set: Record<string, unknown> = {};
    const unset: Record<string, ""> = {};
    if (to === "ready_pickup") {
        // With outcome not_repaired this marks when the device became ready to go back.
        set.repairCompletedAt = now;
        set.outcome = resolveOutcome(options.outcome);
    }
    if (to === "completed") {
        const handedOverAt = options.handedOverAt ?? now;
        set.handedOverAt = handedOverAt;
        set.completedAt = handedOverAt; // legacy field, kept for existing reports and the print view
        if (!job.repairCompletedAt) set.repairCompletedAt = handedOverAt;
        // Jobs that reached ready_pickup before outcomes existed were repaired.
        if (!job.outcome) set.outcome = "repaired";
    }
    if (to === "cancelled") {
        set.cancelledAt = now;
        if (note) set.cancelReason = note;
    }
    // Sent back for rework: it is no longer "repair completed", and has no outcome yet.
    if (to === "in_progress") {
        unset.repairCompletedAt = "";
        unset.outcome = "";
    }
    return { set, unset };
}

/** The job as it reads after `extra` is written, which is what the guards check. */
type TransitionSubject = Pick<IRepairJob, "status"> &
    Partial<Pick<IRepairJob, "repairCompletedAt" | "ownerType" | "totalPrice" | "costsVersion" | "quoteApprovals" | "qcChecks" | "statusHistory" | "outcome">> & {
        _id: mongoose.Types.ObjectId | string;
    };

export interface TransitionExtra {
    set?: Record<string, unknown>;
    inc?: Record<string, number>;
    /** Only for ready_pickup; defaults to "repaired". */
    outcome?: RepairOutcome;
}

/**
 * Move a job to a new status, enforcing every workflow rule in one place:
 * the status graph, quotation approval before in_progress, a passing QC
 * before a repaired job goes to ready_pickup, and a handover record (passed
 * in `extra.set.handover`) before completed.
 *
 * The update is conditional on the status we read (and on the prices or QC
 * records a guard relied on), so two concurrent changes cannot both win, and
 * the history entry is written in the same update as the status.
 */
export async function transitionRepairJob(
    job: TransitionSubject,
    to: string,
    actor: RepairActor,
    note: string,
    extra: TransitionExtra = {},
): Promise<LeanRepairJob> {
    if (!isRepairStatus(to)) throw new RepairWorkflowError("VALIDATION_ERROR", 400, `Unknown status "${to}"`);
    const set = extra.set ?? {};
    const effective: WorkflowJob = {
        ...job,
        ...(typeof set.totalPrice === "number" ? { totalPrice: set.totalPrice } : {}),
        costsVersion: typeof set.costsVersion === "number"
            ? set.costsVersion
            : currentCostsVersion(job) + (extra.inc?.costsVersion ?? 0),
        // Closing needs the handover written in this same update.
        handover: set.handover,
    };
    const block = transitionBlock(effective, to, extra.outcome);
    if (block) throw new RepairWorkflowError(block.code, 409, block.message);

    const now = new Date();
    const handover = set.handover as { handedOverAt?: Date } | undefined;
    const effects = statusSideEffects(job, to, now, note, { outcome: extra.outcome, handedOverAt: handover?.handedOverAt });
    const entry: RepairStatusHistoryEntry = {
        status: to,
        changedBy: actor.name,
        actorType: actor.type,
        ...(actor.id ? { actorId: actor.id } : {}),
        changedAt: now,
        note,
    };
    const update: mongoose.UpdateQuery<IRepairJob> = {
        $set: { ...set, ...effects.set, status: to },
        $push: { statusHistory: entry },
    };
    if (Object.keys(effects.unset).length) update.$unset = effects.unset;
    if (extra.inc && Object.keys(extra.inc).length) update.$inc = extra.inc;

    const filter: Record<string, unknown> = { _id: job._id, status: job.status };
    // The approval checked above covers these prices only.
    if (to === "in_progress" && (job.ownerType ?? "customer") === "customer") filter.costsVersion = job.costsVersion ?? null;
    // The QC checked above must still be the latest one.
    if (to === "ready_pickup" && effects.set.outcome === "repaired") filter.qcChecks = { $size: job.qcChecks?.length ?? 0 };

    const updated = await RepairJob.findOneAndUpdate(filter, update, {
        returnDocument: "after",
        runValidators: true,
    }).lean<LeanRepairJob>();
    if (!updated) {
        throw new RepairWorkflowError("CONFLICT", 409, "งานซ่อมถูกแก้ไขพร้อมกัน กรุณาโหลดข้อมูลใหม่แล้วลองอีกครั้ง");
    }
    return updated;
}

// ---------------------------------------------------------------------------
// Creation
// ---------------------------------------------------------------------------

export function isDuplicateKeyError(error: unknown): error is { code: number; keyPattern?: Record<string, unknown> } {
    return typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;
}

/**
 * Insert a new job. The job number comes from the atomic counter in the
 * model's pre-save hook; if an old-style number already holds it (e.g. during
 * a rolling deploy) the insert is retried with the next number.
 */
export async function saveNewRepairJob(data: Record<string, unknown>): Promise<IRepairJob> {
    for (let attempt = 0; ; attempt++) {
        try {
            return await new RepairJob(data).save();
        } catch (error) {
            if (attempt < 3 && isDuplicateKeyError(error) && error.keyPattern && "jobId" in error.keyPattern) continue;
            throw error;
        }
    }
}

function sortKeysDeep(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(sortKeysDeep);
    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.keys(value as Record<string, unknown>)
                .sort()
                .map((key) => [key, sortKeysDeep((value as Record<string, unknown>)[key])]),
        );
    }
    return value;
}

/** Fingerprint of a normalised create request, used to spot replays vs conflicts. */
export function createRequestHash(input: IntegrationCreateInput): string {
    return createHash("sha256").update(JSON.stringify(sortKeysDeep(input))).digest("hex");
}

/** "Apple iPhone 13 128GB" -> brand "Apple", model "iPhone 13 128GB" (POS sends `${brand} ${model}`). */
export function splitPosModel(model: string): { brand: string; deviceModel: string } {
    const parts = model.trim().split(/\s+/);
    if (parts.length < 2) return { brand: parts[0], deviceModel: parts[0] };
    return { brand: parts[0], deviceModel: parts.slice(1).join(" ") };
}

function resolveImageUrls(urls: string[]): string[] {
    const base = process.env.INTEGRATION_POS_ASSET_BASE_URL;
    if (!base) return urls;
    return urls.map((url) => (url.startsWith("/") ? new URL(url, base).toString() : url));
}

async function findExistingPosJob(reference: string, idempotencyKey: string | null): Promise<LeanRepairJob | null> {
    if (idempotencyKey) {
        const byKey = await RepairJob.findOne({ source: INTEGRATION_SOURCE, "integration.idempotencyKey": idempotencyKey }).lean<LeanRepairJob>();
        if (byKey) return byKey;
    }
    return RepairJob.findOne({ source: INTEGRATION_SOURCE, externalRef: reference }).lean<LeanRepairJob>();
}

function replayOrConflict(existing: LeanRepairJob, requestHash: string, idempotencyKey: string | null): LeanRepairJob {
    if (idempotencyKey && existing.integration?.idempotencyKey === idempotencyKey) {
        if (existing.integration?.requestHash !== requestHash) {
            throw new RepairWorkflowError("IDEMPOTENCY_CONFLICT", 409, "Idempotency-Key was already used with a different request body");
        }
        return existing;
    }
    if (existing.integration?.requestHash !== requestHash) {
        throw new RepairWorkflowError("EXTERNAL_REFERENCE_CONFLICT", 409, "A repair job with this reference already exists with different data");
    }
    return existing;
}

/** Same rule as the admin flow: reuse the customer with this phone, else create one. */
async function resolveCustomer(input: IntegrationCustomerInput): Promise<{ id: mongoose.Types.ObjectId; created: boolean }> {
    const existing = await RepairCustomer.findOne({ phone: input.phone }).select("_id").lean<{ _id: mongoose.Types.ObjectId }>();
    if (existing) return { id: existing._id, created: false };
    const customer = await RepairCustomer.create({
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        lineId: input.lineId ?? "",
    });
    return { id: customer._id as mongoose.Types.ObjectId, created: true };
}

export interface IntegrationClientRef {
    keyId: string;
    publicId: string;
    name: string;
}

export function integrationActor(client: IntegrationClientRef): RepairActor {
    return { type: "integration", id: client.keyId, name: `integration:${client.name}` };
}

/**
 * The branch a POS job belongs to. Admins map POS branches on the branch page
 * (Branch.posBranchIds), by the POS branch id or its branch code.
 */
export async function findBranchForPos(branchId?: string | null, branchCode?: string | null) {
    const keys = [branchId, branchCode].filter((key): key is string => typeof key === "string" && key.length > 0);
    if (!keys.length) return null;
    return Branch.findOne({ posBranchIds: { $in: keys } }).select("name").lean<{ _id: mongoose.Types.ObjectId; name: string }>();
}

export async function createIntegrationRepairJob(options: {
    input: IntegrationCreateInput;
    client: IntegrationClientRef;
    idempotencyKey: string | null;
    requestId: string;
    req?: Request;
}): Promise<{ job: LeanRepairJob; replayed: boolean }> {
    const { input, client, idempotencyKey, requestId, req } = options;
    await dbConnect();
    const requestHash = createRequestHash(input);

    const existing = await findExistingPosJob(input.reference, idempotencyKey);
    if (existing) return { job: replayOrConflict(existing, requestHash, idempotencyKey), replayed: true };

    let createdCustomerId: mongoose.Types.ObjectId | null = null;
    let customerId: mongoose.Types.ObjectId | null = null;
    if (input.ownerType === "customer" && input.customer) {
        const resolved = await resolveCustomer(input.customer);
        customerId = resolved.id;
        if (resolved.created) createdCustomerId = resolved.id;
    }

    const actor = integrationActor(client);
    const now = new Date();
    const { brand, deviceModel } = splitPosModel(input.model);
    const branch = await findBranchForPos(input.branchId, input.branchCode);
    try {
        const saved = await saveNewRepairJob({
            ownerType: input.ownerType,
            source: INTEGRATION_SOURCE,
            externalRef: input.reference,
            ...(customerId ? { customer: customerId } : {}),
            // Unmapped POS branches leave the job without a branch: only users
            // who see all branches can find it until the branch is mapped.
            ...(branch ? { branchId: branch._id, currentHolder: { kind: "branch", label: branch.name, branchId: branch._id } } : {}),
            deviceType: "Smartphone",
            brand,
            deviceModel,
            imei: input.imei ?? "",
            serialNumber: input.serialNumber ?? "",
            jobType: "repair",
            reportedSymptom: input.symptom,
            integration: {
                clientKeyId: new mongoose.Types.ObjectId(client.keyId),
                clientName: client.name,
                ...(idempotencyKey ? { idempotencyKey } : {}),
                requestHash,
                inventoryItemId: input.inventoryItemId ?? undefined,
                productCode: input.productCode ?? undefined,
                branchId: input.branchId ?? undefined,
                branchCode: input.branchCode ?? undefined,
                imageUrls: resolveImageUrls(input.imageUrls),
            },
            statusHistory: [
                {
                    status: "pending",
                    changedBy: actor.name,
                    actorType: actor.type,
                    actorId: actor.id,
                    changedAt: now,
                    note: `รับงานจาก Web POS (${input.reference})`,
                },
            ],
            receivedAt: now,
        });
        const job = saved.toObject() as LeanRepairJob;
        await recordAdminLog({
            req,
            actor: { id: null, name: actor.name },
            action: "repair_integration.created",
            description: `Web POS ส่งงานซ่อม ${job.jobId} (${input.reference}) ${input.ownerType === "store" ? "เครื่องของร้าน" : "เครื่องลูกค้า"}`,
            targetId: String(job._id),
            targetType: "RepairJob",
            details: { externalRef: input.reference, ownerType: input.ownerType, keyPrefix: `nvc_live_${client.publicId}`, requestId },
        });
        return { job, replayed: false };
    } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;
        // Lost a race with an identical request: hand back the winner's job.
        if (createdCustomerId && !(await RepairJob.exists({ customer: createdCustomerId }))) {
            await RepairCustomer.deleteOne({ _id: createdCustomerId });
        }
        const winner = await findExistingPosJob(input.reference, idempotencyKey);
        if (!winner) throw error;
        return { job: replayOrConflict(winner, requestHash, idempotencyKey), replayed: true };
    }
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

// Never loaded for integration reads: base64 photos and staff-only notes.
const INTEGRATION_EXCLUDED_FIELDS = "-photosBefore -photosAfter -internalNotes -statusHistory";

export async function getPosRepairJob(id: string): Promise<LeanRepairJob> {
    if (!mongoose.isValidObjectId(id)) throw new RepairWorkflowError("NOT_FOUND", 404, "Repair job not found");
    await dbConnect();
    const job = await RepairJob.findOne({ _id: id, source: INTEGRATION_SOURCE })
        .select(INTEGRATION_EXCLUDED_FIELDS)
        .lean<LeanRepairJob>();
    if (!job) throw new RepairWorkflowError("NOT_FOUND", 404, "Repair job not found");
    return job;
}

export async function searchPosRepairJobs(query: SearchQuery) {
    await dbConnect();
    // Equality only: values were validated against fixed patterns and are
    // never turned into a regex.
    const filter: Record<string, unknown> = { source: INTEGRATION_SOURCE };
    if (query.externalRef) filter.externalRef = query.externalRef;
    if (query.imei) filter.imei = query.imei;
    const [jobs, total] = await Promise.all([
        RepairJob.find(filter)
            .select(INTEGRATION_EXCLUDED_FIELDS)
            .sort({ createdAt: -1, _id: -1 })
            .skip((query.page - 1) * query.limit)
            .limit(query.limit)
            .lean<LeanRepairJob[]>(),
        RepairJob.countDocuments(filter),
    ]);
    return {
        data: jobs.map(toIntegrationDto),
        pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
}

// ---------------------------------------------------------------------------
// Integration actions
// ---------------------------------------------------------------------------

export async function cancelPosRepairJob(options: {
    id: string;
    reason: string;
    client: IntegrationClientRef;
    requestId: string;
    req?: Request;
}): Promise<{ job: LeanRepairJob; changed: boolean }> {
    const { id, reason, client, requestId, req } = options;
    const job = await getPosRepairJob(id);
    if (job.status === "cancelled") return { job, changed: false };
    if (job.status === "ready_pickup" || job.status === "completed") {
        throw new RepairWorkflowError("REPAIR_CLOSED", 409, "Repair is already finished and can no longer be cancelled");
    }
    let updated: LeanRepairJob;
    try {
        updated = await transitionRepairJob(job, "cancelled", integrationActor(client), reason);
    } catch (error) {
        if (error instanceof RepairWorkflowError && error.code === "CONFLICT") {
            const current = await getPosRepairJob(id);
            if (current.status === "cancelled") return { job: current, changed: false };
        }
        throw error;
    }
    await recordAdminLog({
        req,
        actor: { id: null, name: `integration:${client.name}` },
        action: "repair_integration.cancelled",
        description: `Web POS ยกเลิกงานซ่อม ${updated.jobId} (${updated.externalRef}): ${reason}`,
        targetId: String(updated._id),
        targetType: "RepairJob",
        details: { externalRef: updated.externalRef, previousStatus: job.status, reason, keyPrefix: `nvc_live_${client.publicId}`, requestId },
    });
    return { job: updated, changed: true };
}

export async function handoverPosRepairJob(options: {
    id: string;
    note: string | null;
    client: IntegrationClientRef;
    requestId: string;
    req?: Request;
}): Promise<{ job: LeanRepairJob; changed: boolean }> {
    const { id, note, client, requestId, req } = options;
    const job = await getPosRepairJob(id);
    if (job.status === "completed") return { job, changed: false };
    if (job.status === "cancelled") {
        throw new RepairWorkflowError("REPAIR_CLOSED", 409, "Repair job is cancelled");
    }
    if (job.status !== "ready_pickup") {
        throw new RepairWorkflowError("INVALID_STATUS_TRANSITION", 409, "Repair job is not ready for pickup yet");
    }
    let updated: LeanRepairJob;
    try {
        const actor = integrationActor(client);
        updated = await transitionRepairJob(job, "completed", actor, note || "Web POS รับเครื่องคืนแล้ว", {
            set: {
                handover: {
                    receiverName: "Web POS",
                    handedOverBy: actor.name,
                    handedOverAt: new Date(),
                    note: note ?? "",
                },
            },
        });
    } catch (error) {
        if (error instanceof RepairWorkflowError && error.code === "CONFLICT") {
            const current = await getPosRepairJob(id);
            if (current.status === "completed") return { job: current, changed: false };
        }
        throw error;
    }
    await recordAdminLog({
        req,
        actor: { id: null, name: `integration:${client.name}` },
        action: "repair_integration.handed_over",
        description: `Web POS รับเครื่องคืนงานซ่อม ${updated.jobId} (${updated.externalRef})`,
        targetId: String(updated._id),
        targetType: "RepairJob",
        details: { externalRef: updated.externalRef, keyPrefix: `nvc_live_${client.publicId}`, requestId },
    });
    return { job: updated, changed: true };
}

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

const iso = (value: Date | string | null | undefined) => (value ? new Date(value).toISOString() : null);

export function toCostsDto(job: Pick<IRepairJob, "laborCost" | "partsCost" | "partsPurchaseCost" | "costsVersion" | "costsUpdatedAt" | "updatedAt">) {
    return {
        ...computeRepairCosts(job),
        currency: "THB",
        version: job.costsVersion ?? 1,
        updatedAt: iso(job.costsUpdatedAt ?? job.updatedAt),
    };
}

/**
 * The only shape an integration client ever sees. Built field by field so a
 * new field on the model cannot leak by accident.
 */
export function toIntegrationDto(job: LeanRepairJob) {
    const handedOverAt = job.handedOverAt ?? (job.status === "completed" ? job.completedAt : null);
    return {
        id: String(job._id),
        reference: job.jobId,
        externalRef: job.externalRef ?? null,
        source: job.source ?? "admin",
        ownerType: job.ownerType ?? "customer",
        status: job.status,
        posStatus: toPosStatus(job.status),
        // Set on entering ready_pickup: "not_repaired" when the customer refused the repair.
        outcome: job.outcome ?? null,
        device: {
            inventoryItemId: job.integration?.inventoryItemId ?? null,
            productCode: job.integration?.productCode ?? null,
            imei: job.imei || null,
            serialNumber: job.serialNumber || null,
            model: job.brand === job.deviceModel ? job.brand : `${job.brand} ${job.deviceModel}`.trim(),
            branchId: job.integration?.branchId ?? null,
            branchCode: job.integration?.branchCode ?? null,
        },
        symptom: job.reportedSymptom,
        imageUrls: job.integration?.imageUrls ?? [],
        // Reserved: parts are not itemised in the repair system yet.
        repairItems: [] as unknown[],
        costs: toCostsDto(job),
        cancelReason: job.status === "cancelled" ? job.cancelReason ?? null : null,
        timestamps: {
            receivedAt: iso(job.receivedAt),
            repairCompletedAt: iso(job.repairCompletedAt),
            handedOverAt: iso(handedOverAt),
            cancelledAt: iso(job.cancelledAt),
            createdAt: iso(job.createdAt),
            updatedAt: iso(job.updatedAt),
        },
    };
}

export type RepairIntegrationDto = ReturnType<typeof toIntegrationDto>;
