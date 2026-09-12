import type { Box, Invoice } from "@/lib/types";
export function deliveryPaymentError(box:Box,invoices:Invoice[],packages:Box[]=[box]) {
  const related=box.shipmentId?packages.filter(b=>b.userId===box.userId&&b.shipmentId===box.shipmentId):[box];
  const linked=invoices.filter(i=>i.userId===box.userId&&(i.boxIds?.length?related.some(b=>i.boxIds!.includes(b.id)):Boolean(box.shipmentId&&i.shipmentId===box.shipmentId)));
  if(!linked.length||related.some(b=>!linked.some(i=>i.boxIds?.length?i.boxIds.includes(b.id):i.shipmentId===b.shipmentId)))return "Entrega bloqueada: falta generar y liquidar la factura de este paquete.";
  if(linked.some(i=>i.status!=="pagada"))return "Entrega bloqueada: el envío tiene pagos pendientes de liquidar o validar.";
  return null;
}
