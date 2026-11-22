"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { calculateBilling, type WeightPricing, type BillingMode } from "@/lib/utils/billing";
import { suggestCategory } from "@/lib/utils/suggest-category";
import { formatUsd } from "@/lib/utils/format";
import type { BoxCategory } from "@/lib/config/box-categories";
import { marketing } from "@/lib/i18n/catalogs/marketing";
import { useT } from "@/lib/i18n/provider";

const numeric = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

export function QuoteCalculator({ rates, weightPricing, client = false }: { rates: BoxCategory[]; weightPricing: WeightPricing; client?: boolean }) {
  const t = useT(marketing);
  const [mode,setMode]=useState<BillingMode>("volumen");
  const [values, setValues] = useState({ length: "", width: "", height: "", weight: "" });
  const dimensionsComplete = [values.length, values.width, values.height].every(value => numeric(value) > 0);
  const complete = mode === "peso-real" ? numeric(values.weight) > 0 : mode === "volumen" ? dimensionsComplete : dimensionsComplete && numeric(values.weight) > 0;
  const result = useMemo(() => {
    if (!complete) return null;
    return suggestCategory({ length: numeric(values.length), width: numeric(values.width), height: numeric(values.height) }, numeric(values.weight), rates);
  }, [complete, rates, values]);
  const update = (key: keyof typeof values, value: string) => setValues((current) => ({ ...current, [key]: value }));

  const category = result?.category ?? null;
  let billing: ReturnType<typeof calculateBilling> | undefined;
  if(complete&&mode!=="manual"&&(mode==="peso-real"||mode==="volumen"||category)){
    try{billing=calculateBilling(mode,{length:numeric(values.length),width:numeric(values.width),height:numeric(values.height)},numeric(values.weight),weightPricing,category?.priceUsd);}catch{}
  }
  const title = mode==="manual" ? t("Carga especial") : mode==="peso-real" ? t("Por peso real") : mode==="volumen" ? t("Por volumen") : !complete ? t("Precio fijo") : category?.name ?? t("Carga personalizada");
  const price = billing ? formatUsd(billing.amountUsd) : mode==="manual" ? t("Por cotizar") : "—";
  const note = mode==="manual" ? t("Vehículos, motos, cuatrimotos, maquinaria, mudanzas y otros artículos especiales requieren una cotización acordada con operaciones.")
    : !complete ? mode==="volumen" ? t("Ingresa las tres medidas exteriores en pulgadas.") : mode==="peso-real" ? t("Ingresa el peso real en libras; no necesitas medidas.") : t("Ingresa las dimensiones exteriores en pulgadas y el peso real en libras.")
    : mode==="fijo"&&!category ? t("No coincide con una categoría de precio fijo. Puedes consultar por libra o solicitar una cotización manual; no significa que la carga sea rechazada.")
    : !billing ? t("Revisa las medidas y el peso: el importe queda fuera del rango permitido.")
    : t("Estimación por paquete. Se confirma con las medidas reales en bodega; no incluye seguro, entrega a domicilio ni recargos aplicables.");
  const priceTone = billing||mode==="manual" ? "text-brand-300" : "text-[#A8B2CA]";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22.5rem] lg:items-start">
      <div className="grid min-w-0 gap-5 sm:grid-cols-2">
        <fieldset className="sm:col-span-2"><legend className="mb-3 text-sm font-semibold text-ink-700">{t("Cómo quieres cotizar")}</legend><div className="grid grid-cols-2 gap-2">{([{value:"volumen",label:t("Por volumen")},{value:"peso-real",label:t("Por peso")},{value:"fijo",label:t("Precio fijo")},{value:"manual",label:t("Carga especial")}] as const).map(option=><label key={option.value} className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border p-3 text-sm font-semibold focus-within:ring-2 focus-within:ring-inset focus-within:ring-brand-600 ${mode===option.value?"border-brand-600 bg-orange-50 text-orange-800":"border-line-300 bg-white text-navy-600"}`}><input className="sr-only" type="radio" name="quoteMode" checked={mode===option.value} onChange={()=>setMode(option.value)}/>{option.label}</label>)}</div></fieldset>
        {mode!=="manual"?<>
        {mode!=="peso-real"&&<><Measure label={t("Largo (in)")} placeholder="16" value={values.length} onChange={(value) => update("length", value)} />
        <Measure label={t("Ancho (in)")} placeholder="20" value={values.width} onChange={(value) => update("width", value)} />
        <Measure label={t("Alto (in)")} placeholder="15" value={values.height} onChange={(value) => update("height", value)} /></>}
        <Measure label={mode==="volumen"?t("Peso real (lb, opcional)"):t("Peso total (lb)")} placeholder="45" value={values.weight} onChange={(value) => update("weight", value)} />
        <p className="flex items-start gap-2.5 rounded-lg bg-cream-100 px-4.5 py-4 text-sm leading-6 text-ink-700 sm:col-span-2">
          <span aria-hidden="true" className="mt-0.5 font-bold text-brand-700">i</span>
          {mode==="volumen" ? t("El precio depende solo de las medidas exteriores. El peso es informativo y no modifica el cobro.") : t("El peso indicado incluye la caja y su contenido. Por peso se redondea hacia arriba a la siguiente libra completa.")}
        </p></>:<p className="rounded-xl bg-cream-100 p-5 text-base leading-7 text-ink-700 sm:col-span-2">{t("Las cargas especiales se cotizan de forma individual. Prepara una descripción, destino, medidas y peso aproximado; operaciones confirmará el importe antes de registrar el cobro.")}</p>}
      </div>
      <div className="flex min-h-75 min-w-0 flex-col justify-between gap-7 rounded-xl bg-navy-900 p-8">
        <p className="text-over font-semibold uppercase text-brand-300">{t("Tu resultado")}</p>
        <div className="flex flex-col gap-3">
          <p className="font-display text-[2.5rem] font-extrabold leading-none tracking-[-.03em] text-white">{title}</p>
          <p aria-live="polite" className={`font-display text-[clamp(2rem,4vw,3.5rem)] break-words font-extrabold leading-none tracking-[-.04em] ${priceTone}`}>{price}</p>
          {billing&&mode==="peso-real"&&<dl className="grid gap-2 rounded-lg bg-white/5 p-4 text-sm text-white"><div className="flex justify-between gap-3"><dt>{t("Peso real")}</dt><dd>{billing.actualWeightLb} lb</dd></div><div className="flex justify-between gap-3"><dt>{t("Peso a cobrar")}</dt><dd>{billing.billableWeightLb} lb</dd></div><div className="border-t border-white/15 pt-2">{billing.billableWeightLb} lb × {formatUsd(billing.pricePerLbUsd)} / lb</div></dl>}
          {mode==="volumen"&&<p className="text-sm leading-6 text-[#A8B2CA]">{t("Fórmula: (largo × ancho × alto ÷ {base}) × {factor} = importe en USD. No se multiplica por la tarifa por libra.", { base: weightPricing.dimensionalBase, factor: weightPricing.dimensionalFactor })}</p>}
          <p role="status" className="text-sm leading-6 text-[#A8B2CA] text-pretty">{note}</p>
        </div>
        <Link href={client?"/cliente/soporte":"/registro"} className="flex h-13.5 items-center justify-center rounded-lg bg-brand-600 text-base font-semibold text-white transition hover:bg-brand-700">{client?t("Consultar con operaciones"):t("Crear mi cuenta")}</Link>
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
