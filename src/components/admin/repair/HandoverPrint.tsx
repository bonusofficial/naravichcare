import type { RepairJobView } from "@/lib/repair/types";
import { PrintHeader, PrintParties, PrintSignatures } from "./PrintShell";

/**
 * Handover document (ใบส่งมอบเครื่อง), for repaired and not-repaired jobs alike.
 * TODO(S3 handover): print job.handover (receiver, handed over by, time),
 * job.outcome and the latest QC result. Wired to print mode "handover".
 */
export default function HandoverPrint({ job }: { job: RepairJobView }) {
    return (
        <>
            <PrintHeader job={job} title="HANDOVER" />
            <PrintParties job={job} />
            <PrintSignatures left="ผู้รับเครื่อง / Received by" right="ผู้ส่งมอบ / Handed over by" />
        </>
    );
}
