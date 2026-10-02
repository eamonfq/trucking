"use client";

import { Box, ChevronLeft, ChevronRight, Copy, Minus, Plus } from "lucide-react";
import type { BoxCategory } from "@/lib/config/box-categories";
import { formatUsd } from "@/lib/utils/format";

export type CatalogPiece = { categoryId: string; weightLb: number };

export function FixedBoxCatalog({ rates, pieces, page: requestedPage, onPageChange, onChange }: {
  rates: BoxCategory[];
  pieces: CatalogPiece[];
  page: number;
  onPageChange: (page: number) => void;
  onChange: (pieces: CatalogPiece[]) => void;
}) {
  const page = Math.min(requestedPage, Math.max(0, Math.ceil(pieces.length / 5) - 1));
  const counts = new Map(rates.map(rate => [rate.id, pieces.filter(piece => piece.categoryId === rate.id).length]));
  const firstWeight = pieces[0]?.weightLb ?? 0;
  const update = (index: number, change: Partial<CatalogPiece>) => onChange(pieces.map((piece, i) => i === index ? { ...piece, ...change } : piece));

  return <section className="@container grid min-w-0 gap-4" aria-label="Precios fijos por caja">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="text-sm font-semibold text-navy-950">Arma esta recepción</h3><p className="mt-1 max-w-md text-xs leading-5 text-navy-500">Añade cada tamaño con +. Puedes combinar cajas diferentes en el mismo grupo.</p></div>
      <span aria-live="polite" className="inline-flex items-center gap-2 rounded-full bg-navy-950 px-3 py-2 text-xs font-semibold text-white"><Box className="size-3.5"/>{pieces.length} {pieces.length === 1 ? "caja" : "cajas"}</span>
    </div>
    <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,128px),1fr))]">
      {rates.map(rate => {
        const count = counts.get(rate.id) ?? 0;
        return <article key={rate.id} className={`overflow-hidden rounded-xl border transition-colors ${count ? "border-orange-400 bg-orange-50/40" : "border-stone-200 bg-white"}`}>
<div className="p-3"><div className="flex items-center justify-between gap-2"><strong className="font-display text-sm text-navy-950">{rate.name}</strong><Box className={`size-4 shrink-0 ${count ? "text-orange-600" : "text-stone-300"}`}/></div><p className="mt-2 flex items-baseline gap-1 whitespace-nowrap font-bold tabular-nums text-navy-950"><span className="text-base min-[600px]:text-lg">{formatUsd(rate.priceUsd).replace(" USD", "")}</span><span className="text-[10px] font-medium text-navy-400">USD</span></p><p className="mt-1 text-[11px] leading-5 text-navy-500">{rate.dimensions.length} × {rate.dimensions.width} × {rate.dimensions.height} in<br/>Hasta {rate.maxWeightLb} lb</p></div>
          <div className={`flex items-center justify-between border-t px-2 py-1 ${count ? "border-orange-200 bg-orange-50" : "border-stone-100 bg-stone-50"}`}>
            <button type="button" aria-label={`Quitar caja ${rate.name}`} disabled={!count} onClick={() => { const index = pieces.findLastIndex(piece => piece.categoryId === rate.id); onChange(pieces.filter((_, i) => i !== index)); }} className="grid size-10 place-items-center rounded-lg text-navy-600 transition hover:bg-white focus-visible:outline-2 focus-visible:outline-orange-500 disabled:opacity-25"><Minus className="size-4"/></button>
            <span aria-label={`Cantidad ${rate.name}`} className={`text-sm font-semibold tabular-nums ${count ? "text-orange-800" : "text-navy-400"}`}>{count}</span>
            <button type="button" aria-label={`Añadir caja ${rate.name}`} disabled={pieces.length >= 50} onClick={() => onChange([...pieces, { categoryId: rate.id, weightLb: 0 }])} className="grid size-10 place-items-center rounded-lg bg-white text-orange-700 shadow-sm transition hover:bg-orange-600 hover:text-white focus-visible:outline-2 focus-visible:outline-orange-500 disabled:opacity-25"><Plus className="size-4"/></button>
          </div>
        </article>;
      })}
    </div>
    {!rates.length && <p role="status" className="rounded-xl bg-stone-50 p-4 text-sm text-navy-500">No hay cajas activas en el catálogo.</p>}
    {pieces.length > 0 ? <>
      <div aria-label="Composición de cajas" className="flex flex-wrap gap-2">{rates.filter(rate => counts.get(rate.id)).map(rate => <span key={rate.id} className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-navy-600">{counts.get(rate.id)} × {rate.name}</span>)}</div>
      <div className="border-t border-stone-100 pt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-semibold text-navy-950">Peso real por caja</h3><p className="mt-1 text-xs text-navy-500">Las medidas vienen del tamaño elegido. El peso no cambia el precio fijo.</p></div>{pieces.length > 1 && <button type="button" disabled={firstWeight <= 0} onClick={() => onChange(pieces.map(piece => ({ ...piece, weightLb: firstWeight })))} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-navy-600 transition hover:bg-stone-50 disabled:opacity-35"><Copy className="size-3.5"/>Usar peso de caja 1 en todas</button>}</div>
        <div className="grid gap-2">{pieces.slice(page * 5, page * 5 + 5).map((piece, row) => {
          const index = page * 5 + row, rate = rates.find(rate => rate.id === piece.categoryId);
          const exceeded = Boolean(rate && piece.weightLb > rate.maxWeightLb);
          return <div key={index} className={`grid grid-cols-[28px_minmax(0,1fr)] items-start gap-x-2.5 gap-y-2 rounded-xl border p-3 @min-[380px]:grid-cols-[28px_minmax(0,1fr)_90px] @min-[520px]:grid-cols-[28px_minmax(0,1fr)_100px_88px] ${exceeded ? "border-red-200 bg-red-50/30" : "border-stone-200 bg-white"}`}>
            <span className="mt-7 text-xs font-semibold tabular-nums text-navy-400">{String(index + 1).padStart(2, "0")}</span>
            <label className="grid min-w-0 gap-1.5"><span className="text-[11px] font-medium text-navy-500">Caja del catálogo</span><select aria-label={`Paquete ${index + 1} · Caja del catálogo`} value={piece.categoryId} onChange={event => update(index, { categoryId: event.target.value })} className="w-full min-w-0 rounded-lg border border-stone-200 bg-white px-2.5 text-sm font-semibold text-navy-950 outline-none focus:border-orange-500 focus:ring-2 focus:ring-inset focus:ring-orange-100"><option value="" disabled>Selecciona tamaño</option>{rates.map(rate => <option key={rate.id} value={rate.id}>{rate.name}</option>)}</select><span className="text-[10px] leading-4 text-navy-400">{rate ? `${rate.dimensions.length} × ${rate.dimensions.width} × ${rate.dimensions.height} in` : "Selecciona una caja vigente"}</span></label>
<label className="col-start-2 grid min-w-0 gap-1.5 @min-[380px]:col-start-auto"><span className="text-[11px] font-medium text-navy-500">Peso (lb)</span><input name={index === 0 ? "weightLb" : `catalogWeight${index + 1}`} aria-label={`Paquete ${index + 1} · Peso (lb)`} type="number" min="0.1" step="0.1" inputMode="decimal" required placeholder="0.0" value={piece.weightLb || ""} aria-invalid={exceeded || undefined} onChange={event => update(index, { weightLb: Number(event.target.value) })} className={`w-full rounded-lg border bg-white px-2.5 text-sm font-semibold tabular-nums outline-none focus:ring-2 focus:ring-inset ${exceeded ? "border-red-300 text-red-700 focus:ring-red-100" : "border-stone-200 text-navy-950 focus:border-orange-500 focus:ring-orange-100"}`}/><span className={`text-[10px] leading-4 ${exceeded ? "text-red-700" : "text-navy-400"}`}>{rate ? `Máx. ${rate.maxWeightLb} lb` : ""}</span></label>
<div className="col-start-2 flex flex-wrap items-center justify-end gap-2 @min-[380px]:col-span-2 @min-[520px]:col-auto @min-[520px]:col-start-auto @min-[520px]:block @min-[520px]:text-right"><p className="text-[11px] font-medium text-navy-400">Precio fijo</p><p className="whitespace-nowrap text-xs font-bold tabular-nums text-navy-950 @min-[520px]:mt-4">{rate ? formatUsd(rate.priceUsd) : "—"}</p></div>
            {exceeded && <p role="alert" className="col-span-full mt-1 text-xs leading-5 text-red-700">Caja {index + 1}: la caja elegida no admite este peso. Selecciona una categoría válida o corrige el peso medido.</p>}
          </div>;
        })}</div>
        {pieces.length > 5 && <nav aria-label="Páginas de cajas del catálogo" className="mt-3 flex items-center justify-between"><span className="text-xs text-navy-500">Cajas {page * 5 + 1}–{Math.min(page * 5 + 5, pieces.length)} de {pieces.length}</span><div className="flex gap-2"><button type="button" aria-label="Cajas anteriores" disabled={page === 0} onClick={() => onPageChange(page - 1)} className="grid size-10 place-items-center rounded-lg border border-stone-200 disabled:opacity-30"><ChevronLeft className="size-4"/></button><button type="button" aria-label="Cajas siguientes" disabled={(page + 1) * 5 >= pieces.length} onClick={() => onPageChange(page + 1)} className="grid size-10 place-items-center rounded-lg border border-stone-200 disabled:opacity-30"><ChevronRight className="size-4"/></button></div></nav>}
      </div>
    </> : <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50/60 p-4 text-center"><p className="text-sm font-medium text-navy-600">Empieza añadiendo tu primera caja</p><p className="mt-1 text-xs text-navy-400">Ejemplo: 2 Small + 1 Medium + 1 Large.</p></div>}
    {pieces.length >= 50 && <p role="status" className="text-xs text-navy-500">Llegaste al máximo de 50 cajas por recepción.</p>}
  </section>;
}
