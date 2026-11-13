"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, Building2, Loader2, MapPin, PackageCheck, Send, Store, Truck, User, Wrench, X } from "lucide-react";
import { HOLDER, MOVEMENT } from "@/lib/repair/options";
import { externalCostTotal } from "@/lib/repair/summary";
import {
    isJobClosed, movementState, openExternalRepair, returnableMovement,
    MOVEMENT_LIMITS, type MovementTargetKind,
} from "@/lib/repair/movements";
import type { RepairJobSectionProps, RepairJobView, RepairMovementView } from "@/lib/repair/types";
import { formatBaht, formatDateTime, fromDateTimeLocal } from "./format";

/**
 * Device custody (งานเพิ่ม 1): where the device is now (job.currentHolder) and
 * every hand-off in job.movements - to another branch, a technician, or an
 * outside repair shop - with sender, receiver, send/return times and, for
 * outside repairs, the actual cost charged. Rules live in lib/repair/movements.
 */

interface BranchOption {
    _id: string;
    name: string;
    location?: string;
}

const INPUT = "w-full rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-xs font-bold outline-none focus:border-blue-500 disabled:opacity-60";
const LABEL = "space-y-1.5";
const LABEL_TEXT = "block text-xs font-semibold text-slate-500";
const PRIMARY = "flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-blue-600 disabled:opacity-40";

const KIND_ICON = { branch: Building2, technician: Wrench, external: Store, customer: User } as const;

function holderKindLabel(kind: string) {
    return HOLDER.is(kind) ? HOLDER.labels[kind] : kind;
}

async function sendJson(url: string, method: "POST" | "PATCH", body: Record<string, unknown>): Promise<RepairJobView> {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string }).error || "บันทึกไม่สำเร็จ");
    return data as RepairJobView;
}

export default function CustodySection({ job, onChanged }: RepairJobSectionProps) {
    const closed = isJobClosed(job);
    const movements = job.movements ?? [];
    const atShop = openExternalRepair(job);
    const returnable = returnableMovement(job);
    const externalTotal = externalCostTotal(job);
    const hasExternal = movements.some((movement) => movement.type === "external_repair");
    const holder = job.currentHolder;
    const HolderIcon = holder && holder.kind in KIND_ICON ? KIND_ICON[holder.kind as keyof typeof KIND_ICON] : MapPin;

    const [branches, setBranches] = useState<BranchOption[]>([]);
    const [sendOpen, setSendOpen] = useState(false);
    const [returnOpen, setReturnOpen] = useState(false);

    // Every active branch: a device may go to any branch, not only the user's own.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch("/api/admin/repair/movement-targets");
                const data = await res.json().catch(() => ({}));
                if (!cancelled && res.ok && Array.isArray(data.branches)) setBranches(data.branches);
            } catch {
                // The branch picker stays empty; technicians and outside shops still work.
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const saved = (updated: RepairJobView) => {
        setSendOpen(false);
        setReturnOpen(false);
        onChanged(updated);
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Truck size={16} className="text-blue-600" /> ติดตามตัวเครื่อง</h4>
                <span className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700" data-testid="current-holder">
                    <HolderIcon size={12} />
                    ตอนนี้อยู่กับ: {holder ? `${holderKindLabel(holder.kind)} ${holder.label}` : "ไม่ระบุ"}
                </span>
            </div>

            {atShop && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                    เครื่องอยู่ที่ร้านซ่อมภายนอก &quot;{atShop.toLabel}&quot; ตั้งแต่ {formatDateTime(atShop.sentAt)} ต้องบันทึกรับเครื่องกลับก่อนส่งต่อ
                </div>
            )}

            {(returnable || !closed) && (
                <div className="flex flex-wrap gap-2">
                    {returnable && !returnOpen && (
                        <button onClick={() => { setReturnOpen(true); setSendOpen(false); }} className={PRIMARY}>
                            <PackageCheck size={14} /> รับเครื่องกลับ{returnable.type === "external_repair" ? " (ซ่อมภายนอก)" : ""}
                        </button>
                    )}
                    {!closed && !atShop && !sendOpen && (
                        <button
                            onClick={() => { setSendOpen(true); setReturnOpen(false); }}
                            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition-all hover:border-blue-500 hover:text-blue-600"
                        >
                            <Send size={14} /> ส่งเครื่อง
                        </button>
                    )}
                </div>
            )}

            {returnOpen && returnable && (
                <ReturnForm job={job} movement={returnable} branches={branches} onCancel={() => setReturnOpen(false)} onSaved={saved} />
            )}
            {sendOpen && !closed && !atShop && (
                <SendForm job={job} branches={branches} onCancel={() => setSendOpen(false)} onSaved={saved} />
            )}

            {movements.length === 0 ? (
                <p className="text-xs text-slate-400">ยังไม่มีการส่งเครื่องออกจากสาขารับงาน</p>
            ) : (
                <ol className="space-y-3 border-l-2 border-slate-100 pl-4">
                    {[...movements].reverse().map((movement) => (
                        <MovementItem key={movement._id} movement={movement} state={movementState(job, movement._id)} />
                    ))}
                </ol>
            )}

            {hasExternal && (
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-xs font-bold text-slate-700">
                    <span>ค่าซ่อมภายนอกรวม (ตามจริง)</span>
                    <span className="text-sm text-slate-900" data-testid="external-cost-total">{formatBaht(externalTotal)}</span>
                </div>
            )}
        </div>
    );
}

