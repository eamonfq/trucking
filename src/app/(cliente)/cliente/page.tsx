import Link from "next/link";
import { Bell, Box, CircleDollarSign, MapPin, PackageCheck, Truck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/badge";
import { LockerCard } from "@/components/cliente/locker-card";
import { SectionTitle } from "@/components/cliente/section-title";
import { requireClientUser } from "@/lib/auth/actions";
import { COMPANY } from "@/lib/config/company";
import { configService } from "@/lib/services/config";
import { logisticsService } from "@/lib/services/logistics";
import { invoiceTotal } from "@/lib/utils/invoices";
import { formatDate, formatUsd } from "@/lib/utils/format";

export default async function ClientDashboard() {
  const [user, flow, rates, boxes, invoices, notifications] = await Promise.all([requireClientUser(), configService.getFlowConfig(), configService.getRateTable(), logisticsService.getBoxes(), logisticsService.getInvoices(), logisticsService.getNotifications()]);
  const mine = boxes.filter((box) => box.userId === user.id);
  const myInvoices = invoices.filter((invoice) => invoice.userId === user.id);
  const myNotifications = notifications.filter((item) => item.userId === user.id);
  const balance = myInvoices.filter((invoice) => !["pagada", "borrador"].includes(invoice.status)).reduce((total, invoice) => total + invoiceTotal(invoice), 0);
  const pendingInvoices = myInvoices.filter((invoice) => ["emitida", "vencida"].includes(invoice.status)).length;
  const count = (statuses: string[]) => String(mine.filter((box) => statuses.includes(box.status)).length).padStart(2, "0");
  return <>
    <SectionTitle eyebrow="Panel del cliente" title={`Hola, ${user.firstName}`} description="Aquí tienes un panorama claro de tus cajas, envíos y pagos." action={<Link href="/cliente/cotizador" className="inline-flex min-h-11 items-center justify-center rounded-full bg-orange-500 px-5 text-sm font-bold text-white">Cotizar una caja</Link>} />
    <div className="mt-7 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
      <LockerCard lockerCode={user.lockerCode} holderName={`${user.firstName} ${user.paternalLastName}`} warehouseAddress={COMPANY.warehouseAddress} originMode={flow.originMode} />
      <Card className="flex flex-col justify-between">
        <div>
          <p className="text-sm font-semibold text-navy-500">Saldo pendiente</p>
          <p className="mt-3 font-display text-4xl font-bold text-navy-950">{formatUsd(balance)}</p>
          <p className="mt-2 text-sm text-navy-500">{pendingInvoices ? `${pendingInvoices} ${pendingInvoices === 1 ? "factura espera" : "facturas esperan"} tu pago.` : "No tienes facturas por pagar."}</p>
        </div>
        <Link href="/cliente/facturas" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-orange-600">Ver facturas <CircleDollarSign className="size-4" /></Link>
      </Card>
    </div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="En bodega" value={count(["recibida", "categorizada", "en-bodega", "excede-categoria"])} icon={Box} />
      <StatCard label="En camino" value={count(["cargada-en-camion", "en-transito"])} icon={Truck} />
      <StatCard label="En México" value={count(["en-destino"])} icon={MapPin} />
      <StatCard label="Entregadas" value={count(["entregada"])} icon={PackageCheck} />
    </div>
    <div className="mt-7 grid gap-5 xl:grid-cols-2">
      <Card className="shadow-none">
        <div className="flex items-center justify-between"><h2 className="font-display text-xl font-bold text-navy-950">Cajas recientes</h2><Link href="/cliente/cajas" className="text-xs font-bold text-orange-600">Ver todas</Link></div>
        <div className="mt-5">{mine.length ? <div className="divide-y divide-stone-200">{mine.slice(0, 4).map((box) => <Link key={box.id} href={`/cliente/cajas/${box.code}`} className="flex items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"><div><p className="text-sm font-bold text-navy-900">{box.code}</p><p className="mt-1 text-xs text-navy-500">{rates.find((rate) => rate.id === box.categoryId)?.name ?? "Sin categoría"}</p></div><StatusBadge status={box.status} /></Link>)}</div> : <EmptyState title="Todavía no tienes cajas" description={flow.originMode === "casillero" ? "Registra una pre-alerta cuando compres en línea y aparecerá aquí." : "En cuanto recibamos tu primera caja la verás en esta lista."} />}</div>
      </Card>
      <Card className="shadow-none">
        <div className="flex items-center justify-between"><h2 className="font-display text-xl font-bold text-navy-950">Notificaciones</h2><Link href="/cliente/notificaciones" className="text-xs font-bold text-orange-600"><Bell className="inline size-4 text-orange-500" /><span className="sr-only">Ver todas las notificaciones</span></Link></div>
        <div className="mt-5">{myNotifications.length ? <div className="grid gap-3">{myNotifications.slice(0, 4).map((item) => <div key={item.id} className={`rounded-xl p-4 ${item.read ? "bg-cream-100" : "bg-orange-50"}`}><p className="text-sm font-bold text-navy-900">{item.title}</p><p className="mt-1 text-xs leading-5 text-navy-500">{item.body}</p><p className="mt-2 text-xs text-navy-400">{formatDate(item.createdAt)}</p></div>)}</div> : <EmptyState title="Sin avisos por ahora" description="Te escribiremos cuando una caja llegue a bodega o un envío avance." />}</div>
      </Card>
    </div>
  </>;
}
