"use client";
import type { ReactNode } from "react";
import { NavigationPending } from "@/components/ui/navigation-pending";
import Link from "next/link";
import { PencilLine, Boxes, ClipboardCheck, FileText, Gauge, Mail, Menu, Settings, Truck, UsersRound, ListTodo, MessageSquare, PackageCheck } from "lucide-react";
import { Sidebar } from "@/components/ui/sidebar";
import { BrandLogo } from "@/components/marketing/brand-logo";
import { signOut } from "@/lib/auth/actions";
import { canAdminPath, type AdminPrincipal } from "@/lib/auth/admin-permissions";
import {AdminAccessProvider} from "./admin-access";

const navigation = [
  { label: "Usuarios y permisos", href: "/admin/usuarios", icon: UsersRound },
  { label: "Resumen", href: "/admin", icon: Gauge },
  { label: "Pendientes", href: "/admin/pendientes", icon: ListTodo },
  { label: "Recepción", href: "/admin/recepcion", icon: ClipboardCheck },
  { label: "Prealertas", href: "/admin/prealertas", icon: ClipboardCheck },
  { label: "Almacenes y operadores", href: "/admin/almacenes", icon: UsersRound },
  { label: "Recepción en destino", href: "/admin/recepcion-destino", icon: PackageCheck },
  { label: "Bodega", href: "/admin/bodega", icon: Boxes },
  { label: "Camiones", href: "/admin/camiones", icon: Truck },
  { label: "Entregas", href: "/admin/entregas", icon: PackageCheck },
  { label: "Facturas", href: "/admin/facturas", icon: FileText },
  { label: "Clientes", href: "/admin/clientes", icon: UsersRound },
  { label: "Soporte", href: "/admin/soporte", icon: MessageSquare },
  { label: "Edición", href: "/admin/edicion", icon: PencilLine },
  { label: "Correos", href: "/admin/correos", icon: Mail },
  { label: "Configuración", href: "/admin/configuracion", icon: Settings },
];

export function AdminShell({ children, user }: { children: ReactNode; user: AdminPrincipal }) {
  const items=navigation.filter(item=>canAdminPath(user,item.href));
  return (
    <AdminAccessProvider user={user}><main className="min-h-screen bg-navy-950 p-3 sm:p-5">
      <div className="mx-auto grid max-w-[1700px] gap-5 lg:grid-cols-[18rem_1fr]">
        <div className="hidden lg:block">
          <div className="sticky top-5 h-[calc(100vh-2.5rem)]">
            <Sidebar
              items={items}
              footer={
                <form action={signOut}>
                  <p className="text-sm font-bold">Operaciones A&amp;L</p>
                  <button className="mt-3 text-xs font-semibold text-orange-400">Cerrar sesión</button>
                </form>
              }
            />
          </div>
        </div>

        <div className="min-w-0 rounded-[1.8rem] bg-cream-50 p-5 sm:p-8 lg:p-10">
          <div className="mb-5 flex items-center justify-between lg:hidden">
            <BrandLogo />
            <details className="relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-bold shadow-sm">
                <Menu className="size-4" /> Menú
              </summary>
              <nav className="absolute right-0 z-30 mt-2 w-56 rounded-2xl border border-stone-200 bg-white p-2 shadow-xl">
                {items.map((item) => (
                  <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-navy-800 hover:bg-orange-50">
                    <item.icon className="size-4 text-orange-500" />
                    {item.label}<NavigationPending/>
                  </Link>
                ))}
                <form action={signOut} className="border-t border-stone-100 px-3 pt-2">
                  <button className="py-2 text-sm font-bold text-orange-600">Cerrar sesión</button>
                </form>
              </nav>
            </details>
          </div>
          {children}
        </div>
      </div>
    </main></AdminAccessProvider>
  );
}
