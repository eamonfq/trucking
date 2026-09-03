"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowUpRight, Box } from "lucide-react";
import { suggestCategory } from "@/lib/utils/suggest-category";
import { formatUsd } from "@/lib/utils/format";

const numeric = (value: string) => Number(value) || 0;

export function QuoteCalculator() {
  const [values, setValues] = useState({ length: "", width: "", height: "", weight: "" });
  const result = useMemo(() => {
    if (Object.values(values).some((value) => numeric(value) <= 0)) return null;
    return suggestCategory({ length: numeric(values.length), width: numeric(values.width), height: numeric(values.height) }, numeric(values.weight));
  }, [values]);
  const update = (key: keyof typeof values, value: string) => setValues((current) => ({ ...current, [key]: value }));
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_.8fr]">
      <div className="grid grid-cols-2 gap-4"><Measure label="Largo" value={values.length} onChange={(value) => update("length", value)} suffix="in" /><Measure label="Ancho" value={values.width} onChange={(value) => update("width", value)} suffix="in" /><Measure label="Alto" value={values.height} onChange={(value) => update("height", value)} suffix="in" /><Measure label="Peso total" value={values.weight} onChange={(value) => update("weight", value)} suffix="lb" /></div>
      <div className="flex min-h-56 flex-col justify-between rounded-card bg-navy-950 p-6 text-white">
        {!result ? <><span className="grid size-12 place-items-center rounded-2xl bg-white/10"><Box className="size-6 text-orange-500" /></span><div><p className="font-display text-xl font-bold">Tu categoría aparecerá aquí</p><p className="mt-2 text-sm leading-6 text-white/60">Ingresa las medidas exteriores y el peso total de tu caja.</p></div></> : result.category ? <><div className="flex items-start justify-between"><span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-bold">Recomendación</span><ArrowUpRight className="size-5 text-white/50" /></div><div><p className="font-display text-3xl font-bold">{result.category.name}</p><p className="mt-1 font-display text-xl font-bold text-orange-500">{formatUsd(result.category.priceUsd)}</p>{result.reason && <p className="mt-3 text-xs leading-5 text-white/60">Se eligió esta categoría por {result.reason.replaceAll("-", " ")}.</p>}</div></> : <><AlertTriangle className="size-8 text-orange-500" /><div><p className="font-display text-xl font-bold">Fuera del catálogo</p><p className="mt-2 text-sm leading-6 text-white/60">La caja supera la categoría Cubo. Contacta a soporte antes de enviarla.</p></div></>}
      </div>
    </div>
  );
}

function Measure({ label, value, onChange, suffix }: { label: string; value: string; onChange: (value: string) => void; suffix: string }) {
  return <label className="grid gap-2 text-sm font-bold text-navy-800">{label}<span className="flex min-h-14 items-center rounded-2xl border border-stone-200 bg-white px-4 transition focus-within:border-orange-500"><input type="number" min="0" step="0.1" value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent text-lg font-semibold outline-none" /><span className="text-xs text-navy-500">{suffix}</span></span></label>;
}
