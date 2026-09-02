import Link from "next/link";
import { BrandLogo } from "@/components/marketing/brand-logo";
import { COMPANY } from "@/lib/config/company";

export function MarketingFooter() {
  return <footer className="bg-navy-950 text-white"><div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1fr_auto_auto]"><div><BrandLogo inverse /><p className="mt-5 max-w-sm text-sm leading-6 text-white/55">Carga terrestre USA → México con precio fijo por categoría de caja.</p></div><div><p className="text-xs font-bold uppercase tracking-[.16em] text-orange-500">Explora</p><nav className="mt-4 grid gap-3 text-sm text-white/65"><Link href="/#tarifas">Tarifas</Link><Link href="/rastrear">Rastrear</Link><Link href="/login">Mi cuenta</Link></nav></div><div><p className="text-xs font-bold uppercase tracking-[.16em] text-orange-500">Contacto</p><div className="mt-4 grid gap-3 text-sm text-white/65"><p>{COMPANY.supportEmail}</p><p>{COMPANY.supportPhone}</p><p>Redes sociales por confirmar</p></div></div></div><div className="border-t border-white/10"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 text-xs text-white/40 sm:flex-row sm:justify-between sm:px-8"><p>© 2026 A&L Trucking Logistics. Demo de validación.</p><p>Aviso de privacidad y términos por confirmar.</p></div></div></footer>;
}
