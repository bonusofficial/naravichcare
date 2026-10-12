import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminSessionProvider } from "@/components/admin/AdminSession";

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
    return <AdminSessionProvider><AdminLayout>{children}</AdminLayout></AdminSessionProvider>;
}
