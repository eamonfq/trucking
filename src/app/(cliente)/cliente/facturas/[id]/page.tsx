import Link from "next/link";
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
  const [user, invoices] = await Promise.all([requireClientUser(), logisticsService.getInvoices()]);
  const invoice = invoices.find((item) => item.id === id && item.userId === user.id);
  if (!invoice) notFound();
  const total = invoiceTotal(invoice);
  return <>
    <Link href="/cliente/facturas" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-navy-500"><ArrowLeft className="size-4" />Mis facturas</Link>
    <SectionTitle eyebrow="Detalle de factura" title={invoice.number} description={`Emitida el ${formatDate(invoice.issuedAt)} · vence el ${formatDate(invoice.dueAt)}`} action={<div className="flex flex-wrap items-center gap-3"><StatusBadge status={invoice.status} /><a href={`/api/facturas/${invoice.id}/pdf`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-navy-950 px-5 text-sm font-bold text-white"><Download className="size-4" />Descargar PDF</a></div>} />
    <div className="mt-7 grid gap-5 lg:grid-cols-[1.1fr_.7fr]">
      <div className="grid gap-5">
        <Card className="shadow-none">
          <h2 className="font-display text-xl font-bold">Desglose</h2>
          <div className="mt-5 divide-y divide-stone-200">{invoice.lines.map((line) => <div key={line.categoryId} className="flex justify-between gap-4 py-4"><div><p className="font-bold text-navy-900">{line.quantity} × {getBoxCategory(line.categoryId)?.name}</p><p className="mt-1 text-xs text-navy-500">{formatUsd(line.unitPriceUsd)} cada una</p></div><p className="font-bold">{formatUsd(line.quantity * line.unitPriceUsd)}</p></div>)}</div>
          <dl className="mt-5 grid gap-3 border-t-2 border-navy-950 pt-5 text-sm">
            <Total label="Subtotal" value={formatUsd(invoiceSubtotal(invoice))} />
            <Total label="Seguro opcional" value={formatUsd(invoice.insuranceUsd)} />
            <Total label="Entrega a domicilio" value={formatUsd(invoice.homeDeliveryUsd)} />
            <Total label="Total" value={formatUsd(total)} strong />
          </dl>
        </Card>
        <Card className="shadow-none"><h2 className="font-display text-xl font-bold">Historial</h2><div className="mt-5"><Timeline events={invoice.timeline} /></div></Card>
      </div>
      <Card className="h-fit shadow-none">
        <h2 className="font-display text-xl font-bold">Pago</h2>
        {["emitida", "vencida"].includes(invoice.status)
          ? <>
              {invoice.paymentReviewNote && <p className="mt-4 rounded-2xl bg-danger-50 p-4 text-sm leading-6 text-danger-700"><strong className="block">Tu reporte anterior fue rechazado</strong>{invoice.paymentReviewNote}</p>}
              <p className="mt-4 text-sm leading-6 text-navy-500">Adjunta la referencia y el comprobante para que Operaciones valide el pago.</p>
              <div className="mt-5"><PaymentForm invoiceId={invoice.id} amount={total} /></div>
            </>
          : invoice.status === "pago-reportado"
            ? <div className="mt-5 rounded-2xl bg-orange-50 p-4 text-sm text-navy-700"><p className="font-bold text-orange-700">Comprobante en revisión</p><p className="mt-2">Monto: {formatUsd(invoice.paymentReport?.amountUsd ?? total)}</p><p className="mt-1">Referencia: {invoice.paymentReport?.reference}</p><p className="mt-1">Archivo: {invoice.paymentReport?.receiptName ?? "Sin archivo"}</p></div>
            : invoice.status === "pagada"
              ? <p className="mt-4 rounded-2xl bg-success-50 p-4 text-sm font-bold text-success-700">Pago validado por Operaciones A&amp;L.</p>
              : <p className="mt-4 text-sm text-navy-500">La factura debe emitirse antes de recibir un reporte de pago.</p>}
      </Card>
    </div>
  </>;
}

function Total({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex justify-between ${strong ? "font-display text-xl font-bold" : ""}`}><dt>{label}</dt><dd className={strong ? "text-orange-600" : undefined}>{value}</dd></div>;
}
