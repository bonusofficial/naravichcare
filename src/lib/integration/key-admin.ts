import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { getCurrentAdmin } from "@/lib/auth-middleware";
import { recordAdminLog } from "@/lib/admin-log";
import IntegrationApiKey, { type IIntegrationApiKey } from "@/models/IntegrationApiKey";
import { buildApiKey, generateApiKey, INTEGRATION_SCOPES, isIntegrationScope, type IntegrationScope } from "./api-key";

/**
 * Integration keys are managed by the super_admin role only. This is a role
 * check, not a permission: a permission could be granted to a custom role from
 * the role editor, which must not be able to mint machine credentials.
 */
export const KEY_MANAGER_ROLE = "super_admin";

export interface KeyManager {
    id: string;
    username: string;
}

export class KeyAdminError extends Error {
    constructor(public readonly status: number, public readonly code: string, message: string) {
        super(message);
    }
}

export async function requireKeyManager(req: NextRequest): Promise<KeyManager> {
    const user = await getCurrentAdmin(req);
    if (!user) throw new KeyAdminError(401, "UNAUTHORIZED", "Unauthorized");
    if (!user.isActive) throw new KeyAdminError(403, "FORBIDDEN", "Your account is deactivated");
    if (user.role !== KEY_MANAGER_ROLE) throw new KeyAdminError(403, "FORBIDDEN", "เฉพาะ Super Admin เท่านั้นที่จัดการ API Key ได้");
    return { id: String(user._id), username: user.username };
}

