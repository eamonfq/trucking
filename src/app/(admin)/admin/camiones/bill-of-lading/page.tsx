import { ArrowLeft } from "lucide-react";
import Link from "@/components/admin/admin-access";
import { BillOfLadingList } from "@/components/admin/bill-of-lading-list";
import { SectionTitle } from "@/components/cliente/section-title";
import { requireAdminUser } from "@/lib/auth/actions";
import { billOfLadingService } from "@/lib/services/bill-of-lading";
import { logisticsService } from "@/lib/services/logistics";
import { trucksBillOfLading } from "@/lib/i18n/catalogs/trucks-bill-of-lading";
import { getLocale, getT } from "@/lib/i18n/server";
import { localizeTruckRoute } from "@/lib/utils/reception-display";

export default async function BillsOfLadingPage() {
  await requireAdminUser(["camiones"]);
  const [bills, trucks, t, locale] = await Promise.all([billOfLadingService.list(), logisticsService.getTrucks(), getT(trucksBillOfLading), getLocale()]);
  const options = [...trucks].sort((a, b) => b.departureDate.localeCompare(a.departureDate)).map((truck) => ({ id: truck.id, code: truck.code, route: localizeTruckRoute(truck.route, locale), departureDate: truck.departureDate, pieces: truck.boxIds.length }));
  return <><Link href="/admin/camiones" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-navy-500 hover:text-orange-600"><ArrowLeft className="size-4" />{t("Volver a camiones")}</Link><SectionTitle eyebrow={t("Camiones")} title="Bill of Lading" description={t("Documentos con el formato short form del transportista. Se crean desde un camión, con la carga agrupada por cantidad, o en blanco, y todos sus datos se pueden editar.")} /><div className="mt-7"><BillOfLadingList bills={bills} trucks={options} /></div></>;
}