function MovementItem({ movement, state }: { movement: RepairMovementView; state: ReturnType<typeof movementState> }) {
    const external = movement.type === "external_repair";
    const Icon = movement.toKind in KIND_ICON ? KIND_ICON[movement.toKind as keyof typeof KIND_ICON] : MapPin;
    return (
        <li className="relative space-y-1">
            <span className="absolute -left-[23px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white ring-2 ring-slate-200">
                <Icon size={9} className="text-slate-500" />
            </span>
            <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${external ? "bg-purple-50 text-purple-700" : "bg-slate-100 text-slate-600"}`}>
                    {MOVEMENT.is(movement.type) ? MOVEMENT.labels[movement.type] : movement.type}
                </span>
                <span className="font-bold text-slate-700">{movement.fromLabel}</span>
                <ArrowRight size={12} className="text-slate-400" />
                <span className="font-bold text-slate-900">{holderKindLabel(movement.toKind)} {movement.toLabel}</span>
                {state === "open" && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">ยังไม่รับกลับ</span>}
                {state === "handed_on" && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">ส่งต่อแล้ว</span>}
                {state === "returned" && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">รับกลับแล้ว</span>}
            </div>
            <p className="text-[11px] text-slate-500">
                ส่ง {formatDateTime(movement.sentAt)} · ผู้ส่ง {movement.sentBy}
                {movement.receivedBy ? ` · ผู้รับ ${movement.receivedBy}` : ""}
            </p>
            {movement.returnedAt && (
                <p className="text-[11px] text-slate-500">
                    รับกลับ {formatDateTime(movement.returnedAt)}
                    {movement.returnReceivedBy ? ` · ผู้รับกลับ ${movement.returnReceivedBy}` : ""}
                    {external && <span className="font-bold text-slate-700"> · ค่าซ่อมจริง {formatBaht(movement.actualCost)}</span>}
                </p>
            )}
            {movement.note && <p className="whitespace-pre-line text-[11px] text-slate-600">{movement.note}</p>}
            <p className="text-[10px] text-slate-400">บันทึกโดย {movement.recordedBy} · {formatDateTime(movement.recordedAt)}</p>
        </li>
    );
}

interface FormProps {
    job: RepairJobView;
    branches: BranchOption[];
    onCancel: () => void;
    onSaved: (job: RepairJobView) => void;
}

function FormShell({ title, error, saving, canSave, submitLabel, onCancel, onSubmit, children }: {
    title: string;
    error: string;
    saving: boolean;
    canSave: boolean;
    submitLabel: string;
    onCancel: () => void;
    onSubmit: () => void;
    children: ReactNode;
}) {
    return (
        <div className="space-y-4 rounded-xl border border-slate-100 p-4">
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">{title}</span>
                <button onClick={onCancel} aria-label="ปิด" className="text-slate-400 hover:text-slate-700"><X size={14} /></button>
            </div>
            {children}
            {error && <p className="text-xs font-bold text-red-600">{error}</p>}
            <button onClick={onSubmit} disabled={!canSave || saving} className={PRIMARY}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <PackageCheck size={14} />} {submitLabel}
            </button>
        </div>
    );
}

const TARGETS: { kind: MovementTargetKind; label: string }[] = [
    { kind: "branch", label: "สาขาอื่น" },
    { kind: "technician", label: "ช่าง" },
    { kind: "external", label: "ร้านซ่อมภายนอก" },
];

function SendForm({ job, branches, onCancel, onSaved }: FormProps) {
    const [toKind, setToKind] = useState<MovementTargetKind>("branch");
    const [toBranchId, setToBranchId] = useState("");
    const [name, setName] = useState("");
    const [sentBy, setSentBy] = useState("");
    const [receivedBy, setReceivedBy] = useState("");
    const [sentAt, setSentAt] = useState("");
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const holderBranch = job.currentHolder?.kind === "branch" ? job.currentHolder.branchId : null;
    const choices = branches.filter((branch) => branch._id !== holderBranch);
    const canSave = toKind === "branch" ? Boolean(toBranchId) : Boolean(name.trim());

    const submit = async () => {
        setSaving(true);
        setError("");
        try {
            const body: Record<string, unknown> = { toKind, sentBy, receivedBy, note, sentAt: fromDateTimeLocal(sentAt) };
            if (toKind === "branch") body.toBranchId = toBranchId;
            else if (toKind === "technician") body.toLabel = name;
            else body.vendorName = name;
            onSaved(await sendJson(`/api/admin/repair/jobs/${job._id}/movements`, "POST", body));
        } catch (err) {
            setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
        } finally {
            setSaving(false);
        }
    };

    return (
        <FormShell title="ส่งเครื่อง" error={error} saving={saving} canSave={canSave} submitLabel="บันทึกการส่งเครื่อง" onCancel={onCancel} onSubmit={submit}>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="ส่งไปที่">
                {TARGETS.map((target) => (
                    <button
                        key={target.kind}
                        role="radio"
                        aria-checked={toKind === target.kind}
                        onClick={() => { setToKind(target.kind); setName(""); }}
                        className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all ${toKind === target.kind ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-300"}`}
                    >
                        {target.label}
                    </button>
                ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                {toKind === "branch" ? (
                    <label className={LABEL}>
                        <span className={LABEL_TEXT}>สาขาปลายทาง *</span>
                        <select value={toBranchId} onChange={(event) => setToBranchId(event.target.value)} className={INPUT}>
                            <option value="">เลือกสาขา</option>
                            {choices.map((branch) => <option key={branch._id} value={branch._id}>{branch.name}</option>)}
                        </select>
                    </label>
                ) : (
                    <label className={LABEL}>
                        <span className={LABEL_TEXT}>{toKind === "technician" ? "ชื่อช่าง *" : "ชื่อร้านซ่อมภายนอก *"}</span>
                        <input
                            value={name}
                            maxLength={toKind === "technician" ? MOVEMENT_LIMITS.name : MOVEMENT_LIMITS.vendorName}
                            onChange={(event) => setName(event.target.value)}
                            className={INPUT}
                        />
                    </label>
                )}
                <label className={LABEL}>
                    <span className={LABEL_TEXT}>เวลาส่ง (เว้นว่าง = ตอนนี้)</span>
                    <input type="datetime-local" value={sentAt} onChange={(event) => setSentAt(event.target.value)} className={INPUT} />
                </label>
                <label className={LABEL}>
                    <span className={LABEL_TEXT}>ผู้ส่ง (เว้นว่าง = ผู้บันทึก)</span>
                    <input value={sentBy} maxLength={MOVEMENT_LIMITS.name} onChange={(event) => setSentBy(event.target.value)} className={INPUT} />
                </label>
                <label className={LABEL}>
                    <span className={LABEL_TEXT}>ผู้รับเครื่อง</span>
                    <input value={receivedBy} maxLength={MOVEMENT_LIMITS.name} onChange={(event) => setReceivedBy(event.target.value)} className={INPUT} />
                </label>
            </div>
            <label className={`${LABEL} block`}>
                <span className={LABEL_TEXT}>หมายเหตุ</span>
                <textarea value={note} rows={2} maxLength={MOVEMENT_LIMITS.note} onChange={(event) => setNote(event.target.value)} className={INPUT} />
            </label>
        </FormShell>
    );
}

