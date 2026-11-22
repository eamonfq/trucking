"use client";

import {CloverCheckout} from "@/components/payments/clover-checkout";
import {useRouter} from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { reportPaymentWithReceipt } from "@/lib/auth/file-actions";
import { paymentReportSchema } from "@/lib/schemas/logistics";
import { formatUsd } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { clientPaymentForm } from "@/lib/i18n/catalogs/client-payment-form";
import { useT } from "@/lib/i18n/provider";

type PaymentInput = z.input<typeof paymentReportSchema>;
export function PaymentForm({ invoiceId, amount, cloverPending=false }: { invoiceId: string; amount: number;cloverPending?:boolean }) {
  const router=useRouter();
  const t=useT(clientPaymentForm);
  const [method,setMethod]=useState(cloverPending?"clover":"report");
  const [done, setDone] = useState(false);
  const [receipt, setReceipt] = useState<File | null>(null);
  const { showToast } = useToast();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<PaymentInput>({ resolver: zodResolver(paymentReportSchema), defaultValues: { amount, method: "transferencia" } });
  if (done) return <p className="rounded-xl bg-success-50 p-4 text-sm font-semibold text-success-700">{t("Pago reportado por {amount}. Operaciones revisará los datos del pago y te notificará la resolución.", { amount: formatUsd(amount) })}</p>;
  return <div className="grid gap-4"><div className="flex flex-wrap gap-2"><Button type="button" variant={method==="clover"?"primary":"secondary"} onClick={()=>setMethod("clover")}>{t("Pagar con Clover")}</Button><Button type="button" variant={method==="report"?"primary":"secondary"} onClick={()=>setMethod("report")}>{t("Reportar pago externo")}</Button></div>{method==="clover"?<CloverCheckout invoiceIds={[invoiceId]} onPaid={()=>router.refresh()}/>:<form onSubmit={handleSubmit(async (data) => { const upload = new FormData(); if (receipt) upload.set("file",receipt); let result; try { result = await reportPaymentWithReceipt(invoiceId,data,upload); } catch { return showToast({title:t("No se confirmó el reporte"),description:t("Actualiza la factura antes de reintentar."),variant:"error"}); } if (!result.ok) return showToast({ title: t("No se pudo reportar el pago"), description: result.error, variant: "error" }); setDone(true); showToast({ title: t("Pago enviado a revisión"), description: t("{number} cambió a pago reportado.", { number: result.invoice.number }) }); })} className="grid gap-4"><Input label={t("Monto reportado (USD)")} type="number" min="0.01" step="0.01" error={errors.amount?.message} {...register("amount")} /><Select label={t("Método")} options={[{ value: "transferencia", label: t("Transferencia") }, { value: "deposito", label: t("Depósito") }, { value: "tarjeta", label: t("Tarjeta") }, { value: "efectivo", label: t("Efectivo") }, { value: "cheque", label: t("Cheque") }]} error={errors.method?.message} {...register("method")} /><Input label={t("Referencia externa o número de cheque (opcional)")} error={errors.reference?.message} {...register("reference")} /><Input label={t("Comprobante")} type="file" accept="image/jpeg,image/png,application/pdf" hint={t("JPG, PNG o PDF, hasta 2 MB. Se guarda de forma privada.")} onChange={(event) => { const file=event.target.files?.[0]??null; if(file&&file.size>2*1024*1024){event.target.value="";setReceipt(null);showToast({title:t("Archivo demasiado grande"),description:t("El límite es 2 MB."),variant:"error"});return;}setReceipt(file); }} /><Button type="submit" loading={isSubmitting}>{t("Enviar reporte")}</Button></form>}</div>;
}
