export const metadata = { robots: { index: false, follow: false } };
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminUser } from "@/lib/auth/actions";
import { ADMIN_SECTIONS } from "@/lib/auth/admin-permissions";
export default async function AdminLayout({ children }: { children: React.ReactNode }) { const user=await requireAdminUser(ADMIN_SECTIONS.map(s=>s.id)); return <AdminShell user={user}>{children}</AdminShell>; }
