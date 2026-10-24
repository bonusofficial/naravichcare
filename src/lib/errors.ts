/** The message of a caught value, for routes that echo it back to the client. */
export function getErrorMessage(error: unknown, fallback = "Unexpected error"): string {
    return error instanceof Error ? error.message : fallback;
}

/** MongoDB's duplicate key error (a unique index was violated). */
export function isDuplicateKeyError(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}
