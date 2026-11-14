import { MapPinOff } from "lucide-react";

/**
 * Shown to staff whose account is linked to no branch. Repair jobs are scoped
 * to the user's branches, so such an account sees no jobs and cannot open one
 * until a super admin links it to a branch.
 */
export default function NoBranchNotice({ action = "ดูหรือเปิดงานซ่อม" }: { action?: string }) {
    return (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <MapPinOff size={20} className="mt-0.5 shrink-0 text-amber-600" />
            <div className="space-y-1 text-sm">
                <p className="font-bold">บัญชีนี้ยังไม่ได้ผูกสาขา จึง{action}ไม่ได้</p>
                <p className="text-[13px] leading-relaxed">
                    ให้ Super Admin เข้าเมนู <span className="font-bold">จัดการแอดมิน</span> แล้วแก้ไขบัญชีนี้ เลือกสาขาหลัก
                    (และสาขาอื่นที่ทำงานด้วยถ้ามี) จากนั้นออกจากระบบแล้วเข้าใหม่ หรือรีเฟรชหน้านี้
                </p>
            </div>
        </div>
    );
}
