import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { BoxMark } from "@/components/marketing/box-mark";

export default function FoundationPage() {
  return (
    <main className="relative grid min-h-screen overflow-hidden bg-cream-100 px-5 py-8 sm:px-8 lg:place-items-center">
      <div aria-hidden="true" className="absolute -right-36 -top-36 size-[32rem] rounded-full border-[6rem] border-white/50" />
      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 lg:grid-cols-[1.12fr_.88fr]">
        <section>
          <div className="inline-flex items-center gap-3 rounded-full border border-stone-200 bg-white/75 px-4 py-2 text-xs font-bold uppercase tracking-[.14em] text-navy-700 backdrop-blur"><span className="size-2 rounded-full bg-orange-500" />Fase 0 completada</div>
          <h1 className="mt-7 max-w-3xl font-display text-5xl font-extrabold leading-[.98] tracking-[-.055em] text-navy-950 sm:text-6xl lg:text-7xl">La base de una logística <span className="text-orange-500">sin sorpresas.</span></h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-navy-500">Sistema visual, dominio tipado y servicios mock listos para construir la experiencia A&L Trucking Logistics, una fase a la vez.</p>
          <div className="mt-8 flex flex-wrap gap-4"><Link href="/design" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-navy-950 px-6 text-sm font-bold text-white shadow-lift transition hover:-translate-y-0.5 hover:bg-navy-800">Ver sistema de diseño <ArrowRight className="size-4" /></Link></div>
          <div className="mt-9 grid gap-3 text-sm text-navy-700 sm:grid-cols-3">{["Tarifario centralizado", "Servicios reemplazables", "Accesibilidad AA"].map((item) => <p key={item} className="flex items-center gap-2"><CheckCircle2 className="size-4 text-success-700" />{item}</p>)}</div>
        </section>
        <div className="relative mx-auto w-full max-w-md"><div className="absolute inset-8 translate-y-16 rounded-full bg-orange-500/15 blur-3xl" /><div className="relative rotate-[-2deg] rounded-[2.5rem] border border-white/80 bg-white/55 p-10 shadow-lift backdrop-blur-sm"><BoxMark /></div></div>
      </div>
    </main>
  );
}
