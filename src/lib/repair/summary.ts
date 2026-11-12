/**
 * Derived figures for a repair job, shared by the admin API, the dashboard
 * and the admin pages. Pure functions with no server-only imports.
 */

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Statuses where a passed appointment no longer counts as overdue. */
export const OVERDUE_EXEMPT_STATUSES = ["ready_pickup", "completed", "cancelled"] as const;

export interface PaymentLike {
    kind: string;
    amount: number;
    voidedAt?: Date | string | null;
}

export interface PaymentSummary {
    /** Price charged to the customer (labor + parts). */
    total: number;
    /** Deposits and payments received, voided entries excluded. */
    paid: number;
    refunded: number;
    /** paid - refunded: what the shop actually holds for this job. */
    net: number;
    /** What the customer still owes; never negative. */
    outstanding: number;
    /** What the shop holds beyond the price, e.g. a deposit on a job the customer refused. */
    overpaid: number;
}

export function summarizePayments(job: { totalPrice?: number | null; payments?: readonly PaymentLike[] | null }): PaymentSummary {
    let paid = 0;
    let refunded = 0;
    for (const payment of job.payments ?? []) {
        if (payment.voidedAt) continue;
        const amount = Number(payment.amount) || 0;
        if (payment.kind === "refund") refunded += amount;
        else if (payment.kind === "deposit" || payment.kind === "payment") paid += amount;
    }
    const total = round2(Number(job.totalPrice) || 0);
    const net = round2(paid - refunded);
    return {
        total,
        paid: round2(paid),
        refunded: round2(refunded),
        net,
        outstanding: round2(Math.max(total - net, 0)),
        overpaid: round2(Math.max(net - total, 0)),
    };
}

export interface MovementLike {
    type: string;
    actualCost?: number | null;
}

/** Actual cost paid to outside repair shops for this job. */
export function externalCostTotal(job: { movements?: readonly MovementLike[] | null }): number {
    let total = 0;
    for (const movement of job.movements ?? []) {
        if (movement.type === "external_repair") total += Number(movement.actualCost) || 0;
    }
    return round2(total);
}

/** The appointment has passed and the device is not ready yet. */
export function isOverdue(job: { appointmentDate?: Date | string | null; status: string }, now: Date = new Date()): boolean {
    if (!job.appointmentDate) return false;
    if ((OVERDUE_EXEMPT_STATUSES as readonly string[]).includes(job.status)) return false;
    const due = new Date(job.appointmentDate);
    return !Number.isNaN(due.getTime()) && due.getTime() < now.getTime();
}
