import type { Metadata } from "next";
import { requireWarehouseUser, signOut } from "@/lib/auth/actions";
import { BrandLogo } from "@/components/marketing/brand-logo";
export const metadata:Metadata={title:"Recepción en destino",robots:{index:false,follow:false}};
export default async function Layout({children}:{children:React.ReactNode}){const user=await requireWarehouseUser();return <main className="min-h-screen bg-cream-50 p-5 sm:p-8"><div className="mx-auto max-w-6xl"><header className="mb-8 flex flex-wrap items-center justify-between gap-4"><BrandLogo/><div className="text-right"><p className="font-semibold">{user.firstName} · Almacén</p><form action={signOut}><button className="text-sm text-orange-700">Cerrar sesión</button></form></div></header>{children}</div></main>;}
