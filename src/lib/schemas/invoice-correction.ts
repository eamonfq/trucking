import { z } from "zod";
import { INVOICE_STATUSES } from "@/lib/types";

export const OFFLINE_PAYMENT_METHODS = ["efectivo", "tarjeta", "transferencia", "deposito", "zelle", "cheque", "destino"] as const;
const money = z.coerce.number().finite().nonnegative().max(100000000).multipleOf(0.01);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === value;
}, "Indica una fecha válida.");
export const invoiceCorrectionSchema = z.object({
  issuedDate: date, dueDate: date, status: z.enum(INVOICE_STATUSES),
  insuranceUsd: money, homeDeliveryUsd: money, excessFeeUsd: money,
  lines: z.array(z.object({categoryId:z.string().trim().min(1).max(100),categoryName:z.string().trim().min(1).max(160),description:z.string().trim().max(600),quantity:z.coerce.number().int().positive().max(10000),unitPriceUsd:money}).strict()).min(1).max(100),
  payments: z.array(z.object({folio:z.string().max(100),method:z.enum([...OFFLINE_PAYMENT_METHODS,"clover"]),amountUsd:money.refine(n=>n>0),status:z.enum(["confirmado","pendiente","rechazado","acuerdo"]),externalReference:z.string().trim().max(160),recordedDate:date,warehouseId:z.string().max(100)}).strict()).max(100),
}).strict();
export type InvoiceCorrection = z.output<typeof invoiceCorrectionSchema>;
