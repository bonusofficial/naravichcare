const PASSWORD_MIN_LENGTH = 12;

export function validatePassword(password: unknown): string | null {
    if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) {
        return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
    }

    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
        return "Password must include uppercase, lowercase, number, and special character";
    }

    return null;
}
