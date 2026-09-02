"use client";

import { useState } from "react";
import { CheckCheck } from "lucide-react";
import type { Notification } from "@/lib/types";

export function NotificationsList({ initial }: { initial: Notification[] }) { const [items, setItems] = useState(initial); return <><div className="flex justify-end"><button onClick={() => setItems((current) => current.map((item) => ({ ...item, read: true })))} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-stone-200 bg-white px-4 text-sm font-bold text-navy-700"><CheckCheck className="size-4 text-orange-500" />Marcar todas como leídas</button></div><div className="mt-5 grid gap-3">{items.map((item) => <button key={item.id} onClick={() => setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, read: true } : candidate))} className={`w-full rounded-2xl border p-5 text-left transition ${item.read ? "border-stone-200 bg-white" : "border-orange-200 bg-orange-50"}`}><div className="flex gap-4"><span className={`mt-1 size-2 shrink-0 rounded-full ${item.read ? "bg-stone-200" : "bg-orange-500"}`} /><div><p className="font-display font-bold text-navy-950">{item.title}</p><p className="mt-2 text-sm leading-6 text-navy-500">{item.body}</p></div></div></button>)}</div></>; }
