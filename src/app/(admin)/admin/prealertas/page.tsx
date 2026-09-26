import { requireAdminUser } from "@/lib/auth/actions";
import { PrealertManager } from "@/components/admin/prealert-manager";
import { logisticsService } from "@/lib/services/logistics";
import { SectionTitle } from "@/components/cliente/section-title";
export default async function Page(){ await requireAdminUser(["prealertas"]);const [users,boxes]=await Promise.all([logisticsService.getUsers(),logisticsService.getBoxes()]);return <><SectionTitle eyebrow="Antes de recibir" title="Prealertas" description="Crea, edita y asigna las compras pendientes a su cliente."/><div className="mt-7"><PrealertManager users={users} boxes={boxes}/></div></>;}
