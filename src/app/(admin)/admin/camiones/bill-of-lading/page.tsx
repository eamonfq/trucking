import { ArrowLeft } from "lucide-react";
import Link from "@/components/admin/admin-access";
import { BillOfLadingList } from "@/components/admin/bill-of-lading-list";
import { SectionTitle } from "@/components/cliente/section-title";
import { requireAdminUser } from "@/lib/auth/actions";
import { billOfLadingService } from "@/lib/services/bill-of-lading";
import { logisticsService } from "@/lib/services/logistics";

export default async function BillsOfLadingPage() {
  await requireAdminUser(["camiones"]);
  const [bills, trucks] = await Promise.all([billOfLadingService.list(), logisticsService.getTrucks()]);
  const options = [...trucks].sort((a, b) => b.departureDate.localeCompare(a.departureDate)).map((truck) => ({ id: truck.id, code: truck.code, route: truck.route, departureDate: truck.departureDate, pieces: truck.boxIds.length }));
  return <><Link href="/admin/camiones" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-navy-500 hover:text-orange-600"><ArrowLeft className="size-4" />Volver a camiones</Link><SectionTitle eyebrow="Camiones" title="Bill of Lading" description="Documentos con el formato short form del transportista. Se crean desde un camión, con la carga agrupada por cantidad, o en blanco, y todos sus datos se pueden editar." /><div className="mt-7"><BillOfLadingList bills={bills} trucks={options} /></div></>;
}
