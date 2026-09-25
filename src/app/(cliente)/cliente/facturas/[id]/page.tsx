import {CloverCheckout} from "@/components/payments/clover-checkout";
import { PaymentHistory } from "@/components/admin/payment-history";
import Link from "next/link";
import { PrivateFileLink } from "@/components/ui/private-file-link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { PaymentForm } from "@/components/cliente/payment-form";
import { SectionTitle } from "@/components/cliente/section-title";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Timeline } from "@/components/ui/timeline";
import { requireClientUser } from "@/lib/auth/actions";
import { getBoxCategory } from "@/lib/config/box-categories";
import { logisticsService } from "@/lib/services/logistics";
import { formatDate, formatUsd } from "@/lib/utils/format";
import { invoiceSubtotal, invoiceTotal } from "@/lib/utils/invoices";

export default async function InvoiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, invoices, shipments] = await Promise.all([requireClientUser(), logisticsService.getInvoices(), logisticsService.getShipments()]);
  const invoice = invoices.find((item) => item.id === id && item.userId === user.id);
  if (!invoice) notFound();
  const total = invoiceTotal(invoice);
  return <>
    <Link href="/cliente/facturas" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-navy-500"><ArrowLeft className="size-4" />Mis facturas</Link>
    <SectionTitle eyebrow="Detalle de factura" title={invoice.number} description={`Emitida el ${formatDate(invoice.issuedAt)} · vence el ${formatDate(invoice.dueAt)}`} action={<div className="flex flex-wrap items-center gap-3"><StatusBadge status={invoice.status} /><a href={`/api/facturas/${invoice.id}/pdf`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-navy-950 px-5 text-sm font-bold text-white"><Download className="size-4" />Descargar PDF</a><a href={`/api/facturas/${invoice.id}/pdf?formato=termico`} target="_blank" className="inline-flex min-h-11 items-center rounded-full border border-stone-300 px-5 text-sm font-semibold">Voucher 80 mm</a></div>} />
    <div className="mt-7 grid gap-5 lg:grid-cols-[1.1fr_.7fr]">
      <div className="grid gap-5">
        <Card className="shadow-none">
          <h2 className="font-display text-xl font-bold">Desglose</h2>
          <PaymentHistory shipments={shipments} invoice={invoice}/><div className="mt-5 divide-y divide-stone-200">{invoice.lines.map((line, lineIndex) => <div key={`${line.categoryId}-${line.unitPriceUsd}-${lineIndex}`} className="flex justify-between gap-4 py-4"><div><p className="font-bold text-navy-900">{line.quantity} × {line.categoryName ?? getBoxCategory(line.categoryId)?.name ?? line.categoryId}{line.description ? ` — ${line.description}` : ""}</p><p className="mt-1 text-xs text-navy-500">{formatUsd(line.unitPriceUsd)} cada una</p></div><p className="font-bold">{formatUsd(line.quantity * line.unitPriceUsd)}</p></div>)}</div>
          <dl className="mt-5 grid gap-3 border-t-2 border-navy-950 pt-5 text-sm">
            <Total label="Subtotal" value={formatUsd(invoiceSubtotal(invoice))} />
            <Total label="Recargo por excedente" value={formatUsd(invoice.excessFeeUsd ?? 0)} />
            <Total label="Seguro opcional" value={formatUsd(invoice.insuranceUsd)} />
            <Total label="Entrega a domicilio" value={formatUsd(invoice.homeDeliveryUsd)} />
            <Total label="Total" value={formatUsd(total)} strong />
          </dl>
        </Card>
        <Card className="shadow-none"><h2 className="font-display text-xl font-bold">Historial</h2><div className="mt-5"><Timeline events={invoice.timeline} /></div></Card>
      </div>
      <Card className="h-fit shadow-none">
        <h2 className="font-display text-xl font-bold">Pago</h2>
        {invoice.collectionReferences?.map((entry,index)=><p key={index} className="my-3 break-words text-sm"><strong>Comprobante ({entry.method}):</strong> {entry.reference}</p>)}{Boolean(invoice.receiptFiles?.length) && <div className="my-4 grid gap-3"><p className="text-xs font-semibold text-ink-500">Comprobantes conservados</p>{invoice.receiptFiles!.map(file=><PrivateFileLink key={file.id} id={file.id} name={file.name} />)}</div>}
        {invoice.status === "pendiente-pago-destino" ? <div className="mt-4 grid gap-4"><p className="rounded-xl bg-warning-50 p-4 text-sm">Pendiente de pago en destino: {formatUsd(total)}. Puedes liquidar en línea con Clover antes de recoger tu mercancía.</p><CloverCheckout invoiceIds={[invoice.id]}/></div> : ["emitida", "vencida"].includes(invoice.status)
          ? <>
              {invoice.paymentReviewNote && <p className="mt-4 rounded-2xl bg-danger-50 p-4 text-sm leading-6 text-danger-700"><strong className="block">Tu reporte anterior fue rechazado</strong>{invoice.paymentReviewNote}</p>}
              <p className="mt-4 text-sm leading-6 text-navy-500">Registra los datos del pago para su validación. Adjuntar un comprobante es opcional.</p>
              <div className="mt-5"><PaymentForm invoiceId={invoice.id} amount={total} cloverPending={Boolean(invoice.cloverPaymentId)} /></div>
            </>
          : invoice.status === "pago-reportado"
            ? <div className="mt-5 rounded-2xl bg-orange-50 p-4 text-sm text-navy-700"><p className="font-bold text-orange-700">Comprobante en revisión</p><p className="mt-2">Monto: {formatUsd(invoice.paymentReport?.amountUsd ?? total)}</p><p className="mt-1">Referencia: {invoice.paymentReport?.reference}</p><p className="mt-1">Archivo: {invoice.paymentReport?.receiptName ?? "Sin archivo"}</p></div>
            : invoice.status === "pagada"
              ? <p className="mt-4 rounded-2xl bg-success-50 p-4 text-sm font-bold text-success-700">{invoice.collectionMethod==="clover"?"Pago confirmado por Clover.":"Pago validado por Operaciones A&L."}</p>
              : <p className="mt-4 text-sm text-navy-500">La factura debe emitirse antes de recibir un reporte de pago.</p>}
      </Card>
    </div>
  </>;
}

function Total({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex justify-between ${strong ? "font-display text-xl font-bold" : ""}`}><dt>{label}</dt><dd className={strong ? "text-orange-600" : undefined}>{value}</dd></div>;
}
