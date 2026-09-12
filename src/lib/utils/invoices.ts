import type { Invoice } from "@/lib/types";

export const invoiceSubtotal = (invoice: Invoice) => invoice.lines.reduce((total, line) => total + line.quantity * line.unitPriceUsd, 0);
export const invoiceTotal = (invoice: Invoice) => Math.round((invoiceSubtotal(invoice) + invoice.insuranceUsd + invoice.homeDeliveryUsd + (invoice.excessFeeUsd ?? 0)) * 100) / 100;
export const matchesInvoiceTotal = (invoice: Invoice, amount: number) => Number.isFinite(amount) && amount > 0 && Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001 && Math.round(amount * 100) === Math.round(invoiceTotal(invoice) * 100);
export const isInvoiceOverdue = (invoice: Invoice, at = Date.now()) => ["emitida", "vencida"].includes(invoice.status) && new Date(invoice.dueAt).getTime() < at;
