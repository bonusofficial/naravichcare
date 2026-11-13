/** POST to a job sub-route (quote-approvals, qc, handover) and return the updated job, or throw with the API's message. */
export async function postJobAction<T>(jobId: string, action: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(`/api/admin/repair/jobs/${jobId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string }).error || "บันทึกไม่สำเร็จ");
    return data as T;
}

export const inputClass =
    "w-full rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-xs font-bold outline-none focus:border-blue-500 disabled:opacity-60";
export const primaryButtonClass =
    "flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-blue-600 disabled:opacity-40";
