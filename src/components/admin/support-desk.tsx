"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Send, MessageSquare } from "lucide-react";
import { manageSupportTicket } from "@/lib/auth/operations-actions";
import type { SupportTicket, SupportStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

export type DeskTicket = SupportTicket & { customerName: string; lockerCode: string };
export function SupportDesk({ tickets, selectedId }: { tickets: DeskTicket[]; selectedId?: string }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("pendientes");
  const [activeId, setActiveId] = useState(selectedId ?? tickets[0]?.id);
  const router = useRouter();
  const active = tickets.find(ticket => ticket.id === activeId);
  const visible = tickets.filter(ticket => (filter === "todos" || (filter === "pendientes" ? ticket.status !== "cerrado" : ticket.status === filter)) && `${ticket.code} ${ticket.subject} ${ticket.customerName} ${ticket.lockerCode}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(260px,.7fr)_minmax(0,1.3fr)]">
    <aside className="rounded-2xl border border-line-300 bg-white p-5">
      <Input label="Buscar consulta o cliente" value={query} onChange={event => setQuery(event.target.value)} placeholder="Ticket, nombre o casillero" />
      <div className="mt-4"><Select label="Estado" value={filter} onChange={event => setFilter(event.target.value)} options={[{value:"pendientes",label:"Sin cerrar"},{value:"abierto",label:"Abiertos"},{value:"en-revision",label:"En revisión"},{value:"cerrado",label:"Cerrados"},{value:"todos",label:"Todos"}]} /></div>
      <p className="my-4 text-xs text-ink-500">{visible.length} consultas · Las más antiguas primero</p>
      <div className="grid max-h-[600px] gap-2 overflow-y-auto">{visible.map(ticket => <button type="button" key={ticket.id} onClick={() => setActiveId(ticket.id)} className={`min-h-12 rounded-xl border p-4 text-left transition ${activeId === ticket.id ? "border-navy-900 bg-cream-100" : "border-line-300 hover:bg-cream-50"}`}>
        <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-semibold text-brand-700">{ticket.code}</span><StatusBadge status={ticket.status} /></div>
        <p className="mt-2 font-semibold text-navy-900">{ticket.subject}</p><p className="mt-2 text-xs text-ink-500">{ticket.customerName} · {ticket.lockerCode}</p>
        {ticket.status !== "cerrado" && ticket.messages.at(-1)?.author === "cliente" && <p className="mt-2 text-xs font-semibold text-brand-700">Espera respuesta del equipo</p>}
      </button>)}{!visible.length && <p className="py-8 text-center text-sm text-ink-500">No hay consultas con estos filtros.</p>}</div>
    </aside>
    <section className="min-w-0 rounded-2xl border border-line-300 bg-white p-5 sm:p-7">
      <div className="mb-5 flex items-center justify-between gap-3"><h2 className="font-display text-xl font-semibold text-navy-900">Conversación</h2><Button variant="ghost" onClick={() => router.refresh()} aria-label="Actualizar conversaciones"><RefreshCw className="size-4" /><span className="hidden sm:inline">Actualizar</span></Button></div>
      {active ? <TicketConversation key={`${active.id}:${active.updatedAt}`} ticket={active} /> : <div className="grid justify-items-center gap-3 py-20 text-center text-ink-500"><MessageSquare className="size-8" /><p>Selecciona una consulta para atenderla.</p></div>}
    </section>
  </div>;
}

function TicketConversation({ ticket }: { ticket: DeskTicket }) {
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<SupportStatus>(ticket.status === "abierto" ? "en-revision" : ticket.status);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter(); const { showToast } = useToast();
  return <><div className="border-b border-line-300 pb-5"><p className="text-xs font-semibold text-brand-700">{ticket.code} · {ticket.lockerCode}</p><h3 className="mt-2 font-display text-2xl font-semibold text-navy-900">{ticket.subject}</h3><p className="mt-2 text-sm text-ink-500">{ticket.customerName}</p></div>
    <ol className="my-6 grid max-h-[480px] gap-4 overflow-y-auto pr-1" aria-label="Mensajes">{ticket.messages.map(message => <li key={message.id} className={`max-w-[95%] rounded-2xl p-4 ${message.author === "soporte" ? "ml-auto bg-navy-900 text-white" : "mr-auto bg-cream-100 text-navy-900"}`}><p className="text-xs font-semibold">{message.authorName} · {message.author === "soporte" ? "Equipo A&L" : "Cliente"}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{message.body}</p><time className="mt-3 block text-xs opacity-75" dateTime={message.at}>{new Date(message.at).toLocaleString("es-MX")}</time></li>)}</ol>
    <form className="grid gap-4 border-t border-line-300 pt-5" onSubmit={event => {event.preventDefault(); setError(""); startTransition(async () => {try {const result = await manageSupportTicket({ticketId:ticket.id, expectedUpdatedAt:ticket.updatedAt,body,status}); if (!result.ok) {setError(result.error);return;} showToast({title:"Consulta actualizada",description:"El cliente tiene una notificación y un correo en cola."});router.refresh();} catch {setError("No se guardó la respuesta. Actualiza y vuelve a intentarlo.");}});}}>
      {ticket.status !== "cerrado" ? <Textarea label="Respuesta para el cliente" value={body} maxLength={4000} rows={4} onChange={event => setBody(event.target.value)} placeholder="Escribe una respuesta clara con el siguiente paso…" /> : <p className="rounded-xl bg-cream-100 p-4 text-sm text-ink-500">Esta consulta está cerrada. Cámbiala a «Abierto» para continuar la conversación.</p>}
      <Select label="Estado después de guardar" value={status} onChange={event => setStatus(event.target.value as SupportStatus)} options={[{value:"abierto",label:"Abierto"},{value:"en-revision",label:"En revisión"},{value:"cerrado",label:"Cerrado"}]} />
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <Button type="submit" loading={pending}><Send className="size-4" />{body.trim() ? "Enviar respuesta" : "Guardar estado"}</Button>
      <p className="text-xs leading-5 text-ink-500">Las respuestas son visibles para el cliente. No incluyas notas internas ni datos sensibles.</p>
    </form></>;
}
