import Link from "next/link";
import { SectionTitle } from "@/components/cliente/section-title";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/badge";
import { requireClientUser } from "@/lib/auth/actions";
import { logisticsService } from "@/lib/services/logistics";
import { formatDate, formatUsd } from "@/lib/utils/format";
import { invoiceTotal } from "@/lib/utils/invoices";
import { clientPages } from "@/lib/i18n/catalogs/client-pages";
import { getLocale, getT } from "@/lib/i18n/server";

export default async function InvoicesPage() {
  const [user, allInvoices, t, locale] = await Promise.all([requireClientUser(), logisticsService.getInvoices(), getT(clientPages), getLocale()]);
  const invoices = allInvoices.filter((item) => item.userId === user.id);
  return <><SectionTitle eyebrow={t("Cobros")} title={t("Mis facturas")} description={t("Consulta cada cargo por categoría, vencimiento, pago y PDF.")} /><div className="mt-7">{invoices.length ? <div className="overflow-x-auto rounded-card border border-stone-200 bg-white"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-cream-100 text-xs uppercase tracking-wider text-navy-500"><tr><th className="p-4">{t("Factura")}</th><th className="p-4">{t("Emisión")}</th><th className="p-4">{t("Vencimiento")}</th><th className="p-4">{t("Estado")}</th><th className="p-4 text-right">{t("Total")}</th></tr></thead><tbody className="divide-y divide-stone-200">{invoices.map((invoice) => <tr key={invoice.id}><td className="p-4"><Link href={`/cliente/facturas/${invoice.id}`} className="font-bold text-navy-950 hover:text-orange-600">{invoice.number}</Link></td><td className="p-4 text-navy-500">{formatDate(invoice.issuedAt, locale)}</td><td className="p-4 text-navy-500">{formatDate(invoice.dueAt, locale)}</td><td className="p-4"><StatusBadge status={invoice.status} /></td><td className="p-4 text-right font-display font-bold text-navy-950">{formatUsd(invoiceTotal(invoice))}</td></tr>)}</tbody></table></div> : <EmptyState title={t("Todavía no tienes facturas")} description={t("Cuando se genere un cargo podrás consultarlo y descargarlo aquí.")} />}</div></>;
}
