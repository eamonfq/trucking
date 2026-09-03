"use client";

import { useMemo, useState } from "react";
import { Download, FileCheck2, Search } from "lucide-react";
import { approvePayment, rejectPayment } from "@/lib/auth/admin-actions";
import { getBoxCategory } from "@/lib/config/box-categories";
import { getStatusLabel } from "@/lib/config/status";
import { INVOICE_STATUSES, type Invoice, type User } from "@/lib/types";
import { formatDate, formatUsd } from "@/lib/utils/format";
import { invoiceSubtotal, invoiceTotal } from "@/lib/utils/invoices";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

export function PaymentApprovals({ initial, users }: { initial: Invoice[]; users: User[] }) {
  const [items, setItems] = useState(initial);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();
  const filtered = useMemo(() => items.filter((invoice) => { const user = users.find((item) => item.id === invoice.userId); const term = search.trim().toLowerCase(); return (!term || `${invoice.number} ${user?.firstName ?? ""} ${user?.paternalLastName ?? ""} ${user?.lockerCode ?? ""}`.toLowerCase().includes(term)) && (status === "all" || invoice.status === status); }), [items, search, status, users]);
  const review = async (decision: "approve" | "reject") => {
    if (!selected) return;
    setBusy(true);
    const result = decision === "approve" ? await approvePayment(selected.id, note) : await rejectPayment(selected.id, note);
    setBusy(false);
    if (!result.ok) return showToast({ title: "No se pudo resolver el pago", description: result.error, variant: "error" });
    setItems((current) => current.map((item) => item.id === result.invoice.id ? result.invoice : item));
    setSelected(null); setNote("");
    showToast({ title: decision === "approve" ? "Pago aprobado" : "Pago rechazado", description: "El cliente recibió la resolución por correo." });
  };

  return <div className="grid gap-5"><div className="grid gap-3 rounded-card border border-stone-200 bg-white p-4 sm:grid-cols-[1fr_.55fr]"><label className="flex min-h-12 items-center gap-3 rounded-xl bg-cream-100 px-4"><Search className="size-4 text-navy-400" /><span className="sr-only">Buscar factura</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Factura, cliente o casillero" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label><Select label="Estado" hideLabel value={status} onChange={(event) => setStatus(event.target.value)} options={[{ value: "all", label: "Todos los estados" }, ...INVOICE_STATUSES.map((item) => ({ value: item, label: getStatusLabel(item) }))]} /></div><div className="overflow-x-auto rounded-card border border-stone-200 bg-white"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-cream-100 text-xs uppercase tracking-wider text-navy-500"><tr><th className="p-4">Factura</th><th className="p-4">Cliente</th><th className="p-4">Emisión</th><th className="p-4">Total</th><th className="p-4">Estado</th><th className="p-4 text-right">Acción</th></tr></thead><tbody className="divide-y divide-stone-200">{filtered.map((invoice) => { const user = users.find((item) => item.id === invoice.userId); return <tr key={invoice.id} className="hover:bg-cream-50"><td className="p-4 font-bold text-navy-950">{invoice.number}</td><td className="p-4"><p className="font-bold">{user?.firstName} {user?.paternalLastName}</p><p className="mt-1 text-xs text-navy-400">{user?.lockerCode}</p></td><td className="p-4">{formatDate(invoice.issuedAt)}</td><td className="p-4 font-bold">{formatUsd(invoiceTotal(invoice))}</td><td className="p-4"><StatusBadge status={invoice.status} /></td><td className="p-4"><div className="flex justify-end gap-2"><a href={`/api/facturas/${invoice.id}/pdf`} aria-label={`Descargar ${invoice.number}`} className="grid size-10 place-items-center rounded-full border border-stone-200 hover:bg-cream-100"><Download className="size-4" /></a><Button variant="secondary" onClick={() => { setSelected(invoice); setNote(""); }}>{invoice.status === "pago-reportado" ? "Revisar pago" : "Ver detalle"}</Button></div></td></tr>; })}</tbody></table></div><Dialog open={Boolean(selected)} onClose={() => setSelected(null)} size="large" title={selected?.number ?? "Detalle de factura"} description={selected ? `${users.find((user) => user.id === selected.userId)?.lockerCode ?? ""} · ${formatDate(selected.issuedAt)}` : undefined}>{selected && <div className="grid gap-5 md:grid-cols-[1fr_.8fr]"><div><h3 className="font-display text-lg font-bold">Líneas facturadas</h3><div className="mt-3 divide-y divide-stone-200 rounded-2xl border border-stone-200 px-4">{selected.lines.map((line) => <div key={line.categoryId} className="flex justify-between gap-4 py-3 text-sm"><span>{line.quantity} × {getBoxCategory(line.categoryId)?.name}</span><strong>{formatUsd(line.quantity * line.unitPriceUsd)}</strong></div>)}</div><dl className="mt-4 grid gap-2 text-sm"><TotalRow label="Subtotal" value={formatUsd(invoiceSubtotal(selected))} /><TotalRow label="Seguro" value={formatUsd(selected.insuranceUsd)} /><TotalRow label="Entrega a domicilio" value={formatUsd(selected.homeDeliveryUsd)} /><TotalRow label="Total" value={formatUsd(invoiceTotal(selected))} strong /></dl></div><div><div className="rounded-2xl bg-cream-100 p-4"><div className="flex items-center gap-2"><FileCheck2 className="size-5 text-orange-500" /><h3 className="font-display font-bold">Reporte de pago</h3></div>{selected.paymentReport ? <dl className="mt-4 grid gap-2 text-sm"><TotalRow label="Monto" value={formatUsd(selected.paymentReport.amountUsd)} /><TotalRow label="Método" value={selected.paymentReport.method} /><TotalRow label="Referencia" value={selected.paymentReport.reference} /><TotalRow label="Comprobante" value={selected.paymentReport.receiptName ?? "Sin archivo"} /></dl> : <p className="mt-3 text-sm text-navy-500">El cliente todavía no ha reportado un pago.</p>}</div>{selected.status === "pago-reportado" && <div className="mt-4"><Textarea label="Nota de revisión" rows={4} value={note} onChange={(event) => setNote(event.target.value)} hint="Se guardará en el historial y se incluirá al notificar al cliente." /><div className="mt-4 flex flex-wrap justify-end gap-2"><Button variant="destructive" loading={busy} onClick={() => review("reject")}>Rechazar pago</Button><Button loading={busy} onClick={() => review("approve")}>Aprobar pago</Button></div></div>}</div></div>}</Dialog></div>;
}

function TotalRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) { return <div className={`flex justify-between gap-4 ${strong ? "border-t-2 border-navy-950 pt-3 font-display text-lg font-bold" : ""}`}><dt>{label}</dt><dd>{value}</dd></div>; }
