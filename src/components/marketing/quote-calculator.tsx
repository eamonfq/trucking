"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { suggestCategory } from "@/lib/utils/suggest-category";
import { formatUsd } from "@/lib/utils/format";
import type { BoxCategory } from "@/lib/config/box-categories";

const numeric = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

export function QuoteCalculator({ rates }: { rates?: BoxCategory[] }) {
  const [values, setValues] = useState({ length: "", width: "", height: "", weight: "" });
  const complete = Object.values(values).every((value) => numeric(value) > 0);
  const result = useMemo(() => {
    if (!complete) return null;
    return suggestCategory({ length: numeric(values.length), width: numeric(values.width), height: numeric(values.height) }, numeric(values.weight), rates);
  }, [complete, rates, values]);
  const update = (key: keyof typeof values, value: string) => setValues((current) => ({ ...current, [key]: value }));

  const category = result?.category ?? null;
  const largest = (rates ?? []).at(-1);
  const title = !result ? "Tu categoría" : category ? category.name : "No entra en ninguna categoría";
  const price = category ? formatUsd(category.priceUsd) : "—";
  const note = !result
    ? "Ingresa las cuatro medidas para ver la categoría y el precio."
    : category
      ? `Categoría ${category.name} · ${category.dimensions.length} × ${category.dimensions.width} × ${category.dimensions.height} in · hasta ${category.maxWeightLb} lb. Tarifa base sujeta a validación en bodega y a los ajustes aplicables.`
      : result.upgradedByDimensions
        ? `Alguna medida exterior supera la categoría ${largest?.name ?? "más grande"} (${largest ? `${largest.dimensions.length} × ${largest.dimensions.width} × ${largest.dimensions.height} in` : "del catálogo"}). Escríbenos para revisar tu caso antes de enviar.`
        : "Las medidas caben, pero el peso total rebasa el límite de esa categoría. Reduce el contenido o divídelo en dos cajas.";
  const priceTone = category ? "text-brand-300" : result ? "text-[#FF8F80]" : "text-[#A8B2CA]";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22.5rem] lg:items-start">
      <div className="grid min-w-0 gap-5 sm:grid-cols-2">
        <Measure label="Largo (in)" placeholder="16" value={values.length} onChange={(value) => update("length", value)} />
        <Measure label="Ancho (in)" placeholder="20" value={values.width} onChange={(value) => update("width", value)} />
        <Measure label="Alto (in)" placeholder="15" value={values.height} onChange={(value) => update("height", value)} />
        <Measure label="Peso total (lb)" placeholder="45" value={values.weight} onChange={(value) => update("weight", value)} />
        <p className="flex items-start gap-2.5 rounded-lg bg-cream-100 px-4.5 py-4 text-sm leading-6 text-ink-700 sm:col-span-2">
          <span aria-hidden="true" className="mt-0.5 font-bold text-brand-700">i</span>
          El peso indicado incluye la caja y su contenido. Usa las medidas exteriores, no las del artículo.
        </p>
      </div>
      <div className="flex min-h-75 min-w-0 flex-col justify-between gap-7 rounded-xl bg-navy-900 p-8">
        <p className="text-over font-semibold uppercase text-brand-300">Tu resultado</p>
        <div className="flex flex-col gap-3">
          <p className="font-display text-[2.5rem] font-extrabold leading-none tracking-[-.03em] text-white">{title}</p>
          <p aria-live="polite" className={`font-display text-[4rem] font-extrabold leading-none tracking-[-.04em] ${priceTone}`}>{price}</p>
          <p className="text-sm leading-6 text-[#A8B2CA] text-pretty">{note}</p>
        </div>
        <Link href="/registro" className="flex h-13.5 items-center justify-center rounded-lg bg-brand-600 text-base font-semibold text-white transition hover:bg-brand-700">Crear mi cuenta</Link>
      </div>
    </div>
  );
}

function Measure({ label, value, placeholder, onChange }: { label: string; value: string; placeholder: string; onChange: (value: string) => void }) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-medium text-ink-700">
      {label}
      <input
        type="number"
        min="0"
        step="0.1"
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-14 w-full min-w-0 rounded-lg border-[1.5px] border-line-300 bg-white px-4 text-base font-medium text-navy-900 outline-none transition placeholder:text-label-600 focus:border-brand-700"
      />
    </label>
  );
}
