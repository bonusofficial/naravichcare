/** Display and form helpers shared by the repair job components. */

export function formatDateTime(value?: string | Date | null): string {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

export function formatBaht(value?: number | null): string {
    return `฿ ${(Number(value) || 0).toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/** ISO string -> value for <input type="datetime-local"> in the browser's time zone. */
export function toDateTimeLocal(value?: string | null): string {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** <input type="datetime-local"> value -> ISO string for the API (null when empty). */
export function fromDateTimeLocal(value: string): string | null {
    return value ? new Date(value).toISOString() : null;
}

/** PATCH the job and return the updated job, or throw with the API's message. */
export async function patchJob<T>(jobId: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(`/api/admin/repair/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string }).error || "บันทึกไม่สำเร็จ");
    return data as T;
}
