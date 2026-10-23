import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe } from "vitest";
import mongoose from "mongoose";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import AdminLog from "@/models/AdminLog";
import Counter from "@/models/Counter";
import IntegrationApiKey from "@/models/IntegrationApiKey";
import RepairCustomer from "@/models/RepairCustomer";
import RepairJob from "@/models/RepairJob";
import Role from "@/models/Role";
import { generateApiKey, type IntegrationScope, INTEGRATION_SCOPES } from "@/lib/integration/api-key";
import { resetRateLimits } from "@/lib/integration/rate-limit";

export const hasTestDb = Boolean(process.env.MONGODB_URI_TEST);

/**
 * Fail loudly when the test database is missing instead of silently passing.
 * SKIP_DB_TESTS=true is the only way to opt out.
 */
export const describeDb = (name: string, fn: () => void) => {
    if (!hasTestDb && process.env.SKIP_DB_TESTS === "true") {
        return describe.skip(name, fn);
    }
    return describe(name, () => {
        beforeAll(async () => {
            if (!hasTestDb) throw new Error("MONGODB_URI_TEST is not set (see .env.example). Set SKIP_DB_TESTS=true to skip database suites.");
            await connectTestDb();
        });
        beforeEach(async () => {
            await clearTestDb();
            resetRateLimits();
        });
        afterAll(async () => {
            await mongoose.disconnect();
            (global as { mongoose?: unknown }).mongoose = undefined;
        });
        fn();
    });
};

function assertTestDbName() {
    const name = mongoose.connection.db?.databaseName ?? "";
    if (!name.endsWith("_test")) throw new Error(`Refusing to touch database "${name}": not a _test database`);
}

export async function connectTestDb() {
    await connectToDatabase();
    assertTestDbName();
    await Promise.all([AdminUser, AdminLog, Counter, IntegrationApiKey, RepairCustomer, RepairJob, Role].map((model) => model.init()));
}

/** Empty every collection in the test database (documents only; indexes stay). */
export async function clearTestDb() {
    assertTestDbName();
    const collections = await mongoose.connection.db!.collections();
    await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

export async function createAdmin(role: string, username = `${role}_${randomBytes(3).toString("hex")}`) {
    const user = await AdminUser.create({
        username,
        password: randomBytes(12).toString("hex"),
        name: `Test ${role}`,
        role,
        email: `${username}@example.test`,
    });
    const token = await new SignJWT({ id: String(user._id), username, role })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(new TextEncoder().encode(process.env.JWT_SECRET));
    return { user, token, username };
}

const BASE = "http://localhost:3000";

export function adminRequest(path: string, options: { method?: string; token?: string; body?: unknown; headers?: Record<string, string> } = {}) {
    const headers: Record<string, string> = { ...(options.headers ?? {}) };
    if (options.token) headers.cookie = `admin_token=${options.token}`;
    if (options.body !== undefined) headers["content-type"] = headers["content-type"] ?? "application/json";
    return new NextRequest(new URL(path, BASE), {
        method: options.method ?? "GET",
        headers,
        body: options.body === undefined ? undefined : typeof options.body === "string" ? options.body : JSON.stringify(options.body),
    });
}

export function apiRequest(path: string, options: { method?: string; apiKey?: string; body?: unknown; headers?: Record<string, string> } = {}) {
    const headers: Record<string, string> = { "x-real-ip": "203.0.113.10", ...(options.headers ?? {}) };
    if (options.apiKey) headers.authorization = `Bearer ${options.apiKey}`;
    if (options.body !== undefined) headers["content-type"] = headers["content-type"] ?? "application/json";
    return new NextRequest(new URL(path, BASE), {
        method: options.method ?? "GET",
        headers,
        body: options.body === undefined ? undefined : typeof options.body === "string" ? options.body : JSON.stringify(options.body),
    });
}

export const params = <P extends Record<string, string>>(value: P) => ({ params: Promise.resolve(value) });
export const noParams = { params: Promise.resolve({} as Record<string, never>) };

/** Insert a key directly (bypasses the admin API) and return its plaintext. */
export async function insertApiKey(options: { scopes?: IntegrationScope[]; expiresAt?: Date | null; name?: string } = {}) {
    const generated = generateApiKey();
    const doc = await IntegrationApiKey.create({
        name: options.name ?? "Test POS",
        publicId: generated.publicId,
        keyHash: generated.keyHash,
        keyPrefix: generated.keyPrefix,
        lastFour: generated.lastFour,
        scopes: options.scopes ?? [...INTEGRATION_SCOPES],
        expiresAt: options.expiresAt ?? null,
        createdBy: new mongoose.Types.ObjectId(),
    });
    return { apiKey: generated.fullKey, id: String(doc._id), publicId: generated.publicId };
}

export async function json<T = Record<string, unknown>>(response: Response): Promise<T> {
    return (await response.json()) as T;
}

/** The current Web POS create payload (NaravichPOS RepairsService.sync). */
export function posPayload(overrides: Record<string, unknown> = {}) {
    return {
        reference: `REP-20261024-${randomBytes(4).toString("hex").toUpperCase()}`,
        productCode: "NV-00001",
        imei: "356938035643809",
        model: "Apple iPhone 13 128GB",
        branchId: "6f1c2a52-6a1e-4bd4-9c39-1f0f6f0b9a11",
        symptom: "หน้าจอมีปัญหา",
        imageUrls: null,
        ...overrides,
    };
}
