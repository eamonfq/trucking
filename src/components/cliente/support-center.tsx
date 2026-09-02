"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { recordClientAction } from "@/lib/auth/client-actions";
import { supportSchema } from "@/lib/schemas/logistics";

type SupportInput = z.input<typeof supportSchema>;
export function SupportCenter() { const [messages, setMessages] = useState([{ from: "A&L", body: "Hola, este es el hilo demo de soporte. Cuéntanos cómo podemos ayudarte." }]); const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SupportInput>({ resolver: zodResolver(supportSchema) }); return <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]"><form onSubmit={handleSubmit(async (data) => { setMessages((current) => [...current, { from: "Tú", body: data.message }]); await recordClientAction({ kind: "support", email: "mariana@demo.test" }); reset(); })} className="grid content-start gap-4 rounded-card border border-stone-200 bg-white p-5"><Input label="Asunto" error={errors.subject?.message} {...register("subject")} /><Textarea label="Mensaje" error={errors.message?.message} {...register("message")} /><Button type="submit" loading={isSubmitting}>Enviar mensaje</Button></form><div className="rounded-card bg-navy-950 p-5 text-white"><p className="text-xs font-bold uppercase tracking-wider text-orange-400">Ticket DEMO-001 · Abierto</p><div className="mt-5 grid gap-4">{messages.map((message, index) => <div key={`${message.from}-${index}`} className={`max-w-[85%] rounded-2xl p-4 text-sm leading-6 ${message.from === "Tú" ? "ml-auto bg-orange-500 text-white" : "bg-white/10 text-white/75"}`}><p className="mb-1 text-xs font-bold">{message.from}</p>{message.body}</div>)}</div></div></div>; }
