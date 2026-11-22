export const metadata = { robots: { index: false, follow: false } };
import { ClientShell } from "@/components/cliente/client-shell";
import { getCurrentUser } from "@/lib/auth/actions";
import { configService } from "@/lib/services/config";
import { clientShell } from "@/lib/i18n/catalogs/client-shell";
import { getT } from "@/lib/i18n/server";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  // Only the signed-in user: the full user list is admin-only and threw "No autorizado" for customers.
  const [user, flow, t] = await Promise.all([getCurrentUser(), configService.getFlowConfig(), getT(clientShell)]);
  return <ClientShell originMode={flow.originMode} userName={user ? `${user.firstName} ${user.paternalLastName}` : t("Cliente demo")} lockerCode={user?.lockerCode ?? "AL-MX-0004"}>{children}</ClientShell>;
}
