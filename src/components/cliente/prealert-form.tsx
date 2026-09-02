"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BOX_CATEGORIES } from "@/lib/config/box-categories";
import { recordClientAction } from "@/lib/auth/client-actions";
import { prealertSchema } from "@/lib/schemas/logistics";

type InputData = z.input<typeof prealertSchema>;
export function PrealertForm() { const [done, setDone] = useState(false); const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<InputData>({ resolver: zodResolver(prealertSchema) }); if (done) return <div className="rounded-card bg-success-50 p-7"><h2 className="font-display text-2xl font-bold text-success-700">Pre-alerta registrada</h2><p className="mt-2 text-sm text-navy-600">Te avisaremos al recibir esta compra en bodega.</p><Button className="mt-6" onClick={() => { reset(); setDone(false); }}>Registrar otra</Button></div>; return <form onSubmit={handleSubmit(async () => { await recordClientAction({ kind: "prealert", email: "mariana@demo.test" }); setDone(true); })} className="grid gap-5 rounded-card border border-stone-200 bg-white p-5 shadow-soft sm:p-7"><div className="grid gap-5 sm:grid-cols-2"><Input label="Tienda" error={errors.store?.message} {...register("store")} /><Input label="Tracking de origen" error={errors.tracking?.message} {...register("tracking")} /></div><Textarea label="Descripción del contenido" error={errors.description?.message} {...register("description")} /><div className="grid gap-5 sm:grid-cols-2"><Input label="Valor declarado (USD)" type="number" step="0.01" error={errors.declaredValue?.message} {...register("declaredValue")} /><Select label="Categoría estimada" options={[{ value: "", label: "Selecciona" }, ...BOX_CATEGORIES.map((item) => ({ value: item.id, label: item.name }))]} error={errors.estimatedCategory?.message} {...register("estimatedCategory")} /></div><Button type="submit" loading={isSubmitting}>Registrar pre-alerta</Button></form>; }
