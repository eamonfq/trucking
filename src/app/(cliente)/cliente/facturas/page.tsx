import Link from "next/link";
import { SectionTitle } from "@/components/cliente/section-title";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/badge";
import { requireClientUser } from "@/lib/auth/actions";
import { logisticsService } from "@/lib/services/logistics";
import { formatDate, formatUsd } from "@/lib/utils/format";
import { invoiceTotal } from "@/lib/utils/invoices";

export default async function InvoicesPage() {
  const [user, allInvoices] = await Promise.all([requireClientUser(), logisticsService.getInvoices()]);
  const invoices = allInvoices.filter((item) => item.userId === user.id);
  return <><SectionTitle eyebrow="Cobros" title="Mis facturas" description="Consulta cada cargo por categoría, vencimiento, pago y PDF." /><div className="mt-7">{invoices.length ? <div className="overflow-x-auto rounded-card border border-stone-200 bg-white"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-cream-100 text-xs uppercase tracking-wider text-navy-500"><tr><th className="p-4">Factura</th><th className="p-4">Emisión</th><th className="p-4">Vencimiento</th><th className="p-4">Estado</th><th className="p-4 text-right">Total</th></tr></thead><tbody className="divide-y divide-stone-200">{invoices.map((invoice) => <tr key={invoice.id}><td className="p-4"><Link href={`/cliente/facturas/${invoice.id}`} className="font-bold text-navy-950 hover:text-orange-600">{invoice.number}</Link></td><td className="p-4 text-navy-500">{formatDate(invoice.issuedAt)}</td><td className="p-4 text-navy-500">{formatDate(invoice.dueAt)}</td><td className="p-4"><StatusBadge status={invoice.status} /></td><td className="p-4 text-right font-display font-bold text-navy-950">{formatUsd(invoiceTotal(invoice))}</td></tr>)}</tbody></table></div> : <EmptyState title="Todavía no tienes facturas" description="Cuando se genere un cargo podrás consultarlo y descargarlo aquí." />}</div></>;
}
