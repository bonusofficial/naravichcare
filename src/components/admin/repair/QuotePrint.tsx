import type { RepairJobView } from "@/lib/repair/types";
import { APPROVAL_CHANNEL, APPROVAL_DECISION } from "@/lib/repair/options";
import { latestQuoteApproval } from "@/lib/repair/workflow";
import { PrintHeader, PrintParties, PrintSignatures } from "./PrintShell";
import { formatBaht, formatDateTime } from "./format";

/**
 * Quotation (ใบเสนอราคา): the inspection result and the price the customer
 * pays, split into labour and parts. Only customer prices appear here, never
 * the shop's part cost.
 */
export default function QuotePrint({ job }: { job: RepairJobView }) {
    const approval = latestQuoteApproval(job);
    const labor = Number(job.laborCost) || 0;
    const parts = Number(job.partsCost) || 0;
    return (
        <>
            <PrintHeader job={job} title="ใบเสนอราคา" />
            <PrintParties job={job} />

            <div className="border-2 border-slate-100 rounded-2xl p-4 mb-6 text-black text-[11px] space-y-3">
                <div>
                    <p className="font-black text-slate-400 uppercase tracking-widest text-[9px] mb-1">อาการที่แจ้ง / Reported problem</p>
                    <p className="whitespace-pre-wrap font-bold text-slate-900">{job.reportedSymptom}</p>
                </div>
                <div>
                    <p className="font-black text-slate-400 uppercase tracking-widest text-[9px] mb-1">ผลตรวจเช็ก / Inspection result</p>
                    <p className="whitespace-pre-wrap font-bold text-slate-900">{job.diagnosticResult || "-"}</p>
                </div>
            </div>

            <div className="border-2 border-slate-900 rounded-2xl overflow-hidden mb-8 text-black bg-white">
                <table className="w-full text-left text-[12px]">
                    <thead className="bg-slate-900 text-white uppercase font-black">
                        <tr>
                            <th className="px-6 py-4">รายการ / Description</th>
                            <th className="px-6 py-4 text-right">จำนวนเงิน / Amount</th>
                        </tr>
                    </thead>
                    <tbody className="font-bold text-slate-800">
                        <tr className="border-b border-slate-100">
                            <td className="px-6 py-4">ค่าแรง / Service labor</td>
                            <td className="px-6 py-4 text-right whitespace-nowrap">{formatBaht(labor)}</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                            <td className="px-6 py-4">ค่าอะไหล่ / Spare parts</td>
                            <td className="px-6 py-4 text-right whitespace-nowrap">{formatBaht(parts)}</td>
                        </tr>
                        <tr className="bg-slate-50 text-slate-900 text-2xl font-black">
                            <td className="px-6 py-6">ราคาสุทธิ / TOTAL</td>
                            <td className="px-6 py-6 text-right underline decoration-double decoration-slate-900 text-black whitespace-nowrap">{formatBaht(job.totalPrice)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Latest customer decision on the quotation, when one is recorded */}
            {approval && (
                <div className="border-2 border-slate-100 rounded-2xl p-4 mb-8 text-black text-[11px] grid grid-cols-4 gap-4">
                    <div>
                        <p className="font-black text-slate-400 uppercase tracking-widest text-[9px] mb-1">คำตอบลูกค้า รอบที่ {approval.round}</p>
                        <p className={`font-black ${approval.decision === "approved" ? "text-emerald-700" : "text-red-600"}`}>{APPROVAL_DECISION.labels[approval.decision]}</p>
                    </div>
                    <div>
                        <p className="font-black text-slate-400 uppercase tracking-widest text-[9px] mb-1">ยอดในรอบนี้</p>
                        <p className="font-bold text-slate-900">{formatBaht(approval.totalPrice)}</p>
                    </div>
                    <div>
                        <p className="font-black text-slate-400 uppercase tracking-widest text-[9px] mb-1">ช่องทาง / ผู้ตอบ</p>
                        <p className="font-bold text-slate-900">{APPROVAL_CHANNEL.labels[approval.channel]} · {approval.approverName}</p>
                    </div>
                    <div>
                        <p className="font-black text-slate-400 uppercase tracking-widest text-[9px] mb-1">เวลา</p>
                        <p className="font-bold text-slate-900">{formatDateTime(approval.decidedAt)}</p>
                    </div>
                </div>
            )}

            <p className="mb-8 text-[10px] font-bold text-slate-500">เอกสารนี้ไม่ใช่ใบกำกับภาษี (Not a tax invoice)</p>

            <PrintSignatures left="ลูกค้าผู้อนุมัติ / Customer" right="ผู้เสนอราคา / Quoted by" />
        </>
    );
}
