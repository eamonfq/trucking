import Link from "next/link";
import { SectionTitle } from "@/components/cliente/section-title";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireClientUser } from "@/lib/auth/actions";
import { logisticsService } from "@/lib/services/logistics";
import { formatDate, formatUsd } from "@/lib/utils/format";
import { invoiceTotal } from "@/lib/utils/invoices";

type Movement = { id: string; at: string; kind: "cargo" | "reporte" | "pago"; label: string; detail: string; invoiceId: string; amount: number };

const KIND_COPY: Record<Movement["kind"], { label: string; className: string }> = {
  cargo: { label: "Cargo", className: "bg-navy-100 text-navy-700" },
  reporte: { label: "Pago reportado", className: "bg-[#fff8e8] text-[#8a4d00]" },
  pago: { label: "Pago validado", className: "bg-success-50 text-success-700" },
};

export default async function AccountStatementPage() {
  const [user, allInvoices] = await Promise.all([requireClientUser(), logisticsService.getInvoices()]);
  const invoices = allInvoices.filter((item) => item.userId === user.id && item.status !== "borrador");
  const charges = invoices.reduce((sum, invoice) => sum + invoiceTotal(invoice), 0);
  const settled = invoices.filter((invoice) => invoice.status === "pagada").reduce((sum, invoice) => sum + invoiceTotal(invoice), 0);
  const balance = charges - settled;
  const movements: Movement[] = [];
  invoices.forEach((invoice) => {
    const total = invoiceTotal(invoice);
    movements.push({ id: `${invoice.id}-cargo`, at: invoice.issuedAt, kind: "cargo", label: invoice.number, detail: `${invoice.lines.reduce((sum, line) => sum + line.quantity, 0)} cajas facturadas · vence ${formatDate(invoice.dueAt)}`, invoiceId: invoice.id, amount: total });
    if (invoice.paymentReport) movements.push({ id: `${invoice.id}-reporte`, at: invoice.paymentReport.reportedAt, kind: "reporte", label: invoice.number, detail: `${invoice.paymentReport.method} · referencia ${invoice.paymentReport.reference}`, invoiceId: invoice.id, amount: -invoice.paymentReport.amountUsd });
    if (invoice.status === "pagada") {
      const validated = invoice.timeline.findLast((event) => event.to === "pagada");
      movements.push({ id: `${invoice.id}-pago`, at: validated?.at ?? invoice.issuedAt, kind: "pago", label: invoice.number, detail: validated?.note ?? "Pago aplicado por Operaciones A&L.", invoiceId: invoice.id, amount: -total });
    }
  });
  movements.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return <>
    <SectionTitle eyebrow="Finanzas" title="Estado de cuenta" description="Revisa cargos, pagos reportados y el saldo vigente de tu cuenta." />
    <div className="mt-7 grid gap-4 sm:grid-cols-3">
      <Card className="bg-navy-950 text-white"><p className="text-sm text-white/55">Saldo actual</p><p className="mt-2 font-display text-4xl font-bold text-orange-400">{formatUsd(balance)}</p></Card>
      <Card className="shadow-none"><p className="text-sm text-navy-500">Total facturado</p><p className="mt-2 font-display text-3xl font-bold text-navy-950">{formatUsd(charges)}</p></Card>
      <Card className="shadow-none"><p className="text-sm text-navy-500">Pagos aplicados</p><p className="mt-2 font-display text-3xl font-bold text-success-700">{formatUsd(settled)}</p></Card>
    </div>
    <div className="mt-5">{movements.length ? <div className="overflow-x-auto rounded-card border border-stone-200 bg-white"><table className="w-full min-w-[680px] text-sm"><thead className="bg-cream-100 text-left text-xs uppercase tracking-wider text-navy-500"><tr><th className="p-4">Fecha</th><th className="p-4">Movimiento</th><th className="p-4">Detalle</th><th className="p-4 text-right">Importe</th></tr></thead><tbody className="divide-y divide-stone-200">{movements.map((movement) => <tr key={movement.id}>
      <td className="whitespace-nowrap p-4 text-navy-500">{formatDate(movement.at)}</td>
      <td className="p-4"><span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${KIND_COPY[movement.kind].className}`}>{KIND_COPY[movement.kind].label}</span><Link href={`/cliente/facturas/${movement.invoiceId}`} className="ml-3 font-bold text-navy-950 hover:text-orange-600">{movement.label}</Link></td>
      <td className="p-4 text-navy-500">{movement.detail}</td>
      <td className={`p-4 text-right font-bold ${movement.amount < 0 ? "text-success-700" : "text-navy-950"}`}>{movement.amount < 0 ? `− ${formatUsd(Math.abs(movement.amount))}` : formatUsd(movement.amount)}</td>
    </tr>)}</tbody></table></div> : <EmptyState title="Sin movimientos financieros" description="Los cargos aparecerán cuando se emita tu primera factura." />}</div>
  </>;
}
