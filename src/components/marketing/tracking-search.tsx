"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";

export function TrackingSearch({ dark = false }: { dark?: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (normalized) router.push(`/rastrear/${encodeURIComponent(normalized)}`);
  };
  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-3 sm:flex-row">
      <div className="relative min-w-0 flex-1">
        <Search aria-hidden="true" className={`pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 ${dark ? "text-[#A8B2CA]" : "text-label-600"}`} />
        <label className="sr-only" htmlFor="tracking-code">Número de guía</label>
        <input
          id="tracking-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="BX-, SH- o TR-"
          autoComplete="off"
          className={`h-15 w-full rounded-lg border-[1.5px] px-4 pl-11 text-base font-medium outline-none transition ${dark ? "border-navy-700 bg-[#141F38] text-white placeholder:text-[#8A96B4] focus:border-brand-300" : "border-line-300 bg-white text-navy-900 placeholder:text-label-600 focus:border-brand-700"}`}
        />
      </div>
      <button type="submit" className="inline-flex h-15 shrink-0 items-center justify-center rounded-lg bg-brand-600 px-8 text-base font-semibold text-white transition hover:-translate-y-0.5 hover:bg-brand-700">Rastrear</button>
    </form>
  );
}
