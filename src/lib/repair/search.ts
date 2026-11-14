/**
 * Search helpers for the repair admin pages. Pure functions, no server imports.
 */

export function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const MAX_WORDS = 5;
const PHONE_LIKE = /^[\d\s()+-]+$/;

/**
 * A pattern that matches a phone number whether or not either side writes it
 * with separators: "0812345678" finds "081-234-5678" and the other way round.
 */
function phonePattern(word: string): string | null {
    if (!PHONE_LIKE.test(word)) return null;
    const digits = word.replace(/\D/g, "");
    if (digits.length < 3) return null;
    return digits.split("").join("[-\\s().]*");
}

/**
 * RepairCustomer filter for free text typed by staff. Every word must match the
 * first name, last name, phone or customer id, so "สมชาย ใจดี" finds the
 * customer named สมชาย ใจดี and a single word matches either name. Text is
 * matched literally (escaped), never run as a pattern. Null for empty text.
 */
export function customerSearchFilter(query: string): Record<string, unknown> | null {
    const words = query.trim().split(/\s+/).filter(Boolean).slice(0, MAX_WORDS);
    if (!words.length) return null;
    const clauses = words.map((word) => {
        const pattern = { $regex: escapeRegex(word), $options: "i" };
        const or: Record<string, unknown>[] = [
            { firstName: pattern },
            { lastName: pattern },
            { phone: pattern },
            { customerId: pattern },
        ];
        const phone = phonePattern(word);
        if (phone) or.push({ phone: { $regex: phone } });
        return { $or: or };
    });
    return clauses.length === 1 ? clauses[0] : { $and: clauses };
}

/** The same phone pattern for a whole query ("081 234 5678" is one phone number). */
export function phoneSearchPattern(query: string): string | null {
    return phonePattern(query.trim());
}
