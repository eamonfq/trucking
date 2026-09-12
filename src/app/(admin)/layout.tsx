export const metadata = { robots: { index: false, follow: false } };
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminUser } from "@/lib/auth/actions";
export default async function AdminLayout({ children }: { children: React.ReactNode }) { await requireAdminUser(); return <AdminShell>{children}</AdminShell>; }
