import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminSessionProvider } from "@/components/admin/AdminSession";
import "./admin.css";

const ANUPHAN_CSS = "https://cdn.jsdelivr.net/gh/lazywasabi/thai-web-fonts@7/fonts/Anuphan/var/Anuphan%5Bwght%5D.css";

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="admin-root contents">
            <link rel="stylesheet" href={ANUPHAN_CSS} precedence="default" />
            <AdminSessionProvider><AdminLayout>{children}</AdminLayout></AdminSessionProvider>
        </div>
    );
}
