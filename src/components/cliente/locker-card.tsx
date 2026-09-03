"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

export function LockerCard({ lockerCode, holderName, warehouseAddress, originMode }: { lockerCode: string; holderName: string; warehouseAddress: string; originMode: "casillero" | "entrega-directa" }) {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();
  const shippingLabel = `A&L ${holderName}\n${lockerCode}\n${warehouseAddress}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(originMode === "casillero" ? shippingLabel : `${holderName} · ${lockerCode}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
      showToast({ title: "Datos copiados", description: originMode === "casillero" ? "Pégalos como dirección de envío en la tienda." : "Compártelos al coordinar tu entrega." });
    } catch {
      showToast({ title: "No pudimos copiar", description: "Copia los datos manualmente desde la tarjeta.", variant: "error" });
    }
  };
  return <Card className="relative overflow-hidden bg-navy-950 text-white">
    <div aria-hidden="true" className="absolute -right-20 -top-20 size-56 rounded-full border-[3rem] border-white/5" />
    <p className="relative text-xs font-bold uppercase tracking-[.16em] text-orange-400">Mi casillero</p>
    <div className="relative mt-5 flex flex-wrap items-end justify-between gap-5">
      <div><p className="font-display text-3xl font-bold">{lockerCode}</p><p className="mt-2 text-sm text-white/55">A nombre de {holderName}</p></div>
      <button type="button" onClick={copy} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-bold text-navy-950 transition hover:bg-cream-100">{copied ? <Check className="size-4 text-success-700" /> : <Copy className="size-4" />}{copied ? "Copiado" : "Copiar datos"}</button>
    </div>
    {originMode === "casillero"
      ? <div className="relative mt-7 rounded-2xl bg-white/8 p-4"><p className="text-xs text-white/45">Dirección de bodega</p><p className="mt-1 text-sm font-semibold">{warehouseAddress}</p><p className="mt-3 text-xs text-orange-300">Siempre coloca A&L junto a tu nombre en cada compra.</p></div>
      : <div className="relative mt-7 rounded-2xl bg-white/8 p-4"><p className="text-xs text-white/45">Entrega directa</p><p className="mt-1 text-sm font-semibold">Lleva tu caja sellada a nuestro punto de recepción o solicita recolección desde Soporte.</p><p className="mt-3 text-xs text-orange-300">Menciona tu casillero {lockerCode} al coordinar la cita.</p></div>}
  </Card>;
}
