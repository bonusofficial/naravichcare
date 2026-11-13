import type { RepairJobView, RepairQcCheckView } from "@/lib/repair/types";
import { QC_CHECKLIST, QC_RESULT, REPAIR_OUTCOME } from "@/lib/repair/options";
import { latestQcCheck } from "@/lib/repair/workflow";
import { PrintHeader, PrintParties, PrintSignatures } from "./PrintShell";
import { formatDateTime } from "./format";

const box = "border-2 border-slate-100 rounded-2xl p-4";
const caption = "font-black text-slate-400 uppercase tracking-widest text-[9px] mb-1";

/**
 * Handover document (ใบส่งมอบเครื่อง), for repaired and not-repaired jobs
 * alike: outcome, the latest QC, who received the device, who handed it over
 * and when. Printed before the record exists, the handover lines stay blank
 * to be filled in by hand.
 */
export default function HandoverPrint({ job }: { job: RepairJobView }) {
    const outcome = job.outcome ?? "repaired";
    const qc = latestQcCheck<RepairQcCheckView>(job);
    const handover = job.handover;
    const resultOf = (key: string) => qc?.items.find((item) => item.key === key)?.result;

    return (
        <>
            <PrintHeader job={job} title="HANDOVER" />
            <PrintParties job={job} />

            <div className="grid grid-cols-3 gap-4 mb-6 text-black text-[11px]">
                <div className={box}>
                    <p className={caption}>ผลการซ่อม / Outcome</p>
                    <p className={`font-black text-sm ${outcome === "repaired" ? "text-emerald-700" : "text-amber-700"}`}>{REPAIR_OUTCOME.labels[outcome]}</p>
                </div>
                <div className={box}>
                    <p className={caption}>รับเครื่อง</p>
                    <p className="font-bold text-slate-900">{formatDateTime(job.receivedAt)}</p>
                </div>
                <div className={box}>
                    <p className={caption}>{outcome === "repaired" ? "ซ่อมเสร็จ" : "พร้อมคืนเครื่อง"}</p>
                    <p className="font-bold text-slate-900">{formatDateTime(job.repairCompletedAt)}</p>
                </div>
            </div>

            <div className={`${box} mb-6 text-black text-[11px]`}>
                <div className="flex items-center justify-between mb-2">
                    <p className={caption}>ผลตรวจ QC ล่าสุด</p>
                    {qc && (
                        <p className="font-black">
                            {qc.overall === "pass" ? "ผ่าน" : "ไม่ผ่าน"} · {qc.checkedBy} · {formatDateTime(qc.checkedAt)}
                        </p>
                    )}
                </div>
                {qc ? (
                    <>
                        <div className="grid grid-cols-3 gap-x-6 gap-y-1">
                            {QC_CHECKLIST.map((item) => {
                                const result = resultOf(item.key);
                                return (
                                    <div key={item.key} className="flex justify-between border-b border-slate-100 py-0.5">
                                        <span className="text-slate-600">{item.label}</span>
                                        <span className={`font-bold ${result === "fail" ? "text-red-600" : "text-slate-900"}`}>{result ? QC_RESULT.labels[result] : "-"}</span>
                                    </div>
                                );
                            })}
                        </div>
                        {qc.note && <p className="mt-2 text-slate-600">หมายเหตุ: {qc.note}</p>}
                    </>
                ) : (
                    <p className="text-slate-500">{outcome === "not_repaired" ? "ไม่ได้ซ่อม จึงไม่มีการตรวจ QC" : "ยังไม่มีบันทึก QC"}</p>
                )}
            </div>

            <div className={`${box} mb-8 text-black text-[11px]`}>
                <p className={caption}>การส่งมอบเครื่อง / Handover</p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 mt-2">
                    {[
                        ["ผู้รับเครื่อง", handover ? `${handover.receiverName}${handover.receiverRelation ? ` (${handover.receiverRelation})` : ""}` : ""],
                        ["เบอร์โทรผู้รับ", handover ? handover.receiverPhone || "-" : ""],
                        ["ผู้ส่งมอบ", handover?.handedOverBy ?? ""],
                        ["วันเวลาส่งมอบ", handover ? formatDateTime(handover.handedOverAt) : ""],
                    ].map(([label, value]) => (
                        <div key={label} className="flex gap-2 items-end">
                            <span className="text-slate-500 whitespace-nowrap">{label}:</span>
                            <span className="flex-1 border-b border-dotted border-slate-400 font-bold text-slate-900 min-h-[1.25rem]">{value}</span>
                        </div>
                    ))}
                </div>
                {handover?.note && <p className="mt-3 text-slate-600">หมายเหตุ: {handover.note}</p>}
                <p className="mt-4 text-[9px] text-slate-400 leading-relaxed">
                    ผู้รับเครื่องได้ตรวจสอบสภาพเครื่องและอุปกรณ์แล้ว และยืนยันการรับเครื่องคืนตามรายละเอียดข้างต้น
                </p>
            </div>

            <PrintSignatures
                left={<>ผู้รับเครื่อง / Received by{handover ? <span className="block mt-1 normal-case tracking-normal text-slate-600">({handover.receiverName})</span> : null}</>}
                right={<>ผู้ส่งมอบ / Handed over by{handover ? <span className="block mt-1 normal-case tracking-normal text-slate-600">({handover.handedOverBy})</span> : null}</>}
            />
        </>
    );
}
