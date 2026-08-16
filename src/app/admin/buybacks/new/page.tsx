"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Calculator, CheckCircle2, History, Search, ShieldCheck } from "lucide-react";
import { SignatureInput, SignatureMode } from "@/components/admin/SignatureInput";

interface RegistrationResult {
    registration: {
        _id: string;
        firstName?: string;
        lastName?: string;
        idCard?: string;
        imei: string;
        policyNumber?: string;
        brand?: string;
        model?: string;
        coverageSnapshot?: {
            planName: string;
            packagePrice: string;
            coverageStartAt: string;
            coverageEndAt: string;
            totalCoverageDays: number;
        };
    };
    eligible: boolean;
    ineligibleReason: string | null;
    calculation: { remainingCoverageDays: number; recommendedAmount: string } | null;
    claims: Array<{ _id: string; status: string; consumedQuotaName?: string; createdAt: string }>;
    repairClaims: Array<{ _id: string; jobId?: string; status: string; reportedSymptom?: string; createdAt: string }>;
}

const confirmation = "ข้าพเจ้าได้รับเงินคืนครบถ้วนตามจำนวนที่ระบุ และยินยอมให้สิทธิ์ตามแพ็กคุ้มครองสิ้นสุดลงนับจากวันที่ซื้อคืนสำเร็จ";

