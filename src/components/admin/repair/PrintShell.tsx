import type { ReactNode } from "react";
import { MapPin, Phone, Wrench } from "lucide-react";
import type { RepairJobView } from "@/lib/repair/types";

/**
 * Building blocks shared by the printed repair documents (QuotePrint,
 * ReceiptPrint, HandoverPrint). Markup moved unchanged from the job page,
 * except that the header shows the job's branch when it has one.
 */

export function PrintHeader({ job, title, date = new Date() }: { job: RepairJobView; title: string; date?: Date }) {
    const branch = job.branchId;
    return (
        <div className="flex justify-between items-start border-b-4 border-slate-900 pb-6 mb-8 text-black">
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                        <Wrench size={24} />
                    </div>
                    <h1 className="text-3xl font-black tracking-tighter">NAVAVICH CARE</h1>
                </div>
                <p className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-500">Service Center & Claims Management</p>
                <div className="flex flex-col gap-1 mt-4 text-[11px] font-bold text-slate-700">
                    {branch ? (
                        <>
                            <div className="flex items-center gap-2"><MapPin size={12} /> {branch.name}{branch.location ? ` · ${branch.location}` : ""}</div>
                            <div className="flex items-center gap-2"><Phone size={12} /> {branch.phone || "0XX-XXX-XXXX"} | LINE: @navavich_care</div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-2"><MapPin size={12} /> กรุงเทพมหานคร (Bangkok, Thailand)</div>
                            <div className="flex items-center gap-2"><Phone size={12} /> 0XX-XXX-XXXX | LINE: @navavich_care</div>
                        </>
                    )}
                </div>
            </div>
            <div className="text-right flex flex-col items-end">
                <div className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black text-3xl mb-3">{title}</div>
                <div className="space-y-1">
                    <p className="text-[14px] font-black uppercase text-black">NO: <span className="text-blue-600">{job.jobId}</span></p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">Date: {date.toLocaleString("th-TH")}</p>
                </div>
            </div>
        </div>
    );
}

export function PrintParties({ job }: { job: RepairJobView }) {
    return (
        <div className="grid grid-cols-2 gap-6 mb-8 text-black">
            <div className="border-2 border-slate-100 rounded-2xl p-6 bg-slate-50/20">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2 text-blue-600">CUSTOMER INFO</h3>
                {job.customer ? (
                    <>
                        <p className="text-lg font-black text-slate-900 uppercase tracking-tight">{job.customer.firstName} {job.customer.lastName}</p>
                        <p className="text-[11px] font-bold text-slate-600 mt-1">TEL: {job.customer.phone}</p>
                    </>
                ) : (
                    <>
                        <p className="text-lg font-black text-slate-900 tracking-tight">เครื่องของร้าน (Store stock)</p>
                        {job.externalRef && <p className="text-[11px] font-bold text-slate-600 mt-1">POS REF: {job.externalRef}</p>}
                    </>
                )}
            </div>
            <div className="border-2 border-slate-100 rounded-2xl p-6 bg-slate-50/20">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2 text-blue-600">DEVICE DETAILS</h3>
                <p className="text-lg font-black text-slate-900 uppercase tracking-tight">{job.brand} {job.deviceModel}</p>
                <p className="text-[11px] font-bold text-slate-700 mt-1">S/N: {job.imei || "Not Found"}</p>
            </div>
        </div>
    );
}

export function PrintSignatures({ left = "Customer Signature / ลูกค้า", right = "Authorized Signature / เจ้าหน้าที่" }: { left?: ReactNode; right?: ReactNode }) {
    return (
        <div className="grid grid-cols-2 gap-32 pt-16 border-t-2 border-slate-900 mt-auto text-black bg-white">
            <div className="text-center space-y-6">
                <div className="h-12 border-b-2 border-slate-300 w-full"></div>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{left}</p>
            </div>
            <div className="text-center space-y-6">
                <div className="h-12 border-b-2 border-slate-300 w-full relative flex items-center justify-center">
                    <span className="text-blue-600/10 font-black text-3xl uppercase tracking-[0.5em] absolute rotate-[-15deg]">NAVAVICH</span>
                </div>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{right}</p>
            </div>
        </div>
    );
}
