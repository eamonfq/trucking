import type { Metadata } from "next";
import { requireWarehouseUser, signOut } from "@/lib/auth/actions";
import { BrandLogo } from "@/components/marketing/brand-logo";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { common } from "@/lib/i18n/catalogs/common";
import { receptionAlmacen } from "@/lib/i18n/catalogs/reception-almacen";
import { getT } from "@/lib/i18n/server";
export async function generateMetadata():Promise<Metadata>{const t=await getT(receptionAlmacen);return {title:t("Recepción en destino"),robots:{index:false,follow:false}};}
export default async function Layout({children}:{children:React.ReactNode}){const user=await requireWarehouseUser();const [t,tc]=await Promise.all([getT(receptionAlmacen),getT(common)]);return <main className="min-h-screen bg-cream-50 p-5 sm:p-8"><div className="mx-auto max-w-6xl"><header className="mb-8 flex flex-wrap items-center justify-between gap-4"><BrandLogo/><div className="text-right"><p className="font-semibold">{t("{name} · Almacén",{name:user.firstName})}</p><div className="mt-1 flex items-center justify-end gap-3"><LanguageSwitcher className="shrink-0"/><form action={signOut}><button className="text-sm text-orange-700">{tc("Cerrar sesión")}</button></form></div></div></header>{children}</div></main>;}
