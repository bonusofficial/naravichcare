import type { RepairJobView } from "@/lib/repair/types";
import { DATA_BACKUP } from "@/lib/repair/options";
import { PrintHeader, PrintParties, PrintSignatures } from "./PrintShell";
import { formatDateTime } from "./format";

/** Job sheet / quotation, printed at intake and when the price is quoted. */
export default function QuotePrint({ job }: { job: RepairJobView }) {
    return (
        <>
            <PrintHeader job={job} title={job.totalPrice > 0 ? "QUOTATION" : "JOB SHEET"} />
            <PrintParties job={job} />

            {/* Intake details the customer signs for: appointment and the data on the device */}
            <div className="grid grid-cols-3 gap-4 mb-8 text-black text-[11px]">
                <div className="border-2 border-slate-100 rounded-2xl p-4">
                    <p className="font-black text-slate-400 uppercase tracking-widest text-[9px] mb-1">รับเครื่อง</p>
                    <p className="font-bold text-slate-900">{formatDateTime(job.receivedAt)}</p>
                </div>
                <div className="border-2 border-slate-100 rounded-2xl p-4">
                    <p className="font-black text-slate-400 uppercase tracking-widest text-[9px] mb-1">นัดซ่อมเสร็จ</p>
                    <p className="font-bold text-slate-900">{job.appointmentDate ? formatDateTime(job.appointmentDate) : "-"}</p>
                </div>
                <div className="border-2 border-slate-100 rounded-2xl p-4">
                    <p className="font-black text-slate-400 uppercase tracking-widest text-[9px] mb-1">ข้อมูลในเครื่อง</p>
                    <p className="font-bold text-slate-900">{job.dataBackup ? DATA_BACKUP.labels[job.dataBackup.status] : "-"}</p>
                </div>
            </div>

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

            <PrintSignatures />
        </>
    );
}
