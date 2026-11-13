import { ShieldCheck } from "lucide-react";
import { PAYMENT_KIND, PAYMENT_METHOD, type PaymentKind, type PaymentMethod } from "@/lib/repair/options";
import { summaryAsOf } from "@/lib/repair/payments";
import { summarizePayments, type PaymentSummary } from "@/lib/repair/summary";
import type { RepairJobView, RepairPaymentView } from "@/lib/repair/types";
import { PrintHeader, PrintParties, PrintSignatures } from "./PrintShell";
import { formatBaht, formatDateTime } from "./format";

/**
 * Receipts built from the money actually recorded on the job (พัฒนา 1).
 * With paymentId: a receipt for that one deposit/payment/refund, with the
 * totals as of that entry. Without: a statement of every non-voided entry.
 * Not a tax invoice (no VAT).
 */

const KIND_EN: Record<PaymentKind, string> = { deposit: "Deposit", payment: "Payment", refund: "Refund" };
const METHOD_EN: Record<PaymentMethod, string> = { cash: "Cash", transfer: "Bank transfer", card: "Card", qr: "QR PromptPay", other: "Other" };

const kindLabel = (kind: PaymentKind) => `${PAYMENT_KIND.labels[kind] ?? kind} (${KIND_EN[kind] ?? kind})`;
const methodLabel = (method: PaymentMethod) => `${PAYMENT_METHOD.labels[method] ?? method} (${METHOD_EN[method] ?? method})`;

export default function ReceiptPrint({ job, paymentId }: { job: RepairJobView; paymentId?: string }) {
    const asOf = paymentId ? summaryAsOf(job, paymentId) : null;
    return asOf ? <SingleReceipt job={job} payment={asOf.payment} summary={asOf.summary} /> : <Statement job={job} />;
}

function SingleReceipt({ job, payment, summary }: { job: RepairJobView; payment: RepairPaymentView; summary: PaymentSummary }) {
    const refund = payment.kind === "refund";
    return (
        <>
            <PrintHeader job={job} title={refund ? "REFUND" : "RECEIPT"} date={new Date(payment.receivedAt)} />

            <div className="grid grid-cols-3 gap-4 mb-8 text-black text-[11px]">
                <MetaBox label={refund ? "เลขที่ใบคืนเงิน / Refund No." : "เลขที่ใบเสร็จ / Receipt No."} value={payment.receiptNo} strong />
                <MetaBox label={refund ? "วันที่คืนเงิน / Date" : "วันที่รับเงิน / Date"} value={formatDateTime(payment.receivedAt)} />
                <MetaBox label={refund ? "ช่องทางคืนเงิน / Method" : "ช่องทางชำระ / Method"} value={methodLabel(payment.method)} />
            </div>

            <PrintParties job={job} />

            <div className="relative border-2 border-slate-900 rounded-2xl overflow-hidden mb-6 text-black bg-white">
                <table className="w-full text-left text-[12px]">
                    <thead className="bg-slate-900 text-white uppercase font-black">
                        <tr>
                            <th className="px-6 py-4">Description / รายการ</th>
                            <th className="px-6 py-4 text-right">Amount / จำนวนเงิน</th>
                        </tr>
                    </thead>
                    <tbody className="font-bold text-slate-800">
                        <tr className="border-b border-slate-100">
                            <td className="px-6 py-6">
                                <p className="text-slate-900 tracking-tight">{kindLabel(payment.kind)}</p>
                                <p className="text-[10px] text-slate-500 mt-1">งานซ่อม / Job {job.jobId} · {job.brand} {job.deviceModel} · อาการ: {job.reportedSymptom}</p>
                                {payment.note && <p className="text-[10px] text-slate-500 mt-1">หมายเหตุ: {payment.note}</p>}
                            </td>
                            <td className="px-6 py-6 text-right whitespace-nowrap">{refund ? "− " : ""}{formatBaht(payment.amount)}</td>
                        </tr>
                        <tr className="bg-slate-50 text-slate-900 text-2xl font-black">
                            <td className="px-6 py-6">{refund ? "TOTAL REFUNDED (ยอดคืนเงิน)" : "AMOUNT RECEIVED (ยอดรับเงิน)"}</td>
                            <td className="px-6 py-6 text-right underline decoration-double decoration-slate-900 whitespace-nowrap">{formatBaht(payment.amount)}</td>
                        </tr>
                    </tbody>
                </table>
                {payment.voidedAt && <VoidStamp reason={payment.voidReason} />}
            </div>

            <Totals
                rows={[
                    ["ราคางานซ่อม / Job total", summary.total > 0 ? formatBaht(summary.total) : "ยังไม่มีราคา"],
                    ["รับชำระสะสมสุทธิ ณ รายการนี้ / Received to date (net)", formatBaht(summary.net)],
                    ["คงค้างหลังรายการนี้ / Balance due", formatBaht(summary.outstanding)],
                    ...(summary.overpaid > 0 ? [["เงินเกินราคา / Overpaid", formatBaht(summary.overpaid)] as [string, string]] : []),
                ]}
            />

            <FooterNote recordedBy={payment.recordedBy} />
            <Warranty job={job} />
            <PrintSignatures
                left={refund ? "ลูกค้าผู้รับเงินคืน / Customer" : "Customer Signature / ลูกค้า"}
                right={refund ? "ผู้จ่ายเงินคืน / Paid by" : "ผู้รับเงิน / Received by"}
            />
        </>
    );
}

