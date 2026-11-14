import type { RepairJobView } from "@/lib/repair/types";
import { DATA_BACKUP } from "@/lib/repair/options";
import { PrintHeader, PrintParties, PrintSignatures } from "./PrintShell";
import { formatDateTime } from "./format";

const box = "border-2 border-slate-100 rounded-2xl p-4";
const caption = "font-black text-slate-400 uppercase tracking-widest text-[9px] mb-1";

/**
 * Repair receipt (ใบรับซ่อม) the customer keeps when leaving the device:
 * what was received, in what condition, with which accessories, the reported
 * symptom, the promised date and the customer's choice for the data. No
 * prices and no internal notes.
 */
export default function IntakePrint({ job }: { job: RepairJobView }) {
    return (
        <>
            <PrintHeader job={job} title="ใบรับซ่อม" date={new Date(job.receivedAt)} />
            <PrintParties job={job} />

            <div className="grid grid-cols-3 gap-4 mb-6 text-black text-[11px]">
                <div className={box}>
                    <p className={caption}>วันที่รับเครื่อง</p>
                    <p className="font-bold text-slate-900">{formatDateTime(job.receivedAt)}</p>
                </div>
                <div className={box}>
                    <p className={caption}>นัดรับเครื่อง</p>
                    <p className="font-bold text-slate-900">{job.appointmentDate ? formatDateTime(job.appointmentDate) : "-"}</p>
                </div>
                <div className={box}>
                    <p className={caption}>ประเภทงาน</p>
                    <p className="font-bold text-slate-900">{job.jobType === "claim" ? "เคลม" : "ซ่อม"}</p>
                </div>
            </div>

            <div className={`${box} mb-6 text-black text-[11px] space-y-3`}>
                <div>
                    <p className={caption}>อาการที่แจ้ง / Reported problem</p>
                    <p className="whitespace-pre-wrap text-sm font-bold text-slate-900">{job.reportedSymptom}</p>
                </div>
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <p className={caption}>สภาพเครื่องตอนรับ</p>
                        <p className="whitespace-pre-wrap font-bold text-slate-900">{job.deviceCondition || "-"}</p>
                    </div>
                    <div>
                        <p className={caption}>อุปกรณ์ที่ฝากมากับเครื่อง</p>
                        <p className="font-bold text-slate-900">{(job.accessories ?? []).length ? job.accessories!.join(", ") : "ไม่มี"}</p>
                    </div>
                </div>
                <div>
                    <p className={caption}>ข้อมูลในเครื่อง</p>
                    <p className="font-bold text-slate-900">{job.dataBackup ? DATA_BACKUP.labels[job.dataBackup.status] : "-"}</p>
                </div>
            </div>

            <p className="mb-8 text-[10px] font-bold text-slate-500 leading-relaxed">
                กรุณาเก็บใบรับซ่อมนี้ไว้ และนำมาแสดงเมื่อรับเครื่องคืน · ราคาซ่อมจะแจ้งในใบเสนอราคาหลังตรวจเช็ก
            </p>

            <PrintSignatures left="ลูกค้าผู้ส่งซ่อม / Customer" right="เจ้าหน้าที่ผู้รับเครื่อง / Received by" />
        </>
    );
}
