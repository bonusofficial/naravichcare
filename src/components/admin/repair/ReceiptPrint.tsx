import { ShieldCheck } from "lucide-react";
import type { RepairJobView } from "@/lib/repair/types";
import { PrintHeader, PrintParties, PrintSignatures } from "./PrintShell";

/**
 * Receipt. Still prints the quoted price (job.totalPrice), as before.
 * TODO(S2 payments): print from job.payments instead - one receipt per
 * payment when paymentId is given, otherwise a statement of all payments.
 */
export default function ReceiptPrint({ job }: { job: RepairJobView; paymentId?: string }) {
    return (
        <>
            <PrintHeader job={job} title="RECEIPT" />
            <PrintParties job={job} />

            <div className="border-2 border-slate-900 rounded-2xl overflow-hidden mb-8 text-black bg-white">
                <table className="w-full text-left text-[12px]">
                    <thead className="bg-slate-900 text-white uppercase font-black">
                        <tr>
                            <th className="px-6 py-4">Description / รายการแจ้ง</th>
                            <th className="px-6 py-4 text-right">Amount / จำนวนเงิน</th>
                        </tr>
                    </thead>
                    <tbody className="font-bold text-slate-800">
                        <tr className="border-b border-slate-100">
                            <td className="px-6 py-6">
                                <p className="text-slate-900 uppercase tracking-tight">Reported Problem: {job.reportedSymptom}</p>
                                <p className="text-[10px] text-emerald-600 mt-2">Status: Repair Completed Successfully</p>
                            </td>
                            <td className="px-6 py-6 text-right">
                                {job.totalPrice > 0 ? "฿ " + job.totalPrice.toLocaleString() : "-"}
                            </td>
                        </tr>
                        {job.totalPrice > 0 && (
                            <>
                                <tr className="border-b border-slate-100 text-[10px] text-slate-400">
                                    <td className="px-6 py-3 shrink-0">Spare Parts & Service Labor (รวมอะไหล่และค่าแรง)</td>
                                    <td className="px-6 py-3 text-right">฿ {job.totalPrice.toLocaleString()}</td>
                                </tr>
                                <tr className="bg-slate-50 text-slate-900 text-2xl font-black">
                                    <td className="px-6 py-8">TOTAL AMOUNT (ราคาสุทธิ)</td>
                                    <td className="px-6 py-8 text-right underline decoration-double decoration-slate-900 text-black">฿ {job.totalPrice.toLocaleString()}</td>
                                </tr>
                            </>
                        )}
                    </tbody>
                </table>
            </div>

            {job.warrantyExpireDate && (
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
            )}

            <PrintSignatures />
        </>
    );
}
