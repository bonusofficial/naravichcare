import { sendLinePortal, type LineMessage } from "@/lib/line-portal";

/** The job fields the status message uses. customer/branchId are used when populated. */
export type RepairJobForLine = {
    _id: unknown;
    jobId: string;
    brand: string;
    deviceModel: string;
    status?: string;
    customer?: unknown;
    branchId?: unknown;
};

interface CustomerContact {
    customerId?: string;
    name: string;
    phone?: string;
    lineId?: string;
}

/** Who to contact about the job, when the job's customer is populated. */
export function customerContact(customer: unknown): CustomerContact | null {
    if (!customer || typeof customer !== "object" || !("firstName" in customer)) return null;
    const c = customer as { customerId?: string; firstName?: string; lastName?: string; phone?: string; lineId?: string };
    return {
        customerId: c.customerId || undefined,
        name: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim(),
        phone: c.phone || undefined,
        lineId: c.lineId || undefined,
    };
}

function branchName(branch: unknown): string | undefined {
    return branch && typeof branch === "object" && "name" in branch ? String((branch as { name: unknown }).name) : undefined;
}

const row = (label: string, value: string) => ({
    type: "box",
    layout: "baseline",
    spacing: "sm",
    contents: [
        { type: "text", text: label, color: "#aaaaaa", size: "sm", flex: 2 },
        { type: "text", text: value, wrap: true, color: "#666666", size: "sm", flex: 5, weight: "bold" },
    ],
});

export interface RepairStatusNotification {
    messages: LineMessage[];
    /** Machine-readable copy of the recipient details, for a portal that routes per customer. */
    meta: {
        event: "repair_status_changed";
        jobId: string;
        status?: string;
        statusLabel: string;
        branch?: string;
        customer: CustomerContact | null;
        adminUrl: string;
    };
}

/**
 * The repair status message (LINE Flex). It carries the job id and the
 * customer's name, phone and LINE ID, so whoever receives it can reach the
 * customer. The button opens the job in the admin panel, which needs a staff
 * login; it is not a customer status page.
 */
export function buildRepairStatusNotification(job: RepairJobForLine, statusLabel: string, color: string): RepairStatusNotification {
    const contact = customerContact(job.customer);
    const branch = branchName(job.branchId);
    const adminUrl = `https://naravichcare.com/admin/repair/jobs/${String(job._id)}`;

    const details = [
        row("เลขที่งาน:", job.jobId),
        row("เครื่อง:", `${job.brand} ${job.deviceModel}`.trim() || "-"),
        ...(contact ? [
            row("ลูกค้า:", contact.name || "-"),
            row("โทร:", contact.phone ?? "-"),
            row("LINE:", contact.lineId ?? "-"),
        ] : [row("เจ้าของ:", "เครื่องของร้าน")]),
        ...(branch ? [row("สาขา:", branch)] : []),
    ];

    const footerButtons: Record<string, unknown>[] = [
        { type: "button", action: { type: "uri", label: "เปิดใบงาน (พนักงาน)", uri: adminUrl }, style: "primary", color: "#0F172A", height: "sm" },
    ];
    if (contact?.phone && /^[0-9+\-\s()]{6,20}$/.test(contact.phone)) {
        footerButtons.push({ type: "button", action: { type: "uri", label: "โทรหาลูกค้า", uri: `tel:${contact.phone.replace(/[^\d+]/g, "")}` }, style: "secondary", height: "sm" });
    }

    const flexMessage = {
        type: "bubble",
        header: {
            type: "box",
            layout: "vertical",
            contents: [{ type: "text", text: "NAVAVICH CARE 👋", weight: "bold", color: "#FFFFFF", size: "sm" }],
            backgroundColor: "#0F172A",
            paddingAll: "lg",
        },
        body: {
            type: "box",
            layout: "vertical",
            contents: [
                { type: "text", text: "อัปเดตสถานะงานซ่อม", weight: "bold", size: "xl", margin: "md" },
                { type: "box", layout: "vertical", margin: "lg", spacing: "sm", contents: details },
                {
                    type: "box",
                    layout: "vertical",
                    margin: "xxl",
                    contents: [{
                        type: "box",
                        layout: "vertical",
                        backgroundColor: color,
                        cornerRadius: "xl",
                        paddingAll: "lg",
                        contents: [{ type: "text", text: statusLabel, color: "#FFFFFF", align: "center", weight: "bold", size: "lg" }],
                    }],
                },
            ],
        },
        footer: { type: "box", layout: "vertical", spacing: "sm", contents: footerButtons },
    };

    const who = contact ? ` · ${contact.name}${contact.phone ? ` ${contact.phone}` : ""}` : "";
    return {
        messages: [{ type: "flex", altText: `อัปเดตงานซ่อม ${job.jobId}: ${statusLabel}${who}`, contents: flexMessage }],
        meta: { event: "repair_status_changed", jobId: job.jobId, status: job.status, statusLabel, branch, customer: contact, adminUrl },
    };
}

/**
 * Send the status message through the LINE Portal. The portal's request is
 * `{ messages }`; the recipient block is added only when
 * LINE_PORTAL_SEND_RECIPIENT=true, i.e. once the portal accepts it.
 */
export async function sendLineFlexMessage(job: RepairJobForLine, statusLabel: string, color: string) {
    const { messages, meta } = buildRepairStatusNotification(job, statusLabel, color);
    const withMeta = process.env.LINE_PORTAL_SEND_RECIPIENT?.trim().toLowerCase() === "true";
    return sendLinePortal(messages, withMeta ? { recipient: meta } : undefined);
}
