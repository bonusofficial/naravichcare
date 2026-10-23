import { RepairWorkflowError } from "@/lib/repair/service";
import { IntegrationError, validationError, type FieldError } from "./errors";
import type { ValidationResult } from "@/lib/repair/integration-validation";

/** Translate a repair business-rule failure into the integration error envelope. */
export function toIntegrationError(error: unknown): unknown {
    if (!(error instanceof RepairWorkflowError)) return error;
    switch (error.code) {
        case "NOT_FOUND":
            return new IntegrationError("NOT_FOUND", 404, "Repair job not found");
        case "VALIDATION_ERROR":
            return new IntegrationError("VALIDATION_ERROR", 400, error.message);
        case "INVALID_STATUS_TRANSITION":
        case "REPAIR_CLOSED":
        case "CONFLICT":
        case "IDEMPOTENCY_CONFLICT":
        case "EXTERNAL_REFERENCE_CONFLICT":
            return new IntegrationError(error.code, 409, error.message);
        default:
            return error;
    }
}

export async function withRepairErrors<T>(work: () => Promise<T>): Promise<T> {
    try {
        return await work();
    } catch (error) {
        throw toIntegrationError(error);
    }
}

export function unwrap<T>(result: ValidationResult<T>): T {
    if (!result.ok) throw validationError(result.errors as FieldError[]);
    return result.value;
}
