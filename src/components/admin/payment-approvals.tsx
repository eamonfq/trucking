"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { approvePayment } from "@/lib/auth/admin-actions";
import type { Invoice } from "@/lib/types";
import { formatUsd } from "@/lib/utils/format";
import { invoiceTotal } from "@/lib/utils/invoices";

export function PaymentApprovals({ initial }: { initial: Invoice[] }) { const [items, setItems] = useState(initial); return <div className="grid gap-3">{items.map((invoice) => <div key={invoice.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-center"><div><p className="font-bold text-navy-950">{invoice.number}</p><p className="mt-1 text-sm text-navy-500">{formatUsd(invoiceTotal(invoice))}</p></div><div className="flex items-center gap-3"><StatusBadge status={invoice.status} />{invoice.status === "pago-reportado" && <Button onClick={async () => { const result = await approvePayment(invoice.id); if (result.ok) setItems((current) => current.map((item) => item.id === invoice.id ? { ...item, status: "pagada" } : item)); }}>Aprobar pago</Button>}</div></div>)}</div>; }
