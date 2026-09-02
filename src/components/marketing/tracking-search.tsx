"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, Search } from "lucide-react";

export function TrackingSearch({ dark = false }: { dark?: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (normalized) router.push(`/rastrear/${encodeURIComponent(normalized)}`);
  };
  return (
    <form onSubmit={submit} className={`flex w-full flex-col gap-2 rounded-[1.35rem] border p-2 shadow-soft sm:flex-row ${dark ? "border-white/15 bg-white/10" : "border-stone-200 bg-white"}`}>
      <label className="flex min-h-12 min-w-0 flex-1 items-center gap-3 px-3"><Search aria-hidden="true" className={dark ? "size-5 text-white/60" : "size-5 text-navy-400"} /><span className="sr-only">Número de guía</span><input value={code} onChange={(event) => setCode(event.target.value)} placeholder="BX-, SH- o TR-" className={`min-w-0 flex-1 bg-transparent text-base font-medium outline-none placeholder:font-normal ${dark ? "text-white placeholder:text-white/50" : "text-navy-950 placeholder:text-navy-400"}`} aria-label="Número de guía" /></label>
      <button type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-bold text-white transition hover:bg-orange-600">Rastrear <ArrowRight aria-hidden="true" className="size-4" /></button>
    </form>
  );
}
