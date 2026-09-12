"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, SendHorizontal, RefreshCw } from "lucide-react";
import { z } from "zod";
import { createSupportTicket, replySupportTicket } from "@/lib/auth/client-actions";
import { supportReplySchema, supportSchema } from "@/lib/schemas/logistics";
import type { SupportTicket } from "@/lib/types";
import { formatDateTime } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

type TicketInput = z.input<typeof supportSchema>;
type ReplyInput = z.input<typeof supportReplySchema>;

export function SupportCenter({ initialTickets }: { initialTickets: SupportTicket[] }) {
  const router = useRouter();
  const [tickets, setTickets] = useState(initialTickets);
  const [activeId, setActiveId] = useState(initialTickets[0]?.id ?? "");
  const [creating, setCreating] = useState(false);
  const { showToast } = useToast();
  const active = tickets.find((ticket) => ticket.id === activeId) ?? null;
  const newTicket = useForm<TicketInput>({ resolver: zodResolver(supportSchema), defaultValues: { subject: "", message: "" } });
  const reply = useForm<ReplyInput>({ resolver: zodResolver(supportReplySchema), defaultValues: { message: "" } });

  const submitTicket = newTicket.handleSubmit(async (data) => {
    const result = await createSupportTicket(data);
    if (!result.ok) return showToast({ title: "No se pudo abrir el ticket", description: result.error, variant: "error" });
    setTickets((current) => [result.ticket, ...current]);
    setActiveId(result.ticket.id);
    setCreating(false);
    newTicket.reset();
    showToast({ title: "Ticket abierto", description: `${result.ticket.code} quedó registrado con tu mensaje.` });
  });

  const submitReply = reply.handleSubmit(async (data) => {
    if (!active) return;
    const result = await replySupportTicket(active.id, data);
    if (!result.ok) return showToast({ title: "No se pudo enviar", description: result.error, variant: "error" });
    setTickets((current) => current.map((ticket) => ticket.id === result.ticket.id ? result.ticket : ticket));
    reply.reset();
  });

  if (!tickets.length) return <>
    <EmptyState title="No tienes tickets abiertos" description="Abre uno y conserva toda la conversación con Operaciones en un solo hilo." action={<Button onClick={() => setCreating(true)}><Plus className="size-4" />Abrir ticket</Button>} />
    <NewTicketDialog open={creating} onClose={() => setCreating(false)} form={newTicket} onSubmit={submitTicket} />
  </>;

  return <div className="grid gap-5 lg:grid-cols-[.75fr_1.25fr]">
    <div className="grid content-start gap-3">
      <Button onClick={() => setCreating(true)}><Plus className="size-4" />Abrir ticket</Button>
      <Button variant="ghost" onClick={() => router.refresh()}><RefreshCw className="size-4" />Actualizar conversación</Button>
      {tickets.map((ticket) => <button type="button" key={ticket.id} onClick={() => setActiveId(ticket.id)} className={`rounded-2xl border p-4 text-left transition ${ticket.id === activeId ? "border-orange-300 bg-orange-50" : "border-stone-200 bg-white hover:border-navy-400"}`}>
        <div className="flex items-center justify-between gap-3"><span className="text-xs font-bold uppercase tracking-wider text-navy-400">{ticket.code}</span><StatusBadge status={ticket.status} /></div>
        <p className="mt-2 line-clamp-2 text-sm font-bold text-navy-950">{ticket.subject}</p>
        <p className="mt-2 text-xs text-navy-500">Último movimiento {formatDateTime(ticket.updatedAt)}</p>
      </button>)}
    </div>
    {active && <div className="grid content-start gap-5 rounded-card bg-navy-950 p-5 text-white sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
        <div><p className="text-xs font-bold uppercase tracking-wider text-orange-400">{active.code}</p><h2 className="mt-1 font-display text-xl font-bold">{active.subject}</h2></div>
        <StatusBadge status={active.status} />
      </div>
      <div className="grid gap-4">{active.messages.map((message) => <div key={message.id} className={`max-w-[85%] rounded-2xl p-4 text-sm leading-6 ${message.author === "cliente" ? "ml-auto bg-orange-500 text-white" : "bg-white/10 text-white/75"}`}>
        <p className="mb-1 text-xs font-bold">{message.authorName}</p>
        {message.body}
        <p className="mt-2 text-xs text-white/50">{formatDateTime(message.at)}</p>
      </div>)}</div>
      {active.status === "cerrado"
        ? <p className="rounded-2xl bg-white/8 p-4 text-sm text-white/65">Este ticket está cerrado. Si necesitas retomarlo, abre uno nuevo.</p>
        : <form onSubmit={submitReply} className="grid gap-3 rounded-2xl bg-white p-4">
            <Textarea label="Responder en el hilo" rows={3} error={reply.formState.errors.message?.message} {...reply.register("message")} />
            <div className="flex justify-end"><Button type="submit" loading={reply.formState.isSubmitting}><SendHorizontal className="size-4" />Enviar respuesta</Button></div>
          </form>}
    </div>}
    <NewTicketDialog open={creating} onClose={() => setCreating(false)} form={newTicket} onSubmit={submitTicket} />
  </div>;
}

function NewTicketDialog({ open, onClose, form, onSubmit }: { open: boolean; onClose: () => void; form: ReturnType<typeof useForm<TicketInput>>; onSubmit: () => void }) {
  return <Dialog open={open} onClose={onClose} title="Abrir un ticket" description="Cuéntanos qué necesitas y te respondemos en este mismo hilo.">
    <form onSubmit={onSubmit} className="grid gap-4">
      <Input label="Asunto" error={form.formState.errors.subject?.message} {...form.register("subject")} />
      <Textarea label="Mensaje" rows={5} error={form.formState.errors.message?.message} {...form.register("message")} />
      <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" loading={form.formState.isSubmitting}>Abrir ticket</Button></div>
    </form>
  </Dialog>;
}
