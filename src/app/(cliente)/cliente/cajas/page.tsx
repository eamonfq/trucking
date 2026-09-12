import { ClientBoxList } from "@/components/cliente/box-list";
import { SectionTitle } from "@/components/cliente/section-title";
import { requireClientUser } from "@/lib/auth/actions";
import { configService } from "@/lib/services/config";
import { logisticsService } from "@/lib/services/logistics";

export default async function BoxesPage() {
  const [user, allBoxes, rates] = await Promise.all([requireClientUser(), logisticsService.getBoxes(), configService.getCatalog()]);
  return <><SectionTitle eyebrow="Inventario" title="Mis cajas" description="Consulta categoría, medidas, precio e historial de cada caja." /><div className="mt-7"><ClientBoxList boxes={allBoxes.filter((box) => box.userId === user.id)} rates={rates} /></div></>;
}
