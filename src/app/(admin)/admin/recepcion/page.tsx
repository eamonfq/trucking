import { requireAdminUser } from "@/lib/auth/actions";
import { warehouseSupports } from "@/lib/config/warehouses";
import { getOperationalLocations } from "@/lib/auth/warehouse-actions";
import { SectionTitle } from "@/components/cliente/section-title";
import { ReceptionForm } from "@/components/admin/reception-form";
import { configService } from "@/lib/services/config";
import { logisticsService } from "@/lib/services/logistics";
import { receptionForm } from "@/lib/i18n/catalogs/reception-form";
import { getT } from "@/lib/i18n/server";
export default async function ReceptionPage({ searchParams }: { searchParams: Promise<{ customer?: string; prealert?: string }> }) { await requireAdminUser(["recepcion"]); const [{ customer, prealert }, users, boxes, flow, rates, locations] = await Promise.all([searchParams, logisticsService.getUsers(), logisticsService.getBoxes(), configService.getFlowConfig(), configService.getRateTable(), getOperationalLocations()]); const t = await getT(receptionForm); return <><SectionTitle eyebrow={t("Ingreso a bodega")} title={t("Recepción")} description={t("Registra el cliente, el destinatario y tus paquetes. Elige cobro por peso, volumen o carga especial.")} /><div className="mt-4"><ReceptionForm origins={locations.warehouses.filter(w=>w.active&&warehouseSupports(w,"origen"))} locations={locations.warehouses.filter(w=>w.active)} weightPricing={flow} users={users} prealerts={boxes.filter(box => box.status === "pre-alertada")} excessPolicy={flow.excessPolicy} excessFeeUsd={flow.excessFeeUsd} rates={rates} defaultCustomerId={customer} defaultPrealertId={prealert} /></div></>; }
