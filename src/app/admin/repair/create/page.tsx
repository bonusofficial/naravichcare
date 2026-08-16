import { redirect } from "next/navigation";

export default function LegacyRepairCreatePage() {
    redirect("/admin/repair/jobs/new");
}
