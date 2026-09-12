export const metadata = { robots: { index: false, follow: false } };
import { ClientShell } from "@/components/cliente/client-shell";
import { getSession } from "@/lib/auth/actions";
import { configService } from "@/lib/services/config";
import { logisticsService } from "@/lib/services/logistics";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const [session, flow, users] = await Promise.all([getSession(), configService.getFlowConfig(), logisticsService.getUsers()]);
  const user = users.find((candidate) => candidate.id === session?.userId);
  return <ClientShell originMode={flow.originMode} userName={user ? `${user.firstName} ${user.paternalLastName}` : "Cliente demo"} lockerCode={user?.lockerCode ?? "AL-MX-0004"}>{children}</ClientShell>;
}
