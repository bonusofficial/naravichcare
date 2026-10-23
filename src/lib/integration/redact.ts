import { maskApiKeys } from "./api-key";

const SECRET_KEY = /authorization|cookie|password|passwd|secret|token|api[-_]?key|keyhash|fullkey/i;
const CUSTOMER_KEY = /^(phone|firstname|lastname|lineid|address|idcard|email|customer)$/i;
const DATA_URI = /^data:[^;,]*;base64,/i;

export interface RedactOptions {
    /** Also mask customer fields (phone, names, address...). Default true. */
    customerPii?: boolean;
    /** Longer strings are cut. Default 500. */
    maxString?: number;
    /** Longer arrays are cut. Default 20. */
    maxArray?: number;
}

/**
 * Deep-copy a value for logging with secrets, customer PII and base64 blobs
 * removed. Use on anything that might carry request data before it reaches
 * console output or AdminLog.details.
 */
export function redact(value: unknown, options: RedactOptions = {}, depth = 0): unknown {
    if (depth > 6) return "[TRUNCATED]";
    const maxString = options.maxString ?? 500;
    if (typeof value === "string") {
        if (DATA_URI.test(value)) return "[BASE64_REDACTED]";
        const masked = maskApiKeys(value);
        return masked.length > maxString ? `${masked.slice(0, maxString)}…[${masked.length} chars]` : masked;
    }
    if (Array.isArray(value)) return value.slice(0, options.maxArray ?? 20).map((item) => redact(item, options, depth + 1));
    if (value && typeof value === "object") {
        if (value instanceof Date) return value.toISOString();
        // Mongoose documents, ObjectIds and similar know how to serialise themselves.
        const toJSON = (value as { toJSON?: () => unknown }).toJSON;
        if (typeof toJSON === "function") {
            const plain = toJSON.call(value);
            if (plain !== value) return redact(plain, options, depth + 1);
        }
        const out: Record<string, unknown> = {};
        for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
            if (SECRET_KEY.test(key)) out[key] = "[REDACTED]";
            else if (options.customerPii !== false && CUSTOMER_KEY.test(key)) out[key] = inner == null ? inner : "[REDACTED]";
            else out[key] = redact(inner, options, depth + 1);
        }
        return out;
    }
    return value;
}

type Level = "info" | "warn" | "error";

/** One structured JSON line per event. Every field passes through redact(). */
export function logIntegration(level: Level, msg: string, meta: Record<string, unknown> = {}) {
    if (process.env.INTEGRATION_API_LOG === "off") return;
    const line = JSON.stringify({ level, msg, time: new Date().toISOString(), ...(redact(meta) as Record<string, unknown>) });
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.info(line);
}