function Statement({ job }: { job: RepairJobView }) {
    const entries = (job.payments ?? []).filter((entry) => !entry.voidedAt);
    const summary = summarizePayments(job);
    return (
        <>
            <PrintHeader job={job} title="STATEMENT" />
            <PrintParties job={job} />

            <div className="border-2 border-slate-900 rounded-2xl overflow-hidden mb-6 text-black bg-white">
                <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-900 text-white uppercase font-black">
                        <tr>
                            <th className="px-4 py-3">Date / วันที่</th>
                            <th className="px-4 py-3">Receipt No. / เลขที่</th>
                            <th className="px-4 py-3">Type / รายการ</th>
                            <th className="px-4 py-3">Method / ช่องทาง</th>
                            <th className="px-4 py-3 text-right">Amount / จำนวนเงิน</th>
                        </tr>
                    </thead>
                    <tbody className="font-bold text-slate-800">
                        {entries.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">ยังไม่มีรายการรับเงิน / No payments recorded</td>
                            </tr>
                        ) : entries.map((entry) => (
                            <tr key={entry._id} className="border-b border-slate-100">
                                <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(entry.receivedAt)}</td>
                                <td className="px-4 py-3 font-mono">{entry.receiptNo}</td>
                                <td className="px-4 py-3">{kindLabel(entry.kind)}</td>
                                <td className="px-4 py-3">{methodLabel(entry.method)}</td>
                                <td className="px-4 py-3 text-right whitespace-nowrap">{entry.kind === "refund" ? "− " : ""}{formatBaht(entry.amount)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Totals
                rows={[
                    ["ราคางานซ่อม / Job total", summary.total > 0 ? formatBaht(summary.total) : "ยังไม่มีราคา"],
                    ["รับแล้ว / Received", formatBaht(summary.paid)],
                    ["คืนแล้ว / Refunded", formatBaht(summary.refunded)],
                    ["รับสุทธิ / Net received", formatBaht(summary.net)],
                    ["คงค้าง / Balance due", formatBaht(summary.outstanding)],
                    ...(summary.overpaid > 0 ? [["เงินเกินราคา / Overpaid", formatBaht(summary.overpaid)] as [string, string]] : []),
                ]}
            />

            <FooterNote />
            <Warranty job={job} />
            <PrintSignatures />
        </>
    );
}

function MetaBox({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
    return (
        <div className="border-2 border-slate-100 rounded-2xl p-4">
            <p className="font-black text-slate-400 uppercase tracking-widest text-[9px] mb-1">{label}</p>
            <p className={strong ? "font-black text-blue-600 text-base" : "font-bold text-slate-900"}>{value}</p>
        </div>
    );
}

function Totals({ rows }: { rows: [string, string][] }) {
    return (
        <div className="ml-auto mb-6 w-full max-w-md text-black text-[12px]">
            {rows.map(([label, value], index) => (
                <div key={label} className={`flex justify-between gap-4 px-2 py-1.5 ${index === rows.length - 1 ? "border-t-2 border-slate-900 font-black" : "font-bold text-slate-700"}`}>
                    <span>{label}</span>
                    <span className="whitespace-nowrap">{value}</span>
                </div>
            ))}
        </div>
    );
}

function FooterNote({ recordedBy }: { recordedBy?: string }) {
    return (
        <p className="mb-6 text-[10px] font-bold text-slate-500">
            เอกสารนี้ไม่ใช่ใบกำกับภาษี (Not a tax invoice){recordedBy ? ` · บันทึกโดย ${recordedBy}` : ""}
        </p>
    );
}

function VoidStamp({ reason }: { reason?: string }) {
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="rotate-[-12deg] border-4 border-red-600 px-6 py-2 text-4xl font-black uppercase tracking-widest text-red-600/80">ยกเลิก / VOID</span>
            {reason && <span className="mt-3 rounded bg-white/90 px-2 text-[11px] font-bold text-red-600">เหตุผล: {reason}</span>}
        </div>
    );
}

function Warranty({ job }: { job: RepairJobView }) {
    if (!job.warrantyExpireDate) return null;
    return (
        <div className="mb-10 p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-blue-50/30 text-black">
            <div className="flex items-center gap-3 mb-3">
                <ShieldCheck size={20} className="text-blue-600" />
                <h4 className="text-sm font-black text-slate-900 uppercase">Warranty Information / รายละเอียดการรับประกัน</h4>
            </div>
            <div className="grid grid-cols-2 gap-4 text-[11px] font-bold">
                <p className="text-slate-600">WARRANTY EXPIRES: <span className="text-red-600 underline">{new Date(job.warrantyExpireDate).toLocaleDateString("th-TH")}</span></p>
                <p className="text-slate-600 text-right">VOID CODE: <span className="text-blue-600">{job.voidStickerCode || "-"}</span></p>
            </div>
            <p className="text-[9px] text-slate-400 mt-4 leading-relaxed font-medium">
                * การรับประกันครอบคลุมเฉพาะอาการเดิมที่แจ้งซ่อมเท่านั้น หาก Void Sticker ฉีกขาดหรือตัวเครื่องโดนความชื้น ประกันจะสิ้นสุดทันที
            </p>
        </div>
    );
}