export default function NewBuybackPage() {
    const router = useRouter();
    const [searchType, setSearchType] = useState("idCard");
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<RegistrationResult[]>([]);
    const [selected, setSelected] = useState<RegistrationResult | null>(null);
    const [actualAmount, setActualAmount] = useState("");
    const [note, setNote] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [paymentOther, setPaymentOther] = useState("");
    const [paymentReference, setPaymentReference] = useState("");
    const [paymentProof, setPaymentProof] = useState<File | null>(null);
    const [customerSignature, setCustomerSignature] = useState<{ file: File | null; mode: SignatureMode }>({ file: null, mode: "draw" });
    const [employeeSignature, setEmployeeSignature] = useState<{ file: File | null; mode: SignatureMode }>({ file: null, mode: "draw" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const search = async (event: FormEvent) => {
        event.preventDefault();
        setLoading(true); setError(""); setSelected(null);
        const params = new URLSearchParams({ type: searchType, q: query.trim() });
        const response = await fetch(`/api/admin/buybacks/search?${params}`, { cache: "no-store" });
        const payload = await response.json();
        if (response.ok) setResults(payload.results || []);
        else setError(payload.error || "ค้นหาไม่สำเร็จ");
        setLoading(false);
    };

    const choose = (result: RegistrationResult) => {
        setSelected(result);
        setActualAmount(result.calculation?.recommendedAmount || "0.00");
        setError("");
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (!selected || !customerSignature.file || !employeeSignature.file) {
            setError("กรุณาเลือกแพ็กและลงลายเซ็นให้ครบ"); return;
        }
        setLoading(true); setError("");
        const form = new FormData();
        form.set("registrationId", selected.registration._id);
        form.set("actualAmount", actualAmount);
        form.set("note", note);
        form.set("paymentMethod", paymentMethod);
        form.set("paymentOther", paymentOther);
        form.set("paymentReference", paymentReference);
        form.set("customerSignature", customerSignature.file);
        form.set("customerSignatureMode", customerSignature.mode);
        form.set("employeeSignature", employeeSignature.file);
        form.set("employeeSignatureMode", employeeSignature.mode);
        if (paymentProof) form.set("paymentProof", paymentProof);
        const response = await fetch("/api/admin/buybacks", { method: "POST", body: form });
        const payload = await response.json();
        if (response.ok) router.push(`/admin/buybacks/${payload.data._id}`);
        else setError(payload.error || "บันทึกรายการไม่สำเร็จ");
        setLoading(false);
    };

    return (
        <div className="mx-auto max-w-5xl space-y-6 pb-20">
            <div><h1 className="text-2xl font-black text-slate-900">สร้างรายการซื้อคืน</h1><p className="text-sm text-slate-500">ค้นหาแพ็ก ตรวจประวัติเคลม และบันทึกยอดที่ตกลงกับลูกค้า</p></div>
            <form onSubmit={search} className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
                <div className="mb-4 flex flex-wrap gap-2">{[["idCard", "เลขบัตรประชาชน"], ["policyNumber", "เลขที่แพ็ก"], ["imei", "IMEI"]].map(([value, label]) => <button type="button" key={value} onClick={() => setSearchType(value)} className={`rounded-xl px-4 py-2 text-xs font-black ${searchType === value ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>{label}</button>)}</div>
                <div className="flex flex-col gap-3 sm:flex-row"><div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-slate-200 px-4"><Search size={18} className="shrink-0 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} required className="min-w-0 w-full py-3 outline-none" placeholder="กรอกข้อมูลแบบเต็มเพื่อค้นหา" /></div><button disabled={loading} className="min-h-12 rounded-xl bg-slate-900 px-6 text-sm font-black text-white sm:min-h-0">ค้นหา</button></div>
            </form>
            {error && <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600"><AlertCircle size={18} />{error}</div>}
            {results.length > 0 && <div className="space-y-3"><h2 className="text-sm font-black text-slate-600">ผลการค้นหา ({results.length})</h2>{results.map((result) => {
                const registration = result.registration;
                return <div key={registration._id} className={`rounded-2xl border bg-white p-4 shadow-sm sm:p-5 ${selected?.registration._id === registration._id ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-100"}`}>
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start"><div className="min-w-0"><p className="text-lg font-black text-slate-800">{registration.firstName} {registration.lastName}</p><p className="break-words text-sm text-slate-500">แพ็ก {registration.policyNumber || "-"} · IMEI {registration.imei}</p><p className="mt-1 text-sm font-bold text-blue-600">{registration.coverageSnapshot?.planName || "ข้อมูลแพ็กไม่ครบ"}</p></div><button type="button" disabled={!result.eligible} onClick={() => choose(result)} className={`w-full rounded-xl px-5 py-2.5 text-sm font-black md:w-auto ${result.eligible ? "bg-blue-600 text-white" : "cursor-not-allowed bg-slate-100 text-slate-400"}`}>{result.eligible ? "เลือกแพ็กนี้" : result.ineligibleReason}</button></div>
                    {result.calculation && <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm md:grid-cols-3"><div><span className="text-slate-400">ราคาแพ็ก</span><p className="font-black">฿{Number(registration.coverageSnapshot?.packagePrice || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</p></div><div><span className="text-slate-400">วันคงเหลือ</span><p className="font-black">{result.calculation.remainingCoverageDays} วัน</p></div><div><span className="text-slate-400">ยอดแนะนำ</span><p className="font-black text-blue-600">฿{Number(result.calculation.recommendedAmount).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</p></div></div>}
                    {(result.claims.length > 0 || result.repairClaims.length > 0) && <details className="mt-4 rounded-xl border border-slate-100 p-4"><summary className="cursor-pointer text-sm font-black text-slate-600"><History className="mr-2 inline" size={15} />ประวัติเคลม {result.claims.length + result.repairClaims.length} รายการ</summary><div className="mt-3 space-y-2 text-xs text-slate-500">{result.claims.map((claim) => <div key={claim._id}>ระบบเคลม · {claim.consumedQuotaName || "ไม่ระบุรายการ"} · {claim.status} · {new Date(claim.createdAt).toLocaleDateString("th-TH")}</div>)}{result.repairClaims.map((claim) => <div key={claim._id}>งานซ่อม/เคลม {claim.jobId} · {claim.reportedSymptom} · {claim.status}</div>)}</div></details>}
                </div>;
            })}</div>}
            {selected && <form onSubmit={submit} className="space-y-6 rounded-2xl bg-white p-4 shadow-sm sm:p-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4"><Calculator className="text-blue-600" /><div><h2 className="font-black text-slate-800">ยอดและการคืนเงิน</h2><p className="text-xs text-slate-400">ยอดแนะนำถูกคำนวณและตรวจซ้ำบนเซิร์ฟเวอร์</p></div></div>
                <div className="grid gap-4 md:grid-cols-2"><label className="space-y-2"><span className="text-sm font-bold text-slate-600">ยอดแนะนำ</span><input readOnly value={selected.calculation?.recommendedAmount || "0.00"} className="w-full rounded-xl bg-slate-100 px-4 py-3 font-black text-slate-500" /></label><label className="space-y-2"><span className="text-sm font-bold text-slate-600">ยอดที่ตกลงจริง</span><input required inputMode="decimal" value={actualAmount} onChange={(event) => setActualAmount(event.target.value)} className="w-full rounded-xl border-2 border-blue-200 px-4 py-3 font-black text-blue-700 outline-none focus:border-blue-500" /></label></div>
                <label className="block space-y-2"><span className="text-sm font-bold text-slate-600">หมายเหตุ {Number(actualAmount) !== Number(selected.calculation?.recommendedAmount || 0) && <b className="text-red-500">(จำเป็น)</b>}</span><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" /></label>
                <div className="grid gap-4 md:grid-cols-2"><label className="space-y-2"><span className="text-sm font-bold text-slate-600">ช่องทางคืนเงิน</span><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3"><option value="cash">เงินสด</option><option value="transfer">โอนเงิน</option><option value="cheque">เช็ค</option><option value="other">อื่น ๆ</option></select></label><label className="space-y-2"><span className="text-sm font-bold text-slate-600">เลขอ้างอิงการจ่าย (ถ้ามี)</span><input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3" /></label></div>
                {paymentMethod === "other" && <label className="block space-y-2"><span className="text-sm font-bold text-slate-600">ระบุช่องทางอื่น ๆ</span><input required value={paymentOther} onChange={(event) => setPaymentOther(event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3" /></label>}
                <label className="block space-y-2"><span className="text-sm font-bold text-slate-600">รูปหลักฐานการจ่าย (ไม่บังคับ)</span><input type="file" accept="image/*" onChange={(event) => setPaymentProof(event.target.files?.[0] || null)} className="block w-full rounded-xl border border-slate-200 p-3 text-sm" /></label>
                <div className="grid gap-6 md:grid-cols-2"><SignatureInput label="ลายเซ็นลูกค้า" onChange={(file, mode) => setCustomerSignature({ file, mode })} /><SignatureInput label="ลายเซ็นพนักงาน" onChange={(file, mode) => setEmployeeSignature({ file, mode })} /></div>
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900"><ShieldCheck className="mr-2 inline text-blue-600" size={17} />{confirmation}</div>
                <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-4 font-black text-white shadow-lg shadow-blue-200 disabled:opacity-50"><CheckCircle2 size={19} /> ส่งรายการเพื่ออนุมัติ</button>
            </form>}
        </div>
    );
}
