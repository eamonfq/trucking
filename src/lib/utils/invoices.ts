import type { Invoice } from "@/lib/types";

export const invoiceSubtotal = (invoice: Invoice) => invoice.lines.reduce((total, line) => total + line.quantity * line.unitPriceUsd, 0);
export const invoiceTotal = (invoice: Invoice) => invoiceSubtotal(invoice) + invoice.insuranceUsd + invoice.homeDeliveryUsd;
