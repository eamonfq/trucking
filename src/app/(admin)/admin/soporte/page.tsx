import { SectionTitle } from "@/components/cliente/section-title";
import { SupportDesk } from "@/components/admin/support-desk";
import { logisticsService } from "@/lib/services/logistics";

export default async function SupportPage({searchParams}:{searchParams:Promise<{ticket?:string}>}) {
  const [tickets, users, query] = await Promise.all([logisticsService.getSupportTickets(), logisticsService.getUsers(), searchParams]);
  const rows = tickets.map(ticket => {const user=users.find(item=>item.id===ticket.userId);return {...ticket,customerName:user?`${user.firstName} ${user.paternalLastName}`:"Cliente no disponible",lockerCode:user?.lockerCode ?? ""};}).sort((a,b)=>a.updatedAt.localeCompare(b.updatedAt));
  return <><SectionTitle eyebrow="Atención al cliente" title="Soporte" description="Una conversación, un seguimiento claro. Responde, revisa y cierra consultas desde el mismo lugar." /><SupportDesk tickets={rows} selectedId={query.ticket} /></>;
}
