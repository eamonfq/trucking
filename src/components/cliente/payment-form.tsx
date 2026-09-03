"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { reportInvoicePayment } from "@/lib/auth/client-actions";
import { paymentReportSchema } from "@/lib/schemas/logistics";
import { formatUsd } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

type PaymentInput = z.input<typeof paymentReportSchema>;
export function PaymentForm({ invoiceId, amount }: { invoiceId: string; amount: number }) {
  const [done, setDone] = useState(false);
  const [receiptName, setReceiptName] = useState("");
  const { showToast } = useToast();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<PaymentInput>({ resolver: zodResolver(paymentReportSchema), defaultValues: { amount, method: "transferencia" } });
  if (done) return <p className="rounded-xl bg-success-50 p-4 text-sm font-semibold text-success-700">Pago reportado por {formatUsd(amount)}. Operaciones revisará el comprobante y te notificará la resolución.</p>;
  return <form onSubmit={handleSubmit(async (data) => { const result = await reportInvoicePayment(invoiceId, { ...data, receiptName }); if (!result.ok) return showToast({ title: "No se pudo reportar el pago", description: result.error, variant: "error" }); setDone(true); showToast({ title: "Pago enviado a revisión", description: `${result.invoice.number} cambió a pago reportado.` }); })} className="grid gap-4"><Input label="Monto reportado (USD)" type="number" min="0.01" step="0.01" error={errors.amount?.message} {...register("amount")} /><Select label="Método" options={[{ value: "transferencia", label: "Transferencia" }, { value: "deposito", label: "Depósito" }, { value: "otro", label: "Otro" }]} error={errors.method?.message} {...register("method")} /><Input label="Referencia" error={errors.reference?.message} {...register("reference")} /><Input label="Comprobante" type="file" accept="image/*,.pdf" onChange={(event) => setReceiptName(event.target.files?.[0]?.name ?? "")} /><Button type="submit" loading={isSubmitting}>Enviar reporte</Button></form>;
}
