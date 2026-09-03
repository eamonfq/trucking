"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, CheckCircle2, PackageCheck } from "lucide-react";
import { z } from "zod";
import { receiveBox } from "@/lib/auth/admin-actions";
import { CustomerQuickCreate } from "@/components/admin/customer-quick-create";
import { PhotoField } from "@/components/admin/photo-field";
import type { BoxCategory } from "@/lib/config/box-categories";
import { FLOW_OPTION_LABELS } from "@/lib/config/flow";
import { receptionSchema } from "@/lib/schemas/admin";
import { formatUsd } from "@/lib/utils/format";
import { suggestCategory } from "@/lib/utils/suggest-category";
import type { User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

type ReceptionInput = z.input<typeof receptionSchema>;

export function ReceptionForm({ users, excessPolicy, rates, defaultCustomerId }: { users: User[]; excessPolicy: string; rates: BoxCategory[]; defaultCustomerId?: string }) {
  const [photoName, setPhotoName] = useState("");
  const [customers, setCustomers] = useState(users);
  const { showToast } = useToast();
  const { register, handleSubmit, control, reset, setValue, formState: { errors, isSubmitting } } = useForm<ReceptionInput>({ resolver: zodResolver(receptionSchema), defaultValues: { customer: defaultCustomerId ?? "", reject: false, overrideCategory: "", overrideReason: "", rejectionReason: "" } });
  const values = useWatch({ control });
  const dims = { length: Number(values.length) || 0, width: Number(values.width) || 0, height: Number(values.height) || 0 };
  const hasMeasurements = Boolean(dims.length && dims.width && dims.height && Number(values.weightLb));
  const suggestion = hasMeasurements ? suggestCategory(dims, Number(values.weightLb), rates) : null;
  const isExceeded = hasMeasurements && !suggestion?.category;
  const reasonLabel = suggestion?.reason === "peso-y-medida" ? "peso y medidas" : suggestion?.reason === "peso" ? "peso" : suggestion?.reason === "medida" ? "medidas" : null;

  return <form onSubmit={handleSubmit(async (data) => {
    const result = await receiveBox({ ...data, photoName });
    if (!result.ok) return showToast({ title: "No se pudo registrar la recepción", description: result.error, variant: "error" });
    showToast({ title: result.box.status === "rechazada" ? "Rechazo registrado" : "Caja enviada a bodega", description: result.invoice ? `${result.code} quedó registrada y se generó ${result.invoice.number}.` : `${result.code} quedó registrada y el cliente fue notificado.` });
    reset({ customer: data.customer, reject: false, overrideCategory: "", overrideReason: "", rejectionReason: "" });
    setPhotoName("");
  })} className="grid gap-6 lg:grid-cols-[1fr_.72fr]">
    <div className="grid content-start gap-5 rounded-card border border-stone-200 bg-white p-6">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Select label="Cliente o casillero" error={errors.customer?.message} options={[{ value: "", label: "Selecciona" }, ...customers.filter((user) => user.role === "cliente" && user.active).map((user) => ({ value: user.id, label: `${user.lockerCode} · ${user.firstName} ${user.paternalLastName}` }))]} {...register("customer")} />
        <CustomerQuickCreate onCreated={(user) => { setCustomers((current) => [...current, user]); setValue("customer", user.id, { shouldValidate: true }); }} />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4"><Input label="Largo (in)" type="number" min="0" step="0.1" error={errors.length?.message} {...register("length")} /><Input label="Ancho (in)" type="number" min="0" step="0.1" error={errors.width?.message} {...register("width")} /><Input label="Alto (in)" type="number" min="0" step="0.1" error={errors.height?.message} {...register("height")} /><Input label="Peso (lb)" type="number" min="0" step="0.1" error={errors.weightLb?.message} {...register("weightLb")} /></div>
      <PhotoField value={photoName} onChange={setPhotoName} />
      {!isExceeded && <><Select label="Sobrescribir categoría (opcional)" options={[{ value: "", label: "Usar sugerencia" }, ...rates.map((item) => ({ value: item.id, label: `${item.name} · ${formatUsd(item.priceUsd)}` }))]} {...register("overrideCategory")} />{values.overrideCategory && <Textarea label="Motivo de sobrescritura" error={errors.overrideReason?.message} {...register("overrideReason")} />}</>}
      {isExceeded && <div className="rounded-2xl border border-danger-700/20 bg-danger-50 p-4"><Checkbox label="Registrar la caja como rechazada" {...register("reject")} />{values.reject && <div className="mt-4"><Textarea label="Motivo del rechazo" error={errors.rejectionReason?.message} {...register("rejectionReason")} /></div>}</div>}
      <Button type="submit" loading={isSubmitting} disabled={isExceeded && !values.reject}><PackageCheck className="size-4" />{values.reject ? "Registrar rechazo" : "Registrar recepción"}</Button>
    </div>
    <aside className={`h-fit rounded-card p-6 text-white ${isExceeded ? "bg-danger-700" : "bg-navy-950"}`}>
      <p className={`text-xs font-bold uppercase tracking-wider ${isExceeded ? "text-white/70" : "text-orange-400"}`}>Categoría sugerida</p>
      {suggestion?.category ? <><div className="mt-5 flex items-start gap-3"><CheckCircle2 className="mt-1 size-6 shrink-0 text-success-500" /><div><p className="font-display text-4xl font-bold">{suggestion.category.name}</p><p className="mt-2 font-display text-xl font-bold text-orange-400">{formatUsd(suggestion.category.priceUsd)}</p></div></div><p className="mt-5 text-sm leading-6 text-white/60">{reasonLabel ? `Se ajustó a esta categoría por ${reasonLabel}.` : "Las medidas y el peso caben en los límites de la categoría."}</p><dl className="mt-5 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-white/8 p-3"><dt className="text-white/50">Límite de peso</dt><dd className="mt-1 font-bold">{suggestion.category.maxWeightLb} lb</dd></div><div className="rounded-xl bg-white/8 p-3"><dt className="text-white/50">Medidas máximas</dt><dd className="mt-1 font-bold">{suggestion.category.dimensions.length} × {suggestion.category.dimensions.width} × {suggestion.category.dimensions.height} in</dd></div></dl></> : isExceeded ? <><AlertTriangle className="mt-5 size-8" /><p className="mt-4 font-display text-2xl font-bold">Excede la categoría máxima</p><p className="mt-3 text-sm leading-6 text-white/75">No se puede ingresar a bodega. Registra el rechazo y documenta el motivo para notificar al cliente.</p></> : <><p className="mt-5 text-sm leading-6 text-white/60">Captura las tres medidas y el peso para calcular categoría y precio en tiempo real.</p><p className="mt-5 rounded-xl bg-white/8 p-3 text-xs text-white/55">Política configurada: {FLOW_OPTION_LABELS[excessPolicy] ?? excessPolicy}</p></>}
    </aside>
  </form>;
}
