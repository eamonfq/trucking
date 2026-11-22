import { FileText } from "lucide-react";
import Link from "@/components/admin/admin-access";
import { requireAdminUser } from "@/lib/auth/actions";
import { SectionTitle } from "@/components/cliente/section-title";
import { TruckManager } from "@/components/admin/truck-manager";
import { logisticsService } from "@/lib/services/logistics";
import { trucksManager } from "@/lib/i18n/catalogs/trucks-manager";
import { getT } from "@/lib/i18n/server";
export default async function TrucksPage() { await requireAdminUser(["camiones"]); const [trucks, drivers, t] = await Promise.all([logisticsService.getTrucks(), logisticsService.getDrivers(), getT(trucksManager)]); return <><SectionTitle eyebrow={t("Guías máster")} title={t("Camiones")} description={t("Planifica salidas, controla capacidad y coordina cada etapa del recorrido a México.")} action={<Link href="/admin/camiones/bill-of-lading" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-stone-200 bg-white px-4 text-sm font-bold"><FileText className="size-4" />Bill of Lading</Link>} /><div className="mt-7"><TruckManager initial={trucks} initialDrivers={drivers} /></div></>; }
