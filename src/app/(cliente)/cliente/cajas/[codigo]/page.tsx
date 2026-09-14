import { billingDescription } from "@/lib/utils/billing";
import Link from "next/link";
import { PrivateFileLink } from "@/components/ui/private-file-link";
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

export default async function BoxDetail({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const [user, box, rates, shipments] = await Promise.all([requireClientUser(), logisticsService.getBoxByCode(codigo), configService.getCatalog(), logisticsService.getShipments()]);
  if (!box || box.userId !== user.id) notFound();
  const category = rates.find((rate) => rate.id === box.categoryId);
  const shipment = shipments.find((item) => item.id === box.shipmentId);
  return <>
    <Link href="/cliente/cajas" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-navy-500"><ArrowLeft className="size-4" />Mis cajas</Link>
    <SectionTitle eyebrow="Detalle de caja" title={box.code} action={<StatusBadge status={box.status} />} />
    <div className="mt-7 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
      <div className="grid content-start gap-5">
        <Card className="shadow-none">
          <p className="text-xs font-bold uppercase tracking-wider text-navy-400">Categoría asignada</p>
          <p className="mt-3 font-display text-3xl font-bold text-navy-950">{box.categoryName ?? category?.name ?? "Por categorizar"}</p>
          <p className="mt-1 font-display text-xl font-bold text-orange-600">{formatUsd(box.customPriceUsd ?? category?.priceUsd ?? 0)}</p>{box.billing&&<p className="mt-2 text-sm text-navy-500">{billingDescription(box.billing)}</p>}
          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-stone-200 pt-5 text-sm">
            <div><dt className="text-navy-400">Medidas</dt><dd className="mt-1 font-semibold">{box.dimensions.length} × {box.dimensions.width} × {box.dimensions.height} in</dd></div>
            <div><dt className="text-navy-400">Peso</dt><dd className="mt-1 font-semibold">{box.weightLb ? `${box.weightLb} lb` : "Se registra al recibir"}</dd></div>
            <div><dt className="text-navy-400">Tracking de origen</dt><dd className="mt-1 font-semibold">{box.originTracking ?? "No aplica"}</dd></div>
            <div><dt className="text-navy-400">Recepción</dt><dd className="mt-1 font-semibold">{box.receivedAt ? formatDate(box.receivedAt) : "Pendiente"}</dd></div>
          </dl>
          {shipment && <Link href={`/cliente/envios/${shipment.code}`} className="mt-5 inline-flex items-center gap-2 border-t border-stone-200 pt-5 text-sm font-bold text-orange-600">Va en el envío {shipment.code}</Link>}
        </Card>
        <Card className="shadow-none"><h2 className="font-display text-lg font-bold">Recepción y entrega</h2><p className="mt-3 text-sm">Origen: {box.originWarehouseName??"No registrado en esta recepción"}</p>{box.receptionGroup&&<p className="mt-2 font-bold">Pieza {box.receptionGroup.index} de {box.receptionGroup.total} de la misma recepción</p>}{box.recipientSnapshot?<div className="mt-4 grid gap-2 text-sm"><strong>Recibe: {box.recipientSnapshot.name}</strong><a href={`tel:${box.recipientSnapshot.phone}`}>{box.recipientSnapshot.phone}</a><p>{box.recipientSnapshot.address.street} {box.recipientSnapshot.address.exteriorNumber}{box.recipientSnapshot.address.interiorNumber?` int. ${box.recipientSnapshot.address.interiorNumber}`:""}, {box.recipientSnapshot.address.neighborhood}, C.P. {box.recipientSnapshot.address.postalCode}, {box.recipientSnapshot.address.municipality}, {box.recipientSnapshot.address.state}</p><p className="text-xs text-navy-500">Datos registrados en recepción. Para corregir esta entrega contacta a operaciones; editar el directorio no modifica este paquete.</p></div>:<p className="mt-3 text-sm text-navy-500">Destinatario pendiente de seleccionar al crear el envío.</p>}<Link href="/cliente/direcciones" className="mt-4 inline-block text-sm font-bold underline">Gestionar direcciones de entrega</Link></Card>
        <Card className="shadow-none">
          <div className="flex items-center gap-3"><Camera className="size-5 text-orange-500" /><h2 className="font-display text-lg font-bold">Fotos de recepción</h2></div>
          {box.photoFileId ? <div className="mt-4"><PrivateFileLink id={box.photoFileId} name={box.photos?.[0] ?? "Foto de recepción"} /></div> : box.photos?.length
            ? <ul className="mt-4 grid gap-3">{box.photos.map((photo) => <li key={photo} className="flex items-center gap-3 rounded-2xl bg-cream-100 p-4 text-sm text-navy-700"><PackageCheck className="size-5 shrink-0 text-orange-500" />{photo} (registro anterior sin archivo)</li>)}</ul>
            : <p className="mt-4 rounded-2xl bg-cream-100 p-4 text-sm leading-6 text-navy-500">No hay fotos adjuntas. Son opcionales y su ausencia no impide el recorrido del paquete.</p>}
        </Card>
      </div>
      <Card className="shadow-none"><h2 className="font-display text-xl font-bold">Historial</h2><div className="mt-6"><Timeline events={box.timeline} /></div></Card>
    </div>
  </>;
}
