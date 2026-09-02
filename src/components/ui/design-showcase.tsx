"use client";

import { useState } from "react";
import { Bell, Box, PackageCheck, Truck } from "lucide-react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { Textarea } from "@/components/ui/textarea";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { BOX_STATUSES, INVOICE_STATUSES, SHIPMENT_STATUSES, TRUCK_STATUSES } from "@/lib/types";

function Interactions() {
  const [open, setOpen] = useState(false);
  const { showToast } = useToast();
  return (
    <>
      <div className="flex flex-wrap gap-3"><Button onClick={() => showToast({ title: "Cambio guardado", description: "La configuración demo se actualizó correctamente." })}>Mostrar toast</Button><Button variant="secondary" onClick={() => setOpen(true)}>Abrir diálogo</Button><Button variant="ghost">Acción ghost</Button><Button variant="destructive">Destructivo</Button><Button loading>Cargando</Button></div>
      <Dialog open={open} onClose={() => setOpen(false)} title="Confirmar categoría" description="El peso medido requiere subir esta caja a la siguiente categoría."><p className="text-sm leading-6 text-navy-600">Nunca se aplicará un cambio de precio sin confirmación explícita.</p><div className="mt-6 flex justify-end gap-3"><Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={() => { setOpen(false); showToast({ title: "Categoría confirmada" }); }}>Confirmar</Button></div></Dialog>
    </>
  );
}

export function DesignShowcase() {
  const allStatuses = [...BOX_STATUSES, ...SHIPMENT_STATUSES, ...TRUCK_STATUSES, ...INVOICE_STATUSES];
  return (
    <ToastProvider>
      <div className="grid gap-12">
        <section className="grid gap-5"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-orange-600">Acciones</p><h2 className="mt-2 font-display text-2xl font-bold text-navy-950">Botones y feedback</h2></div><Interactions /></section>
        <section id="formularios" className="grid gap-5"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-orange-600">Captura</p><h2 className="mt-2 font-display text-2xl font-bold text-navy-950">Campos de formulario</h2></div><Card className="grid gap-5 shadow-none md:grid-cols-2"><Input label="Número de guía" placeholder="BX-260001" hint="Acepta códigos de caja, envío o camión." /><Select label="Categoría estimada" defaultValue="medium" options={[{ value: "small", label: "Small" }, { value: "medium", label: "Medium" }]} /><Textarea label="Descripción del contenido" placeholder="Describe el contenido sin incluir información sensible." /><div className="grid content-start gap-4 pt-1"><Checkbox label="La caja está firme, sellada y conserva su forma" /><Input label="Código postal" defaultValue="123" error="El código postal debe tener 5 dígitos." /></div></Card></section>
        <section id="estados" className="grid gap-5"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-orange-600">Estados</p><h2 className="mt-2 font-display text-2xl font-bold text-navy-950">Lenguaje operativo</h2></div><div className="flex flex-wrap gap-2">{Array.from(new Set(allStatuses)).map((status) => <StatusBadge key={status} status={status} />)}<Badge>Neutral</Badge></div></section>
        <section className="grid gap-5"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-orange-600">Indicadores</p><h2 className="mt-2 font-display text-2xl font-bold text-navy-950">Resumen móvil primero</h2></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="En bodega" value="08" detail="2 recibidas hoy" icon={Box} /><StatCard label="En camino" value="05" detail="Ruta USA–México" icon={Truck} /><StatCard label="Entregadas" value="24" detail="Últimos 90 días" icon={PackageCheck} /><StatCard label="Notificaciones" value="03" detail="1 sin leer" icon={Bell} /></div></section>
        <section className="grid gap-5"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-orange-600">Carga y vacío</p><h2 className="mt-2 font-display text-2xl font-bold text-navy-950">Estados del sistema</h2></div><div className="grid gap-5 lg:grid-cols-2"><Card className="grid gap-4 shadow-none"><Skeleton className="h-5 w-1/3" /><Skeleton className="h-10 w-2/3" /><Skeleton className="h-24 w-full" /></Card><EmptyState title="Todavía no hay cajas" description="Cuando registres tu primera pre-alerta, podrás seguirla desde este espacio." action={<Button variant="secondary">Crear pre-alerta</Button>} /></div></section>
      </div>
    </ToastProvider>
  );
}
