"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import { getBoxCategory } from "@/lib/config/box-categories";
import { recordClientAction } from "@/lib/auth/client-actions";
import { createShipmentSchema } from "@/lib/schemas/logistics";
import { formatUsd } from "@/lib/utils/format";
import type { Box, Recipient } from "@/lib/types";

type Input = z.input<typeof createShipmentSchema>;
export function ShipmentCreator({ boxes, recipients, excessPolicy }: { boxes: Box[]; recipients: Recipient[]; excessPolicy: string }) {
  const [done, setDone] = useState(false); const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<Input>({ resolver: zodResolver(createShipmentSchema), defaultValues: { boxIds: [], deliveryMethod: "sucursal" } }); const selected = useWatch({ control, name: "boxIds" }) ?? []; const selectedBoxes = boxes.filter((box) => selected.includes(box.id)); const total = selectedBoxes.reduce((sum, box) => sum + (getBoxCategory(box.categoryId)?.priceUsd ?? 0), 0); const blocked = selectedBoxes.some((box) => box.status === "excede-categoria");
  if (done) return <div className="rounded-card bg-success-50 p-8"><h2 className="font-display text-3xl font-bold text-success-700">Envío confirmado</h2><p className="mt-3 text-sm text-navy-600">La solicitud quedó registrada. Recibirás una notificación cuando se asigne a un camión.</p></div>;
  return <form onSubmit={handleSubmit(async () => { await recordClientAction({ kind: "shipment", email: "mariana@demo.test" }); setDone(true); })} className="grid gap-6 lg:grid-cols-[1fr_.7fr]"><div className="grid content-start gap-4"><h2 className="font-display text-xl font-bold">1. Elige cajas en bodega</h2>{boxes.map((box) => <label key={box.id} className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-4"><Checkbox label={box.code} value={box.id} {...register("boxIds")} /><div className="text-right"><p className="text-sm font-bold">{getBoxCategory(box.categoryId)?.name}</p><p className="text-xs text-navy-500">{formatUsd(getBoxCategory(box.categoryId)?.priceUsd ?? 0)}</p></div></label>)}{errors.boxIds?.message && <p className="text-sm text-danger-700">{errors.boxIds.message}</p>}<h2 className="mt-4 font-display text-xl font-bold">2. Entrega</h2><Select label="Destinatario" options={[{ value: "", label: "Selecciona" }, ...recipients.map((recipient) => ({ value: recipient.id, label: recipient.name }))]} error={errors.recipientId?.message} {...register("recipientId")} /><Select label="Método" options={[{ value: "sucursal", label: "Recoger en sucursal" }, { value: "domicilio", label: "Entrega a domicilio" }]} {...register("deliveryMethod")} /></div><aside className="h-fit rounded-card bg-navy-950 p-6 text-white lg:sticky lg:top-8"><p className="text-xs font-bold uppercase tracking-wider text-orange-400">Resumen</p><div className="mt-5 grid gap-3">{selectedBoxes.map((box) => <div key={box.id} className="flex justify-between text-sm"><span className="text-white/60">1 × {getBoxCategory(box.categoryId)?.name}</span><span>{formatUsd(getBoxCategory(box.categoryId)?.priceUsd ?? 0)}</span></div>)}</div><div className="mt-6 flex justify-between border-t border-white/15 pt-5"><span className="font-bold">Total</span><span className="font-display text-xl font-bold text-orange-400">{formatUsd(total)}</span></div>{blocked && <p className="mt-4 rounded-xl bg-danger-700/20 p-3 text-xs text-red-200">Hay una caja excedida. Política activa: {excessPolicy}. Debe resolverse antes de enviar.</p>}<Button type="submit" disabled={blocked} loading={isSubmitting} className="mt-6 w-full">Confirmar envío</Button></aside></form>;
}
