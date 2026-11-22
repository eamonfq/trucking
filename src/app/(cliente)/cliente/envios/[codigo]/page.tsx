import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Box, Truck, UserRound } from "lucide-react";
import { SectionTitle } from "@/components/cliente/section-title";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Timeline } from "@/components/ui/timeline";
import { requireClientUser } from "@/lib/auth/actions";
import { configService } from "@/lib/services/config";
import { logisticsService } from "@/lib/services/logistics";
import { formatDate, formatUsd } from "@/lib/utils/format";
import { formatDeliveryAddress } from "@/lib/utils/address-display";
import { clientPages } from "@/lib/i18n/catalogs/client-pages";
import { getLocale, getT } from "@/lib/i18n/server";

export default async function ShipmentDetail({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const [user, shipments, boxes, recipients, trucks, rates] = await Promise.all([requireClientUser(), logisticsService.getShipments(), logisticsService.getBoxes(), logisticsService.getRecipients(), logisticsService.getTrucks(), configService.getCatalog()]);
  const [t, locale] = await Promise.all([getT(clientPages), getLocale()]);
  const shipment = shipments.find((item) => item.code.toLowerCase() === codigo.toLowerCase());
  if (!shipment || shipment.userId !== user.id) notFound();
  const shipmentBoxes = boxes.filter((box) => shipment.boxIds.includes(box.id));
  const recipient = shipment.recipientSnapshot ?? recipients.find((item) => item.id === shipment.recipientId);
  const truck = trucks.find((item) => item.id === shipment.truckId);
  const total = shipmentBoxes.reduce((sum, box) => sum + (box.customPriceUsd ?? rates.find((rate) => rate.id === box.categoryId)?.priceUsd ?? 0), 0);
  return <>
    <Link href="/cliente/envios" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-navy-500"><ArrowLeft className="size-4" />{t("Mis envíos")}</Link>
    <SectionTitle eyebrow={t("Detalle de envío")} title={shipment.code} action={<StatusBadge status={shipment.status} />} />
    <div className="mt-7 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
      <div className="grid content-start gap-5">
        <Card className="shadow-none">
          <div className="flex items-center gap-3"><Truck className="size-5 text-orange-500" /><div><p className="text-xs text-navy-400">{t("Guía máster")}</p><p className="font-bold text-navy-900">{truck ? t("{code} · salida {date}", { code: truck.code, date: formatDate(truck.departureDate, locale) }) : t("Pendiente de asignación")}</p></div></div>
          <div className="mt-5 flex items-center gap-3 border-t border-stone-200 pt-5"><UserRound className="size-5 text-orange-500" /><div><p className="text-xs text-navy-400">{t("Recibe")}</p><p className="font-bold text-navy-900">{recipient ? recipient.name : t("Destinatario no disponible")}</p>{recipient&&<a className="text-sm underline" href={`tel:${recipient.phone}`}>{recipient.phone}</a>}</div></div>
          <div className="mt-5 border-t border-stone-200 pt-5"><p className="text-xs text-navy-400">{t("Destino")}</p><p className="mt-1 font-bold">{shipment.destinationCity}</p>{shipment.recipientSnapshot&&<p className="mt-2 text-sm">{formatDeliveryAddress(shipment.recipientSnapshot.address)}</p>}</div>
          <div className="mt-5 flex items-baseline justify-between border-t border-stone-200 pt-5"><p className="text-xs text-navy-400">{t("Total por categorías")}</p><p className="font-display text-xl font-bold text-orange-600">{formatUsd(total)}</p></div>
        </Card>
        <Card className="shadow-none">
          <h2 className="font-display text-lg font-bold">{t("Cajas del envío")}</h2>
          <div className="mt-4 grid gap-3">{shipmentBoxes.map((box) => <Link key={box.id} href={`/cliente/cajas/${box.code}`} className="flex items-center justify-between gap-3 rounded-xl bg-cream-100 p-3 transition hover:bg-cream-50"><span className="flex items-center gap-2 text-sm font-bold"><Box className="size-4 text-orange-500" />{box.code}<span className="font-normal text-navy-500">{rates.find((rate) => rate.id === box.categoryId)?.name}</span></span><StatusBadge status={box.status} /></Link>)}</div>
        </Card>
      </div>
      <Card className="shadow-none"><h2 className="font-display text-xl font-bold">{t("Historial")}</h2><div className="mt-6"><Timeline events={shipment.timeline} /></div></Card>
    </div>
  </>;
}
