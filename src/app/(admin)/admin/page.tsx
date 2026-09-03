import { Boxes, CircleDollarSign, PackageCheck, Truck } from "lucide-react";
import { SectionTitle } from "@/components/cliente/section-title";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { logisticsService } from "@/lib/services/logistics";
import { formatUsd } from "@/lib/utils/format";
import { invoiceTotal } from "@/lib/utils/invoices";

export default async function AdminDashboard() { const [boxes, trucks, invoices] = await Promise.all([logisticsService.getBoxes(), logisticsService.getTrucks(), logisticsService.getInvoices()]); return <><SectionTitle eyebrow="Operación" title="Centro de control" description="Una vista del ciclo completo desde recepción hasta entrega y pago." /><div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Cajas en bodega" value={String(boxes.filter((box) => box.status === "en-bodega").length).padStart(2, "0")} icon={Boxes} /><StatCard label="Camiones activos" value={String(trucks.filter((truck) => truck.status !== "cerrado").length).padStart(2, "0")} icon={Truck} /><StatCard label="Entregadas" value={String(boxes.filter((box) => box.status === "entregada").length).padStart(2, "0")} icon={PackageCheck} /><StatCard label="Por cobrar" value={formatUsd(invoices.filter((invoice) => invoice.status !== "pagada").reduce((sum, invoice) => sum + invoiceTotal(invoice), 0))} icon={CircleDollarSign} /></div><Card className="mt-6 shadow-none"><h2 className="font-display text-xl font-bold">Camiones recientes</h2><div className="mt-5 grid gap-3">{trucks.map((truck) => <div key={truck.id} className="flex items-center justify-between rounded-xl bg-cream-100 p-4"><div><p className="font-bold">{truck.code}</p><p className="mt-1 text-xs text-navy-500">{truck.route}</p></div><StatusBadge status={truck.status} /></div>)}</div></Card></>; }