function ReturnForm({ job, movement, branches, onCancel, onSaved }: FormProps & { movement: RepairMovementView }) {
    const external = movement.type === "external_repair";
    const receivingBranch = job.branchId?._id ?? "";
    const [toBranchId, setToBranchId] = useState(receivingBranch);
    const [returnedAt, setReturnedAt] = useState("");
    const [returnReceivedBy, setReturnReceivedBy] = useState("");
    const [actualCost, setActualCost] = useState("");
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const costOk = !external || (actualCost.trim() !== "" && Number(actualCost) >= 0);
    const canSave = costOk && Boolean(toBranchId);
    // The receiving branch may be inactive and missing from the list; keep it selectable.
    const options = job.branchId && !branches.some((branch) => branch._id === receivingBranch)
        ? [{ _id: job.branchId._id, name: job.branchId.name }, ...branches]
        : branches;

    const submit = async () => {
        setSaving(true);
        setError("");
        try {
            const body: Record<string, unknown> = { returnedAt: fromDateTimeLocal(returnedAt), returnReceivedBy, note };
            if (toBranchId && toBranchId !== receivingBranch) body.toBranchId = toBranchId;
            if (external) body.actualCost = Number(actualCost);
            onSaved(await sendJson(`/api/admin/repair/jobs/${job._id}/movements/${movement._id}`, "PATCH", body));
        } catch (err) {
            setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
        } finally {
            setSaving(false);
        }
    };

    return (
        <FormShell
            title={`รับเครื่องกลับจาก ${holderKindLabel(movement.toKind)} ${movement.toLabel}`}
            error={error}
            saving={saving}
            canSave={canSave}
            submitLabel="บันทึกรับเครื่องกลับ"
            onCancel={onCancel}
            onSubmit={submit}
        >
            <div className="grid gap-4 sm:grid-cols-2">
                {external && (
                    <label className={LABEL}>
                        <span className={LABEL_TEXT}>ค่าซ่อมจริงจากร้านภายนอก (บาท) *</span>
                        <input type="number" min={0} step="0.01" inputMode="decimal" value={actualCost} onChange={(event) => setActualCost(event.target.value)} className={INPUT} />
                    </label>
                )}
                <label className={LABEL}>
                    <span className={LABEL_TEXT}>รับกลับเข้าสาขา *</span>
                    <select value={toBranchId} onChange={(event) => setToBranchId(event.target.value)} className={INPUT}>
                        {!receivingBranch && <option value="">เลือกสาขา</option>}
                        {options.map((branch) => (
                            <option key={branch._id} value={branch._id}>{branch.name}{branch._id === receivingBranch ? " (สาขารับงาน)" : ""}</option>
                        ))}
                    </select>
                </label>
                <label className={LABEL}>
                    <span className={LABEL_TEXT}>เวลารับกลับ (เว้นว่าง = ตอนนี้)</span>
                    <input type="datetime-local" value={returnedAt} onChange={(event) => setReturnedAt(event.target.value)} className={INPUT} />
                </label>
                <label className={LABEL}>
                    <span className={LABEL_TEXT}>ผู้รับเครื่องกลับ (เว้นว่าง = ผู้บันทึก)</span>
                    <input value={returnReceivedBy} maxLength={MOVEMENT_LIMITS.name} onChange={(event) => setReturnReceivedBy(event.target.value)} className={INPUT} />
                </label>
            </div>
            <label className={`${LABEL} block`}>
                <span className={LABEL_TEXT}>หมายเหตุ</span>
                <textarea value={note} rows={2} maxLength={MOVEMENT_LIMITS.note} onChange={(event) => setNote(event.target.value)} className={INPUT} />
            </label>
        </FormShell>
    );
}
