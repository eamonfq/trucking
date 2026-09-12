import Link from "next/link";
import { Menu } from "lucide-react";
import { BrandLogo } from "@/components/marketing/brand-logo";

const links = [
  { label: "Tarifas", href: "/#tarifas" },
  { label: "Cómo funciona", href: "/como-funciona" },
  { label: "Cobertura", href: "/#cobertura" },
  { label: "Preguntas", href: "/#faq" },
];

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line-200 bg-white/92 backdrop-blur-xl">
      <div className="mx-auto flex min-h-20 max-w-[90rem] items-center justify-between gap-5 px-5 sm:px-8 lg:h-21 lg:px-18">
        <BrandLogo className="h-8 w-auto sm:h-9" />
        <nav className="hidden items-center gap-9 lg:flex" aria-label="Navegación principal">
          {links.map((link) => <Link key={link.href} href={link.href} className="text-sm font-medium text-navy-900 transition hover:text-brand-700">{link.label}</Link>)}
        </nav>
        <div className="hidden items-center gap-5 sm:flex">
          <Link href="/login" className="text-sm font-medium text-navy-900 transition hover:text-brand-700">Iniciar sesión</Link>
          <Link href="/registro" className="inline-flex min-h-11 items-center rounded-md bg-brand-600 px-5 text-sm font-semibold text-white shadow-card transition hover:-translate-y-0.5 hover:bg-brand-700">Crear mi cuenta</Link>
        </div>
        <details className="relative lg:hidden">
          <summary className="grid size-11 cursor-pointer list-none place-items-center rounded-md border border-line-300 bg-white" aria-label="Abrir menú"><Menu className="size-5" /></summary>
          <nav className="absolute right-0 top-14 grid w-64 gap-1 rounded-xl border border-line-200 bg-white p-3 shadow-pop">
            {links.map((link) => <Link key={link.href} href={link.href} className="rounded-md px-4 py-3 text-sm font-medium text-navy-900 hover:bg-cream-100">{link.label}</Link>)}
            <Link href="/rastrear" className="rounded-md px-4 py-3 text-sm font-medium text-navy-900 hover:bg-cream-100">Rastrear envío</Link>
            <Link href="/login" className="mt-2 rounded-md border border-line-300 px-4 py-3 text-center text-sm font-semibold text-navy-900">Iniciar sesión</Link>
            <Link href="/registro" className="rounded-md bg-brand-600 px-4 py-3 text-center text-sm font-semibold text-white">Crear mi cuenta</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