export function keyAdminErrorResponse(error: unknown): NextResponse {
    if (error instanceof KeyAdminError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("Integration key admin error:", error instanceof Error ? error.name : typeof error);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
}

/** Responses that carry a plaintext key must never be cached anywhere. */
export function noStore(response: NextResponse): NextResponse {
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Pragma", "no-cache");
    return response;
}

export async function readJson(req: NextRequest, { optional = false } = {}): Promise<Record<string, unknown>> {
    const text = await req.text();
    if (!text.trim()) {
        if (optional) return {};
        throw new KeyAdminError(400, "VALIDATION_ERROR", "Request body is required");
    }
    const contentType = (req.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (contentType !== "application/json") throw new KeyAdminError(415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type must be application/json");
    if (text.length > 8 * 1024) throw new KeyAdminError(413, "PAYLOAD_TOO_LARGE", "Request body too large");
    try {
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
        return parsed;
    } catch {
        throw new KeyAdminError(400, "VALIDATION_ERROR", "Malformed JSON body");
    }
}

export type KeyStatus = "active" | "expired" | "revoked";

export function keyStatus(key: Pick<IIntegrationApiKey, "isActive" | "revokedAt" | "expiresAt">, now = new Date()): KeyStatus {
    if (!key.isActive || key.revokedAt) return "revoked";
    if (key.expiresAt && new Date(key.expiresAt).getTime() <= now.getTime()) return "expired";
    return "active";
}

type KeyRecord = Omit<IIntegrationApiKey, "keyHash"> & { _id: mongoose.Types.ObjectId };

const iso = (value: Date | null | undefined) => (value ? new Date(value).toISOString() : null);

/** Safe view of a key: no hash, no secret. */
export function toKeyDto(key: KeyRecord) {
    return {
        id: String(key._id),
        name: key.name,
        keyPrefix: key.keyPrefix,
        lastFour: key.lastFour,
        maskedKey: `${key.keyPrefix}_…${key.lastFour}`,
        scopes: key.scopes,
        status: keyStatus(key),
        expiresAt: iso(key.expiresAt),
        lastUsedAt: iso(key.lastUsedAt),
        lastUsedIp: key.lastUsedIp || null,
        createdAt: iso(key.createdAt),
        rotatedAt: iso(key.rotatedAt),
        rotationCount: key.rotationCount ?? 0,
        revokedAt: iso(key.revokedAt),
        revokeReason: key.revokeReason || null,
    };
}

const SAFE_FIELDS = "-keyHash";

export async function listKeys() {
    await dbConnect();
    const keys = await IntegrationApiKey.find().select(SAFE_FIELDS).sort({ createdAt: -1 }).lean<KeyRecord[]>();
    return keys.map(toKeyDto);
}

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;

function readName(raw: unknown): string {
    if (typeof raw !== "string" || !raw.trim()) throw new KeyAdminError(400, "VALIDATION_ERROR", "กรุณาระบุชื่อ Key");
    const name = raw.trim();
    if (name.length > 100 || CONTROL_CHARS.test(name)) throw new KeyAdminError(400, "VALIDATION_ERROR", "ชื่อ Key ต้องยาวไม่เกิน 100 ตัวอักษร");
    return name;
}

function readScopes(raw: unknown): IntegrationScope[] {
    if (!Array.isArray(raw) || raw.length === 0) throw new KeyAdminError(400, "VALIDATION_ERROR", "กรุณาเลือก Scope อย่างน้อย 1 รายการ");
    const scopes = [...new Set(raw)];
    if (!scopes.every(isIntegrationScope)) {
        throw new KeyAdminError(400, "VALIDATION_ERROR", `Scope ต้องเป็นหนึ่งใน ${INTEGRATION_SCOPES.join(", ")}`);
    }
    return INTEGRATION_SCOPES.filter((scope) => scopes.includes(scope));
}

const MAX_EXPIRY_MS = 5 * 365 * 24 * 60 * 60 * 1000;

function readExpiry(raw: unknown): Date | null {
    if (raw === undefined || raw === null || raw === "") return null;
    if (typeof raw !== "string") throw new KeyAdminError(400, "VALIDATION_ERROR", "วันหมดอายุไม่ถูกต้อง");
    const date = new Date(raw);
    const now = Date.now();
    if (Number.isNaN(date.getTime())) throw new KeyAdminError(400, "VALIDATION_ERROR", "วันหมดอายุไม่ถูกต้อง");
    if (date.getTime() <= now) throw new KeyAdminError(400, "VALIDATION_ERROR", "วันหมดอายุต้องเป็นเวลาในอนาคต");
    if (date.getTime() > now + MAX_EXPIRY_MS) throw new KeyAdminError(400, "VALIDATION_ERROR", "วันหมดอายุต้องไม่เกิน 5 ปี");
    return date;
}

function rejectUnknown(body: Record<string, unknown>, allowed: string[]) {
    const unknown = Object.keys(body).filter((key) => !allowed.includes(key));
    if (unknown.length) throw new KeyAdminError(400, "VALIDATION_ERROR", `ไม่รองรับ field: ${unknown.join(", ")}`);
}

export async function createKey(body: Record<string, unknown>, actor: KeyManager, req: NextRequest) {
    rejectUnknown(body, ["name", "scopes", "expiresAt"]);
    const name = readName(body.name);
    const scopes = readScopes(body.scopes);
    const expiresAt = readExpiry(body.expiresAt);
    await dbConnect();

    let generated = generateApiKey();
    for (let attempt = 0; await IntegrationApiKey.exists({ publicId: generated.publicId }); attempt++) {
        if (attempt > 3) throw new Error("Could not allocate a unique key id");
        generated = generateApiKey();
    }
    const created = await IntegrationApiKey.create({
        name,
        publicId: generated.publicId,
        keyHash: generated.keyHash,
        keyPrefix: generated.keyPrefix,
        lastFour: generated.lastFour,
        scopes,
        expiresAt,
        createdBy: new mongoose.Types.ObjectId(actor.id),
    });
    await recordAdminLog({
        req,
        actor: { id: actor.id, name: actor.username },
        action: "integration_key.created",
        description: `สร้าง Integration API Key "${name}" (${generated.keyPrefix})`,
        targetId: String(created._id),
        targetType: "IntegrationApiKey",
        details: { name, keyPrefix: generated.keyPrefix, scopes, expiresAt: iso(expiresAt) },
    });
    const record = await IntegrationApiKey.findById(created._id).select(SAFE_FIELDS).lean<KeyRecord>();
    return { key: toKeyDto(record!), apiKey: generated.fullKey };
}

async function loadKey(id: string): Promise<KeyRecord> {
    if (!mongoose.isValidObjectId(id)) throw new KeyAdminError(404, "NOT_FOUND", "ไม่พบ API Key");
    await dbConnect();
    const key = await IntegrationApiKey.findById(id).select(SAFE_FIELDS).lean<KeyRecord>();
    if (!key) throw new KeyAdminError(404, "NOT_FOUND", "ไม่พบ API Key");
    return key;
}

/**
 * Replace the secret. The publicId stays, the hash changes, so the old key
 * stops matching on the very next request.
 */
export async function rotateKey(id: string, body: Record<string, unknown>, actor: KeyManager, req: NextRequest) {
    rejectUnknown(body, []);
    const key = await loadKey(id);
    const status = keyStatus(key);
    if (status === "revoked") throw new KeyAdminError(409, "KEY_REVOKED", "Key นี้ถูกเพิกถอนแล้ว กรุณาสร้าง Key ใหม่");
    if (status === "expired") throw new KeyAdminError(409, "KEY_EXPIRED", "Key นี้หมดอายุแล้ว กรุณาสร้าง Key ใหม่");

    const generated = buildApiKey(key.publicId);
    const now = new Date();
    const updated = await IntegrationApiKey.findOneAndUpdate(
        { _id: key._id, isActive: true, revokedAt: null },
        {
            $set: { keyHash: generated.keyHash, lastFour: generated.lastFour, rotatedAt: now, rotatedBy: new mongoose.Types.ObjectId(actor.id) },
            $inc: { rotationCount: 1 },
        },
        { returnDocument: "after" },
    ).select(SAFE_FIELDS).lean<KeyRecord>();
    if (!updated) throw new KeyAdminError(409, "KEY_REVOKED", "Key นี้ถูกเพิกถอนแล้ว กรุณาสร้าง Key ใหม่");
    await recordAdminLog({
        req,
        actor: { id: actor.id, name: actor.username },
        action: "integration_key.rotated",
        description: `Rotate Integration API Key "${key.name}" (${key.keyPrefix}) — Key เดิมใช้ไม่ได้ทันที`,
        targetId: String(key._id),
        targetType: "IntegrationApiKey",
        details: { name: key.name, keyPrefix: key.keyPrefix, rotationCount: updated.rotationCount },
    });
    return { key: toKeyDto(updated), apiKey: generated.fullKey };
}

/** Disable a key permanently. The record stays for the audit trail. */
export async function revokeKey(id: string, body: Record<string, unknown>, actor: KeyManager, req: NextRequest) {
    rejectUnknown(body, ["reason"]);
    const reasonRaw = body.reason;
    if (typeof reasonRaw !== "string" || !reasonRaw.trim()) throw new KeyAdminError(400, "VALIDATION_ERROR", "กรุณาระบุเหตุผลในการเพิกถอน");
    const reason = reasonRaw.trim();
    if (reason.length > 500) throw new KeyAdminError(400, "VALIDATION_ERROR", "เหตุผลต้องยาวไม่เกิน 500 ตัวอักษร");

    const key = await loadKey(id);
    if (keyStatus(key) === "revoked") return { key: toKeyDto(key), alreadyRevoked: true };
    const updated = await IntegrationApiKey.findOneAndUpdate(
        { _id: key._id },
        { $set: { isActive: false, revokedAt: new Date(), revokedBy: new mongoose.Types.ObjectId(actor.id), revokeReason: reason } },
        { returnDocument: "after" },
    ).select(SAFE_FIELDS).lean<KeyRecord>();
    await recordAdminLog({
        req,
        actor: { id: actor.id, name: actor.username },
        action: "integration_key.revoked",
        description: `เพิกถอน Integration API Key "${key.name}" (${key.keyPrefix})`,
        targetId: String(key._id),
        targetType: "IntegrationApiKey",
        details: { name: key.name, keyPrefix: key.keyPrefix, reason },
    });
    return { key: toKeyDto(updated!), alreadyRevoked: false };
}
