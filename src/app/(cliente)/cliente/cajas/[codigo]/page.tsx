import {formatDimensions} from "@/lib/utils/format";
import {formatDeliveryAddress} from "@/lib/utils/address-display";
import {boxWeightLabel} from "@/lib/utils/reception-display";
import { billingDescription } from "@/lib/utils/billing";
import Link from "next/link";
import { PrivatePhoto } from "@/components/ui/private-photo";
import { notFound } from "next/navigation";
import { ArrowLeft, Camera, PackageCheck } from "lucide-react";
import { SectionTitle } from "@/components/cliente/section-title";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Timeline } from "@/components/ui/timeline";
import { requireClientUser } from "@/lib/auth/actions";
import { configService } from "@/lib/services/config";
import { logisticsService } from "@/lib/services/logistics";
import { formatDate, formatUsd } from "@/lib/utils/format";
import { clientPages, clientRecords } from "@/lib/i18n/catalogs/client-pages";
import { getLocale, getMessageTranslator, getT } from "@/lib/i18n/server";
import { localizeCategoryName } from "@/lib/utils/reception-display";

export default async function BoxDetail({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const [user, box, rates, shipments] = await Promise.all([requireClientUser(), logisticsService.getBoxByCode(codigo), configService.getCatalog(), logisticsService.getShipments()]);
  const [t, tr, locale] = await Promise.all([getT(clientPages), getMessageTranslator(clientRecords), getLocale()]);
  if (!box || box.userId !== user.id) notFound();
  const category = rates.find((rate) => rate.id === box.categoryId);
  const shipment = shipments.find((item) => item.id === box.shipmentId);
  return <>
    <Link href="/cliente/cajas" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-navy-500"><ArrowLeft className="size-4" />{t("Mis cajas")}</Link>
    <SectionTitle eyebrow={t("Detalle de caja")} title={box.code} action={<StatusBadge status={box.status} />} />
    <div className="mt-7 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
      <div className="grid content-start gap-5">
        <Card className="shadow-none">
          <p className="text-xs font-bold uppercase tracking-wider text-navy-400">{t("Categoría asignada")}</p>
          <p className="mt-3 font-display text-3xl font-bold text-navy-950">{box.categoryName ? localizeCategoryName(box.categoryName, locale) : category?.name ?? t("Por categorizar")}</p>
          <p className="mt-1 font-display text-xl font-bold text-orange-600">{formatUsd(box.billing?.amountUsd??box.customPriceUsd ?? category?.priceUsd ?? 0)}</p>{box.receptionConcept&&<p className="mt-3 text-sm text-navy-500">{t("Concepto: {description} · {quantity} piezas · {total} en total.", { description: box.receptionConcept.description, quantity: box.receptionConcept.quantity, total: formatUsd(box.receptionConcept.totalAmountUsd) })}</p>}{box.billing&&<p className="mt-2 text-sm text-navy-500">{tr(billingDescription(box.billing))}</p>}{box.contentsNote&&<div className="mt-5 rounded-xl bg-cream-100 p-4"><p className="text-xs font-bold uppercase tracking-wider text-navy-500">{t("Contenido / nota de carga")}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-navy-900">{box.contentsNote}</p></div>}
          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-stone-200 pt-5 text-sm">
            <div><dt className="text-navy-400">{t("Medidas")}</dt><dd className="mt-1 font-semibold">{formatDimensions(box.dimensions, locale)}</dd></div>
            <div><dt className="text-navy-400">{t("Peso registrado")}</dt><dd className="mt-1 font-semibold">{boxWeightLabel(box, locale)}</dd></div>
            <div><dt className="text-navy-400">{t("Tracking de origen")}</dt><dd className="mt-1 font-semibold">{box.originTracking ?? t("No aplica")}</dd></div>
            <div><dt className="text-navy-400">{t("Recepción")}</dt><dd className="mt-1 font-semibold">{box.receivedAt ? formatDate(box.receivedAt, locale) : t("Pendiente")}</dd></div>
          </dl>
          {shipment && <Link href={`/cliente/envios/${shipment.code}`} className="mt-5 inline-flex items-center gap-2 border-t border-stone-200 pt-5 text-sm font-bold text-orange-600">{t("Va en el envío {code}", { code: shipment.code })}</Link>}
        </Card>
        <Card className="shadow-none"><h2 className="font-display text-lg font-bold">{t("Recepción y entrega")}</h2><p className="mt-3 text-sm">{t("Origen: {name}", { name: box.originWarehouseName??t("No registrado en esta recepción") })}</p>{box.receptionGroup&&<p className="mt-2 font-bold">{t("Pieza {index} de {total} de la misma recepción", { index: box.receptionGroup.index, total: box.receptionGroup.total })}</p>}{box.recipientSnapshot?<div className="mt-4 grid gap-2 text-sm"><strong>{t("Recibe: {name}", { name: box.recipientSnapshot.name })}</strong><a href={`tel:${box.recipientSnapshot.phone}`}>{box.recipientSnapshot.phone}</a><p>{formatDeliveryAddress(box.recipientSnapshot.address) || t("Referencia de entrega pendiente")}</p><p className="text-xs text-navy-500">{t("Datos registrados en recepción. Para corregir esta entrega contacta a operaciones; editar el directorio no modifica este paquete.")}</p></div>:<p className="mt-3 text-sm text-navy-500">{t("Destinatario pendiente de seleccionar al crear el envío.")}</p>}<Link href="/cliente/direcciones" className="mt-4 inline-block text-sm font-bold underline">{t("Gestionar direcciones de entrega")}</Link></Card>
        <Card className="shadow-none">
          <div className="flex items-center gap-3"><Camera className="size-5 text-orange-500" /><h2 className="font-display text-lg font-bold">{t("Fotos de recepción")}</h2></div>
          {box.photoFileId ? <div className="mt-4"><PrivatePhoto key={box.photoFileId} id={box.photoFileId} name={box.photos?.[0] ?? t("Foto de recepción")} /></div> : box.photos?.length
            ? <ul className="mt-4 grid gap-3">{box.photos.map((photo) => <li key={photo} className="flex items-center gap-3 rounded-2xl bg-cream-100 p-4 text-sm text-navy-700"><PackageCheck className="size-5 shrink-0 text-orange-500" />{t("{photo} (registro anterior sin archivo)", { photo })}</li>)}</ul>
            : <p className="mt-4 rounded-2xl bg-cream-100 p-4 text-sm leading-6 text-navy-500">{t("No hay fotos adjuntas. Son opcionales y su ausencia no impide el recorrido del paquete.")}</p>}
        </Card>
      </div>
      <Card className="shadow-none"><h2 className="font-display text-xl font-bold">{t("Historial")}</h2><div className="mt-6"><Timeline events={box.timeline} /></div></Card>
    </div>
  </>;
}
