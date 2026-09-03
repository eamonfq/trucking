"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClientShipment } from "@/lib/auth/client-actions";
import type { BoxCategory } from "@/lib/config/box-categories";
import { FLOW_OPTION_LABELS, type FlowConfig } from "@/lib/config/flow";
import { createShipmentSchema } from "@/lib/schemas/logistics";
import type { Box, Recipient } from "@/lib/types";
import { formatUsd } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

type ShipmentInput = z.input<typeof createShipmentSchema>;

const DELIVERY_OPTIONS = [
  { value: "sucursal", label: "Recoger en sucursal" },
  { value: "domicilio", label: "Entrega a domicilio" },
];

export function ShipmentCreator({ boxes, recipients, excessPolicy, deliveryMode, rates }: { boxes: Box[]; recipients: Recipient[]; excessPolicy: string; deliveryMode: FlowConfig["deliveryMode"]; rates: BoxCategory[] }) {
  const [createdCode, setCreatedCode] = useState("");
  const { showToast } = useToast();
  const options = deliveryMode === "ambas" ? DELIVERY_OPTIONS : DELIVERY_OPTIONS.filter((option) => option.value === deliveryMode);
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<ShipmentInput>({ resolver: zodResolver(createShipmentSchema), defaultValues: { boxIds: [], recipientId: "", deliveryMethod: options[0]?.value as ShipmentInput["deliveryMethod"] } });
  const selected = useWatch({ control, name: "boxIds" }) ?? [];
  const selectedBoxes = boxes.filter((box) => selected.includes(box.id));
  const category = (box: Box) => rates.find((rate) => rate.id === box.categoryId);
  const total = selectedBoxes.reduce((sum, box) => sum + (category(box)?.priceUsd ?? 0), 0);
  const blocked = selectedBoxes.some((box) => box.status === "excede-categoria");

  if (createdCode) return <div className="rounded-card bg-success-50 p-8"><h2 className="font-display text-3xl font-bold text-success-700">Envío confirmado</h2><p className="mt-3 text-sm leading-6 text-navy-600">{createdCode} quedó registrado. Te avisaremos cuando se asigne a un camión.</p><Link href={`/cliente/envios/${createdCode}`} className="mt-6 inline-flex min-h-11 items-center rounded-full bg-navy-950 px-5 text-sm font-bold text-white">Ver el envío</Link></div>;
  if (!boxes.length) return <EmptyState title="No hay cajas disponibles" description="Para crear un envío necesitas cajas en bodega que no estén asignadas a otro envío o camión." action={<Link href="/cliente/cajas" className="inline-flex min-h-11 items-center rounded-full bg-orange-500 px-5 text-sm font-bold text-white">Ver mis cajas</Link>} />;
  if (!recipients.length) return <EmptyState title="Falta un destinatario" description="Registra a quién entregamos en México y su dirección antes de crear el envío." action={<Link href="/cliente/destinatarios" className="inline-flex min-h-11 items-center rounded-full bg-orange-500 px-5 text-sm font-bold text-white">Agregar destinatario</Link>} />;

  const submit = handleSubmit(async (data) => {
    const result = await createClientShipment(data);
    if (!result.ok) return showToast({ title: "No se pudo crear el envío", description: result.error, variant: "error" });
    setCreatedCode(result.shipment.code);
    showToast({ title: "Envío confirmado", description: `${result.shipment.code} ya aparece en tu panel.` });
  });

  return <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_.7fr]">
    <div className="grid content-start gap-4">
      <h2 className="font-display text-xl font-bold">1. Elige cajas en bodega</h2>
      {boxes.map((box) => <label key={box.id} className={`flex cursor-pointer items-center justify-between gap-4 rounded-2xl border bg-white p-4 ${box.status === "excede-categoria" ? "border-danger-700/30" : "border-stone-200"}`}>
        <Checkbox label={box.code} value={box.id} {...register("boxIds")} />
        <div className="text-right"><p className="text-sm font-bold">{category(box)?.name}</p><p className="text-xs text-navy-500">{formatUsd(category(box)?.priceUsd ?? 0)}</p>{box.status === "excede-categoria" && <p className="mt-1 text-xs font-bold text-danger-700">Requiere revisión</p>}</div>
      </label>)}
      {errors.boxIds?.message && <p className="text-sm text-danger-700">{errors.boxIds.message}</p>}
      <h2 className="mt-4 font-display text-xl font-bold">2. Entrega</h2>
      <Select label="Destinatario" options={[{ value: "", label: "Selecciona" }, ...recipients.map((recipient) => ({ value: recipient.id, label: recipient.name }))]} error={errors.recipientId?.message} {...register("recipientId")} />
      <Select label="Método" options={options} error={errors.deliveryMethod?.message} {...register("deliveryMethod")} />
      {deliveryMode !== "ambas" && <p className="text-xs text-navy-500">Por ahora A&amp;L opera únicamente {FLOW_OPTION_LABELS[deliveryMode]?.toLowerCase()}.</p>}
    </div>
    <aside className="h-fit rounded-card bg-navy-950 p-6 text-white lg:sticky lg:top-8">
      <p className="text-xs font-bold uppercase tracking-wider text-orange-400">Resumen</p>
      <div className="mt-5 grid gap-3">{selectedBoxes.length ? selectedBoxes.map((box) => <div key={box.id} className="flex justify-between text-sm"><span className="text-white/60">1 × {category(box)?.name}</span><span>{formatUsd(category(box)?.priceUsd ?? 0)}</span></div>) : <p className="text-sm text-white/50">Selecciona cajas para ver el desglose por categoría.</p>}</div>
      <div className="mt-6 flex justify-between border-t border-white/15 pt-5"><span className="font-bold">Total de referencia</span><span className="font-display text-xl font-bold text-orange-400">{formatUsd(total)}</span></div>
      {blocked && <p className="mt-4 rounded-xl bg-danger-700/20 p-3 text-xs leading-5 text-red-200">Una caja excedida bloquea el envío. Política activa: {FLOW_OPTION_LABELS[excessPolicy] ?? excessPolicy}. Operaciones debe resolverla primero.</p>}
      <Button type="submit" disabled={blocked} loading={isSubmitting} className="mt-6 w-full">Confirmar envío</Button>
    </aside>
  </form>;
}
