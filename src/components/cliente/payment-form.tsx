"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { recordClientAction } from "@/lib/auth/client-actions";
import { paymentReportSchema } from "@/lib/schemas/logistics";

type PaymentInput = z.input<typeof paymentReportSchema>;
export function PaymentForm({ amount }: { amount: number }) { const [done, setDone] = useState(false); const { register, handleSubmit, formState: { isSubmitting } } = useForm<PaymentInput>({ resolver: zodResolver(paymentReportSchema), defaultValues: { amount } }); if (done) return <p className="rounded-xl bg-success-50 p-4 text-sm font-semibold text-success-700">Pago reportado. Operaciones revisará el comprobante.</p>; return <form onSubmit={handleSubmit(async () => { await recordClientAction({ kind: "payment", email: "mariana@demo.test" }); setDone(true); })} className="grid gap-4"><Input label="Monto reportado (USD)" type="number" step="0.01" {...register("amount")} /><Select label="Método" options={[{ value: "transferencia", label: "Transferencia" }, { value: "deposito", label: "Depósito" }, { value: "otro", label: "Otro" }]} {...register("method")} /><Input label="Referencia" {...register("reference")} /><Input label="Comprobante" type="file" accept="image/*,.pdf" {...register("receiptName")} /><Button type="submit" loading={isSubmitting}>Enviar reporte</Button></form>; }
