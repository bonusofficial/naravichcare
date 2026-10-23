import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import type { IntegrationScope } from "./api-key";
import { authenticateApiKey, requireScope, type IntegrationClient } from "./auth";
import { errorBody, errorResponse, IntegrationError } from "./errors";
import { consumeRateLimit, rateLimitConfig, type RateLimitResult } from "./rate-limit";
import { logIntegration } from "./redact";

export const MAX_BODY_BYTES = 64 * 1024;

// Credentials must travel in the Authorization header only; a key in the URL
// ends up in proxy logs and browser history.
const QUERY_CREDENTIAL_PARAMS = ["api_key", "apikey", "apiKey", "key", "access_token", "token"];

export type BodyMode = "none" | "optional" | "required";

export interface IntegrationContext<P> {
    req: NextRequest;
    client: IntegrationClient;
    requestId: string;
    ip: string;
    params: P;
    body: Record<string, unknown>;
}

export interface HandlerResult {
    status: number;
    body: unknown;
    headers?: Record<string, string>;
}

/**
 * The app listens on 127.0.0.1 behind Cloudflare Tunnel / a reverse proxy, so
 * these headers are set by our own proxy and not by the caller.
 */
export function clientIp(req: Request): string {
    const direct = req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip");
    if (direct) return direct.trim().slice(0, 64);
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim().slice(0, 64);
    return "unknown";
}

async function readJsonBody(req: NextRequest, mode: BodyMode): Promise<Record<string, unknown>> {
    if (mode === "none") return {};
    const declaredLength = Number(req.headers.get("content-length") || 0);
    if (declaredLength > MAX_BODY_BYTES) {
        throw new IntegrationError("PAYLOAD_TOO_LARGE", 413, `Request body must be at most ${MAX_BODY_BYTES} bytes`);
    }
    const text = await req.text();
    if (Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) {
        throw new IntegrationError("PAYLOAD_TOO_LARGE", 413, `Request body must be at most ${MAX_BODY_BYTES} bytes`);
    }
    if (!text.trim()) {
        if (mode === "optional") return {};
        throw new IntegrationError("VALIDATION_ERROR", 400, "Request body is required");
    }
    const contentType = (req.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (contentType !== "application/json") {
        throw new IntegrationError("UNSUPPORTED_MEDIA_TYPE", 415, "Content-Type must be application/json");
    }
    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch {
        throw new IntegrationError("VALIDATION_ERROR", 400, "Malformed JSON body");
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new IntegrationError("VALIDATION_ERROR", 400, "Request body must be a JSON object");
    }
    return parsed as Record<string, unknown>;
}

function rateLimited(result: RateLimitResult) {
    return new IntegrationError("RATE_LIMITED", 429, "Too many requests", undefined, {
        "Retry-After": String(result.retryAfterSeconds),
    });
}

/**
 * Wrap an integration route: request id, per-IP and per-key rate limits,
 * API key auth, scope check, JSON body parsing and the error envelope.
 */
export function integrationRoute<P extends Record<string, string> = Record<string, never>>(
    options: { scope: IntegrationScope; body?: BodyMode },
    handler: (ctx: IntegrationContext<P>) => Promise<HandlerResult>,
) {
    return async (req: NextRequest, routeContext: { params: Promise<P> }): Promise<NextResponse> => {
        const requestId = randomUUID();
        const startedAt = Date.now();
        const ip = clientIp(req);
        const path = req.nextUrl.pathname;
        let client: IntegrationClient | null = null;
        let limitState: RateLimitResult | null = null;
        let response: NextResponse;
        let errorCode: string | undefined;

        try {
            for (const name of QUERY_CREDENTIAL_PARAMS) {
                if (req.nextUrl.searchParams.has(name)) {
                    throw new IntegrationError("VALIDATION_ERROR", 400, "Send the API key in the Authorization header, not the query string");
                }
            }

            const config = rateLimitConfig();
            const ipLimit = consumeRateLimit(`ip:${ip}`, config.ipLimit, config.windowMs);
            limitState = ipLimit;
            if (!ipLimit.allowed) throw rateLimited(ipLimit);

            client = await authenticateApiKey(req.headers.get("authorization"), { requestId, ip });

            const keyLimit = consumeRateLimit(`key:${client.publicId}`, config.limit, config.windowMs);
            limitState = keyLimit;
            if (!keyLimit.allowed) throw rateLimited(keyLimit);

            requireScope(client, options.scope);
            const body = await readJsonBody(req, options.body ?? "none");
            const params = await routeContext.params;
            const result = await handler({ req, client, requestId, ip, params, body });
            response = NextResponse.json(result.body, { status: result.status });
            for (const [name, value] of Object.entries(result.headers ?? {})) response.headers.set(name, value);
        } catch (error) {
            if (error instanceof IntegrationError) {
                errorCode = error.code;
                response = errorResponse(error, requestId);
            } else {
                errorCode = "INTERNAL_ERROR";
                logIntegration("error", "integration.unhandled_error", {
                    requestId,
                    path,
                    errorName: error instanceof Error ? error.name : typeof error,
                    errorMessage: error instanceof Error ? error.message : String(error),
                    ...(process.env.NODE_ENV !== "production" && error instanceof Error ? { stack: error.stack } : {}),
                });
                response = NextResponse.json(errorBody("INTERNAL_ERROR", "Internal server error", requestId), { status: 500 });
            }
        }

        response.headers.set("X-Request-Id", requestId);
        response.headers.set("Cache-Control", "no-store");
        if (limitState) {
            response.headers.set("X-RateLimit-Limit", String(limitState.limit));
            response.headers.set("X-RateLimit-Remaining", String(limitState.remaining));
        }

        logIntegration(response.status >= 500 ? "error" : "info", "integration.request", {
            requestId,
            method: req.method,
            path,
            status: response.status,
            durationMs: Date.now() - startedAt,
            client: client?.publicId ?? null,
            ip,
            ...(errorCode ? { errorCode } : {}),
        });
        return response;
    };
}
