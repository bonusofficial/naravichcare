import { NextResponse } from "next/server";

export const INTEGRATION_ERROR_CODES = [
    "INVALID_API_KEY",
    "INSUFFICIENT_SCOPE",
    "VALIDATION_ERROR",
    "UNSUPPORTED_MEDIA_TYPE",
    "PAYLOAD_TOO_LARGE",
    "NOT_FOUND",
    "IDEMPOTENCY_CONFLICT",
    "EXTERNAL_REFERENCE_CONFLICT",
    "INVALID_STATUS_TRANSITION",
    "REPAIR_CLOSED",
    "CONFLICT",
    "RATE_LIMITED",
    "INTERNAL_ERROR",
] as const;

export type IntegrationErrorCode = (typeof INTEGRATION_ERROR_CODES)[number];

export interface FieldError {
    field: string;
    message: string;
}

/**
 * An error that is safe to show the integration client. Anything else that
 * escapes a handler is reported as INTERNAL_ERROR with no detail.
 */
export class IntegrationError extends Error {
    constructor(
        public readonly code: IntegrationErrorCode,
        public readonly status: number,
        message: string,
        public readonly details?: FieldError[],
        public readonly headers?: Record<string, string>,
    ) {
        super(message);
        this.name = "IntegrationError";
    }
}

export const unauthorized = () => new IntegrationError("INVALID_API_KEY", 401, "Unauthorized");
export const forbiddenScope = () => new IntegrationError("INSUFFICIENT_SCOPE", 403, "Insufficient scope");
export const notFound = () => new IntegrationError("NOT_FOUND", 404, "Repair job not found");
export const validationError = (details: FieldError[], message = "Validation failed") =>
    new IntegrationError("VALIDATION_ERROR", 400, message, details);

export function errorBody(code: IntegrationErrorCode, message: string, requestId: string, details?: FieldError[]) {
    return { error: { code, message, requestId, ...(details?.length ? { details } : {}) } };
}

export function errorResponse(error: IntegrationError, requestId: string): NextResponse {
    const response = NextResponse.json(errorBody(error.code, error.message, requestId, error.details), { status: error.status });
    for (const [name, value] of Object.entries(error.headers ?? {})) response.headers.set(name, value);
    return response;
}
