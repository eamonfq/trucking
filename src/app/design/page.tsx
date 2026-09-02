import { Boxes, FileText, LayoutDashboard, PackageSearch, Settings } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DesignShowcase } from "@/components/ui/design-showcase";
import { PageHeader } from "@/components/ui/page-header";
import { Sidebar } from "@/components/ui/sidebar";
import { StatusBadge } from "@/components/ui/badge";
import { Timeline } from "@/components/ui/timeline";
import { Card } from "@/components/ui/card";
import { logisticsService } from "@/lib/services/logistics";
import type { Box } from "@/lib/types";

export const metadata = { title: "Sistema de diseño" };

export default async function DesignPage() {
  const boxes = (await logisticsService.getBoxes()).slice(0, 5);
  const columns: Column<Box>[] = [
    { key: "code", header: "Caja", render: (box) => <strong className="font-semibold text-navy-950">{box.code}</strong> },
    { key: "category", header: "Categoría", render: (box) => box.categoryId },
    { key: "weight", header: "Peso registrado", render: (box) => `${box.weightLb} lb` },
    { key: "status", header: "Estado", render: (box) => <StatusBadge status={box.status} /> },
  ];
  return (
    <main className="min-h-screen bg-cream-50 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto grid max-w-[1500px] gap-6 lg:grid-cols-[18rem_1fr]">
        <div className="hidden lg:block"><div className="sticky top-6 h-[calc(100vh-3rem)]"><Sidebar items={[{ label: "Inicio", href: "/design", icon: LayoutDashboard, active: true }, { label: "Mis cajas", href: "#tabla", icon: Boxes }, { label: "Rastrear", href: "#timeline", icon: PackageSearch }, { label: "Facturas", href: "#estados", icon: FileText }, { label: "Configuración", href: "#formularios", icon: Settings }]} footer={<p className="text-xs leading-5 text-white/55">Catálogo interno · Fase 0</p>} /></div></div>
        <div className="min-w-0 rounded-[2rem] bg-white/65 p-5 shadow-[inset_0_0_0_1px_rgba(227,222,213,.75)] sm:p-8 lg:p-10">
          <PageHeader eyebrow="Fundación visual" title="Un sistema claro para mover cada caja" description="Componentes, estados y patrones compartidos por la experiencia de cliente y la operación." />
          <div className="mt-10"><DesignShowcase /></div>
          <section id="tabla" className="mt-12 grid gap-5"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-orange-600">Datos</p><h2 className="mt-2 font-display text-2xl font-bold text-navy-950">Tabla operativa</h2></div><DataTable columns={columns} rows={boxes} getRowKey={(box) => box.id} /></section>
          <section id="timeline" className="mt-12 grid gap-5"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-orange-600">Seguimiento</p><h2 className="mt-2 font-display text-2xl font-bold text-navy-950">Línea de tiempo</h2></div><Card className="max-w-2xl shadow-none"><Timeline events={[{ status: "Pre-alertada", occurredAt: "2026-08-27", location: "Miami, FL", description: "Registro recibido." }, { status: "Recibida", occurredAt: "2026-08-29", location: "Bodega Miami", description: "Caja inspeccionada." }, { status: "En bodega", occurredAt: "2026-09-01", location: "Bodega Miami", description: "Lista para crear un envío." }]} /></Card></section>
        </div>
      </div>
    </main>
  );
}
