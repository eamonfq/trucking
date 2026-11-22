import Link from "next/link";
import { Menu } from "lucide-react";
import { BrandLogo } from "@/components/marketing/brand-logo";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { site } from "@/lib/i18n/catalogs/site";
import { getT } from "@/lib/i18n/server";

const links = [
  { label: "Tarifas", href: "/#tarifas" },
  { label: "Cómo funciona", href: "/como-funciona" },
  { label: "Cobertura", href: "/#cobertura" },
  { label: "Preguntas", href: "/#faq" },
  { label: "App A&L", href: "/#app" },
] as const;

export async function MarketingHeader() {
  const t = await getT(site);
  return (
    <header className="sticky top-0 z-40 border-b border-line-200 bg-white/92 backdrop-blur-xl">
      <div className="mx-auto flex min-h-20 max-w-[90rem] items-center justify-between gap-5 px-5 sm:px-8 lg:h-21 lg:px-18">
        <BrandLogo className="h-8 w-auto sm:h-9" />
        <nav className="hidden items-center gap-9 lg:flex" aria-label={t("Navegación principal")}>
          {links.map((link) => <Link key={link.href} href={link.href} className="text-sm font-medium text-navy-900 transition hover:text-brand-700">{t(link.label)}</Link>)}
        </nav>
        <div className="hidden items-center gap-5 sm:flex">
          <LanguageSwitcher />
          <Link href="/login" className="text-sm font-medium text-navy-900 transition hover:text-brand-700">{t("Iniciar sesión")}</Link>
          <Link href="/registro" className="inline-flex min-h-11 items-center rounded-md bg-brand-600 px-5 text-sm font-semibold text-white shadow-card transition hover:-translate-y-0.5 hover:bg-brand-700">{t("Crear mi cuenta")}</Link>
        </div>
        <div className="ml-auto flex items-center sm:hidden"><LanguageSwitcher /></div>
        <details className="relative lg:hidden">
          <summary className="grid size-11 cursor-pointer list-none place-items-center rounded-md border border-line-300 bg-white" aria-label={t("Abrir menú")}><Menu className="size-5" /></summary>
          <nav className="absolute right-0 top-14 grid w-64 gap-1 rounded-xl border border-line-200 bg-white p-3 shadow-pop">
            {links.map((link) => <Link key={link.href} href={link.href} className="rounded-md px-4 py-3 text-sm font-medium text-navy-900 hover:bg-cream-100">{t(link.label)}</Link>)}
            <Link href="/rastrear" className="rounded-md px-4 py-3 text-sm font-medium text-navy-900 hover:bg-cream-100">{t("Rastrear envío")}</Link>
            <Link href="/login" className="mt-2 rounded-md border border-line-300 px-4 py-3 text-center text-sm font-semibold text-navy-900">{t("Iniciar sesión")}</Link>
            <Link href="/registro" className="rounded-md bg-brand-600 px-4 py-3 text-center text-sm font-semibold text-white">{t("Crear mi cuenta")}</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
