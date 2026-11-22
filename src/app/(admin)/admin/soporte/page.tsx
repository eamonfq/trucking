import { requireAdminUser } from "@/lib/auth/actions";
import { SectionTitle } from "@/components/cliente/section-title";
import { SupportDesk } from "@/components/admin/support-desk";
import { logisticsService } from "@/lib/services/logistics";
import { adminSupport } from "@/lib/i18n/catalogs/admin-support";
import { getT } from "@/lib/i18n/server";

export default async function SupportPage({searchParams}:{searchParams:Promise<{ticket?:string}>}) { await requireAdminUser(["soporte"]);
  const [tickets, users, query, t] = await Promise.all([logisticsService.getSupportTickets(), logisticsService.getUsers(), searchParams, getT(adminSupport)]);
  const rows = tickets.map(ticket => {const user=users.find(item=>item.id===ticket.userId);return {...ticket,customerName:user?`${user.firstName} ${user.paternalLastName}`:t("Cliente no disponible"),lockerCode:user?.lockerCode ?? ""};}).sort((a,b)=>a.updatedAt.localeCompare(b.updatedAt));
  return <><SectionTitle eyebrow={t("Atención al cliente")} title={t("Soporte")} description={t("Una conversación, un seguimiento claro. Responde, revisa y cierra consultas desde el mismo lugar.")} /><SupportDesk tickets={rows} selectedId={query.ticket} /></>;
}
