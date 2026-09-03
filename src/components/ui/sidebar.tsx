import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { BrandLogo } from "@/components/marketing/brand-logo";

export type SidebarItem = { label: string; href: string; icon: LucideIcon; active?: boolean };

export function Sidebar({ items, footer }: { items: SidebarItem[]; footer?: React.ReactNode }) {
  return (
    <aside className="flex min-h-full w-full flex-col rounded-card bg-navy-950 p-4 text-white shadow-lift lg:w-72">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-2 pb-5"><BrandLogo inverse /><p className="text-right text-[10px] font-bold uppercase leading-4 tracking-wider text-white/55">Panel<br />operativo</p></div>
      <nav className="mt-5 grid gap-1" aria-label="Navegación principal">{items.map(({ href, label, icon: Icon, active }) => <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${active ? "bg-white text-navy-950" : "text-white/70 hover:bg-white/10 hover:text-white"}`}><Icon aria-hidden="true" className={`size-4.5 ${active ? "text-orange-500" : ""}`} />{label}</Link>)}</nav>
      {footer && <div className="mt-auto border-t border-white/10 px-2 pt-5">{footer}</div>}
    </aside>
  );
}
