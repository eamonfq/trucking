"use client";

import { useState, useTransition } from "react";
import { CheckCheck } from "lucide-react";
import { markClientNotificationsRead } from "@/lib/auth/client-actions";
import type { Notification } from "@/lib/types";
import { formatDateTime } from "@/lib/utils/format";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";

export function NotificationsList({ initial }: { initial: Notification[] }) {
  const [items, setItems] = useState(initial);
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();
  const unread = items.filter((item) => !item.read).length;
  const markRead = (notificationId?: string) => {
    const previous = items;
    setItems((current) => current.map((item) => notificationId && item.id !== notificationId ? item : { ...item, read: true }));
    startTransition(async () => {
      const result = await markClientNotificationsRead(notificationId);
      if (!result.ok) {
        setItems(previous);
        showToast({ title: "No se pudo marcar como leída", description: result.error, variant: "error" });
      }
    });
  };
  if (!items.length) return <EmptyState title="No tienes avisos" description="Aquí verás recepciones en bodega, avances de tus envíos y resoluciones de pago." />;
  return <>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-navy-500">{unread ? `${unread} sin leer de ${items.length}` : `${items.length} avisos, todos leídos`}</p>
      <button type="button" onClick={() => markRead()} disabled={!unread || pending} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-stone-200 bg-white px-4 text-sm font-bold text-navy-700 transition hover:border-navy-400 disabled:cursor-not-allowed disabled:opacity-55"><CheckCheck className="size-4 text-orange-500" />Marcar todas como leídas</button>
    </div>
    <div className="mt-5 grid gap-3">{items.map((item) => <button type="button" key={item.id} onClick={() => !item.read && markRead(item.id)} aria-label={item.read ? `${item.title}, leída` : `Marcar ${item.title} como leída`} className={`w-full rounded-2xl border p-5 text-left transition ${item.read ? "border-stone-200 bg-white" : "border-orange-200 bg-orange-50 hover:border-orange-300"}`}><div className="flex gap-4"><span className={`mt-1 size-2 shrink-0 rounded-full ${item.read ? "bg-stone-200" : "bg-orange-500"}`} /><div className="min-w-0"><p className="font-display font-bold text-navy-950">{item.title}</p><p className="mt-2 text-sm leading-6 text-navy-500">{item.body}</p><p className="mt-3 text-xs font-semibold text-navy-400">{formatDateTime(item.createdAt)}</p></div></div></button>)}</div>
  </>;
}
