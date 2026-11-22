import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/marketing/brand-logo";
import { COMPANY } from "@/lib/config/company";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { auth } from "@/lib/i18n/catalogs/auth";
import { getT } from "@/lib/i18n/server";

const BENEFITS = [
  "Precio fijo por categoría de caja",
  "Agrupa varias cajas en un solo envío",
  "Rastreo etapa por etapa hasta la entrega",
] as const;

export async function AuthShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  const t = await getT(auth);
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1fr_38.75rem]">
      {/* La columna se centra: en pantallas anchas el panel izquierdo crece y el
          formulario quedaría pegado al borde con un vacío enorme al lado. */}
      <section className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-between gap-12 px-5 py-10 sm:px-0 lg:py-16">
        <div className="flex items-center justify-between gap-4"><BrandLogo className="h-8 w-auto" /><LanguageSwitcher /></div>
        <div className="flex w-full flex-col gap-8">
          <div className="flex flex-col gap-3">
            <p className="text-over font-semibold uppercase text-brand-700">{eyebrow}</p>
            <h1 className="font-display text-[2.5rem] font-extrabold leading-[.98] tracking-[-.04em] text-navy-900 sm:text-d3">{title}</h1>
            <p className="text-base leading-relaxed text-ink-700 text-pretty">{description}</p>
          </div>
          {children}
        </div>
        <p className="text-sm text-ink-500">
          {t("También puedes")} <Link href="/rastrear" className="font-medium text-navy-900 underline decoration-brand-500 decoration-2 underline-offset-4">{t("rastrear un envío")}</Link> {t("sin iniciar sesión.")}
        </p>
      </section>

      <aside className="relative hidden flex-col justify-between gap-10 bg-navy-900 p-14 lg:flex">
        <p className="text-over font-semibold uppercase text-brand-300">{t("Tu casillero A&L")}</p>
        <div className="flex flex-col gap-7">
          <div className="flex flex-col gap-3.5">
            <h2 className="font-display text-[2.75rem] font-extrabold leading-none tracking-[-.03em] text-white">{t("Compra en USA,")}<br />{t("recibe en México.")}</h2>
            <p className="max-w-md text-base leading-relaxed text-[#A8B2CA]">{t("Cada cuenta incluye una dirección de bodega en Miami y un número de casillero para identificar tus compras.")}</p>
          </div>
          <div className="flex flex-col gap-3.5 rounded-lg border border-navy-700 bg-navy-800 p-6">
            <p className="text-[.6875rem] font-semibold uppercase tracking-[.14em] text-[#A8B2CA]">{t("Casillero")}</p>
            <p className="font-display text-3xl font-extrabold tracking-[-.02em] text-brand-300">AL-MX-0001</p>
            <p className="pending-data rounded-md p-3.5 text-sm leading-6 text-[#A8B2CA]">{COMPANY.warehouseAddress === "Dirección de bodega en Miami por confirmar" ? t("Dirección de bodega en Miami por confirmar") : COMPANY.warehouseAddress}</p>
          </div>
          <ul className="flex flex-col">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-center gap-3 border-t border-navy-700 py-3.5 last:border-b">
                <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-brand-600" />
                <span className="text-base text-[#D6DCEA]">{t(benefit)}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-[#8A96B4]">{t("A&L Trucking Logistics · Acceso personal y seguro")}</p>
      </aside>
    </main>
  );
}
