import mongoose from "mongoose";
import Registration from "@/models/Registration";
import AgentWithdrawal from "@/models/AgentWithdrawal";
import { buildProfitMatch, PROFIT_EFFECTIVE_STAGES } from "@/lib/profit-report";

/** Typed codes arrive with stray spaces or in lower case. */
export function normalizeAgentCode(code: unknown): string {
    return typeof code === "string" ? code.replace(/\s+/g, "").toUpperCase() : "";
}

export function maskBankAccount(account?: string): string {
    const digits = (account || "").replace(/\D/g, "");
    return digits ? `•••• ${digits.slice(-4)}` : "";
}

/**
 * The agent fields the public portal may see. The portal signs in with the
 * agent code alone, so the full bank account and tax ID stay admin-only.
 */
export function toAgentView(agent: any) {
    return {
        _id: String(agent._id),
        agentCode: agent.agentCode,
        name: agent.name,
        contactPerson: agent.contactPerson || "",
        bankName: agent.bankName || "",
        bankAccountName: agent.bankAccountName || "",
        bankAccountMasked: maskBankAccount(agent.bankAccount),
        commissionRate: agent.commissionRate,
    };
}

export function toWithdrawalView(w: any) {
    return {
        _id: String(w._id),
        amount: w.amount,
        status: w.status,
        bankName: w.bankName,
        bankAccountName: w.bankAccountName,
        bankAccountMasked: maskBankAccount(w.bankAccount),
        note: w.note || "",
        hasSlip: !!w.slip?.relativePath,
        createdAt: w.createdAt,
        processedAt: w.processedAt,
    };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * An agent's insurance commission and what is left to withdraw.
 *
 * Earned follows the profit report's rules, so the agent sees the same figure
 * as the admin and a cancelled/refunded sale claws its commission back. Pending
 * and paid withdrawals both count against it; a rejected one frees it again.
 */
export async function getAgentBalance(agentId: string | mongoose.Types.ObjectId, agentCode: string) {
    const [[earnedRow], [withdrawnRow]] = await Promise.all([
        Registration.aggregate([
            { $match: buildProfitMatch({ agentCode }) },
            ...PROFIT_EFFECTIVE_STAGES,
            { $group: { _id: null, total: { $sum: "$effectiveCommission" } } },
        ]),
        AgentWithdrawal.aggregate([
            { $match: { agentId: new mongoose.Types.ObjectId(String(agentId)), status: { $in: ["pending", "paid"] } } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
    ]);

    const earned = round2(earnedRow?.total || 0);
    const withdrawn = round2(withdrawnRow?.total || 0);
    // A sale cancelled after its commission was paid out can push this below
    // zero. Future commission absorbs that, but there is nothing to withdraw now.
    return { earned, withdrawn, available: Math.max(0, round2(earned - withdrawn)) };
}
