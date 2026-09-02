import Link from "next/link";
import { Menu } from "lucide-react";
import { BrandLogo } from "@/components/marketing/brand-logo";

const links = [
  { label: "Tarifas", href: "/#tarifas" },
  { label: "Cómo funciona", href: "/#como-funciona" },
  { label: "Rastrear", href: "/rastrear" },
  { label: "Ayuda", href: "/#faq" },
];

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-cream-50/88 backdrop-blur-xl">
      <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-5 px-5 sm:px-8">
        <BrandLogo />
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Navegación principal">{links.map((link) => <Link key={link.href} href={link.href} className="text-sm font-semibold text-navy-600 transition hover:text-orange-600">{link.label}</Link>)}</nav>
        <div className="hidden items-center gap-3 sm:flex"><Link href="/login" className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-navy-700 hover:bg-white">Iniciar sesión</Link><Link href="/registro" className="inline-flex min-h-11 items-center rounded-full bg-navy-950 px-5 text-sm font-bold text-white shadow-soft transition hover:bg-navy-800">Registrarme</Link></div>
        <details className="relative sm:hidden"><summary className="grid size-11 cursor-pointer list-none place-items-center rounded-full border border-stone-200 bg-white" aria-label="Abrir menú"><Menu className="size-5" /></summary><nav className="absolute right-0 top-14 grid w-64 gap-1 rounded-2xl border border-stone-200 bg-white p-3 shadow-lift">{links.map((link) => <Link key={link.href} href={link.href} className="rounded-xl px-4 py-3 text-sm font-semibold text-navy-700 hover:bg-cream-100">{link.label}</Link>)}<Link href="/login" className="mt-2 rounded-xl bg-navy-950 px-4 py-3 text-center text-sm font-bold text-white">Iniciar sesión</Link></nav></details>
      </div>
    </header>
  );
}
