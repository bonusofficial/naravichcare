/**
 * The single JWT signing key for the app.
 *
 * This used to be inlined in four places with two different hardcoded
 * fallbacks, so an unset JWT_SECRET meant login signed a token that
 * middleware.ts could not verify — an endless /admin -> /admin/login loop.
 * Failing at startup is better than a silent mismatch.
 */
const secret = process.env.JWT_SECRET;

if (!secret) {
    throw new Error("Please define the JWT_SECRET environment variable inside .env.local");
}

export const JWT_SECRET = new TextEncoder().encode(secret);
