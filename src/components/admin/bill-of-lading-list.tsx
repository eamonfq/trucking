"use client";

import Link from "@/components/admin/admin-access";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileDown, FilePlus2, Truck as TruckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { createBillOfLading } from "@/lib/auth/bill-of-lading-actions";
import type { BillOfLading } from "@/lib/schemas/bill-of-lading";
import { billOfLadingTotals, usDate } from "@/lib/utils/bill-of-lading";

export type TruckOption = { id: string; code: string; route: string; departureDate: string; pieces: number };
const firstLine = (value: string) => value.split("\n")[0]?.trim() || "—";
const number = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 2 });

export function BillOfLadingList({ bills, trucks }: { bills: BillOfLading[]; trucks: TruckOption[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [truckId, setTruckId] = useState(trucks[0]?.id ?? "");
  const [busy, setBusy] = useState<"truck" | "blank" | null>(null);

  const create = async (mode: "truck" | "blank") => {
    setBusy(mode);
    const result = await createBillOfLading(mode === "truck" ? { truckId } : {});
    if (!result.ok) { setBusy(null); return showToast({ title: "No se pudo crear", description: result.error, variant: "error" }); }
    showToast({ title: `${result.code} creado`, description: mode === "truck" ? "Revisa los datos prellenados y guarda los cambios." : "Completa los datos y guarda los cambios." });
    router.push(`/admin/camiones/bill-of-lading/${result.id}`);
  };

  return <div className="grid gap-6">
    <section className="grid gap-4 rounded-card border border-stone-200 bg-white p-5 lg:grid-cols-[1fr_auto] lg:items-end">
      <div className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <Select label="Crear desde un camión (prellena origen, destino y carga por cantidad)" value={truckId} onChange={(event) => setTruckId(event.target.value)} options={trucks.length ? trucks.map((truck) => ({ value: truck.id, label: `${truck.code} · ${truck.route} · ${truck.departureDate} · ${truck.pieces} piezas` })) : [{ value: "", label: "No hay camiones registrados" }]} disabled={!trucks.length} />
        <Button onClick={() => create("truck")} loading={busy === "truck"} disabled={!truckId || busy !== null}><TruckIcon className="size-4" />Crear desde camión</Button>
      </div>
      <Button variant="secondary" onClick={() => create("blank")} loading={busy === "blank"} disabled={busy !== null}><FilePlus2 className="size-4" />Nuevo en blanco</Button>
    </section>

    {bills.length ? <div className="overflow-x-auto rounded-card border border-stone-200 bg-white"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-cream-100 text-xs uppercase tracking-wider text-navy-500"><tr><th className="p-4">Documento</th><th className="p-4">Fecha</th><th className="p-4">Ship from → Ship to</th><th className="p-4">Camión</th><th className="p-4">Carga</th><th className="p-4">Actualizado</th><th className="p-4 text-right">Acciones</th></tr></thead><tbody className="divide-y divide-stone-200">{bills.map((bill) => { const totals = billOfLadingTotals(bill); return <tr key={bill.id}>
      <td className="p-4"><Link href={`/admin/camiones/bill-of-lading/${bill.id}`} className="font-bold text-navy-900 hover:text-orange-600">{bill.code}</Link>{bill.number && bill.number !== bill.code && <span className="block text-xs text-navy-500">N.º {bill.number}</span>}</td>
      <td className="p-4">{usDate(bill.date) || "—"}</td>
      <td className="p-4">{firstLine(bill.shipFrom)} → {firstLine(bill.shipTo)}</td>
      <td className="p-4">{bill.truckCode ?? "—"}</td>
      <td className="p-4">{number(totals.packageQty)} piezas · {number(totals.weightLb)} lb</td>
      <td className="p-4 text-navy-500">{new Date(bill.updatedAt).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}<span className="block text-xs">{bill.updatedByName}</span></td>
      <td className="p-4 text-right"><div className="flex justify-end gap-2"><Link href={`/admin/camiones/bill-of-lading/${bill.id}`} className="inline-flex min-h-10 items-center rounded-full px-3 font-bold text-navy-900 hover:bg-cream-100">Editar</Link><a href={`/api/bill-of-lading/${bill.id}`} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-stone-200 px-3 font-bold"><FileDown className="size-4" />PDF</a></div></td>
    </tr>; })}</tbody></table></div> : <EmptyState title="Todavía no hay bills of lading" description="Crea uno desde un camión para prellenar la carga por cantidad, o en blanco para llenarlo a mano." />}
  </div>;
}
