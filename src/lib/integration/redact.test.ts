import { describe, expect, it } from "vitest";
import { generateApiKey, parseApiKey } from "./api-key";
import { redact } from "./redact";

describe("log redaction", () => {
    const key = generateApiKey();
    const secret = parseApiKey(key.fullKey)!.secret;

    it("removes authorization, API keys, passwords, base64 and customer data", () => {
        const out = JSON.stringify(redact({
            headers: { authorization: `Bearer ${key.fullKey}`, "x-api-key": key.fullKey },
            password: "hunter2",
            keyHash: key.keyHash,
            note: `client sent ${key.fullKey}`,
            photo: "data:image/png;base64,iVBORw0KGgo=",
            customer: { firstName: "สมชาย", phone: "0812345678" },
            phone: "0812345678",
            nested: [{ apiKey: key.fullKey }],
        }));
        expect(out).not.toContain(secret);
        expect(out).not.toContain("hunter2");
        expect(out).not.toContain(key.keyHash);
        expect(out).not.toContain("iVBORw0KGgo");
        expect(out).not.toContain("0812345678");
        expect(out).not.toContain("สมชาย");
    });

    it("keeps customer fields when asked to (admin audit log)", () => {
        const out = redact({ phone: "0812345678", password: "x" }, { customerPii: false }) as Record<string, unknown>;
        expect(out.phone).toBe("0812345678");
        expect(out.password).toBe("[REDACTED]");
    });

    it("serialises objects that define toJSON", () => {
        const doc = { toJSON: () => ({ name: "a", password: "b" }) };
        expect(redact(doc)).toEqual({ name: "a", password: "[REDACTED]" });
    });
});
