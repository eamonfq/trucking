"use client";

import Link,{useAdminPermission} from "@/components/admin/admin-access";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { CUSTOM_CAPACITY_CATEGORY } from "@/lib/config/custom-cargo";
import { useCatalog } from "@/components/ui/catalog-provider";
import { getStatusLabel } from "@/lib/config/status";
import { BOX_STATUSES, type Box, type Truck, type User } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";

export function WarehouseBoard({ initialBoxes, initialTrucks, users }: { initialBoxes: Box[]; initialTrucks: Truck[]; users: User[] }) {
  const canLoad=useAdminPermission("camiones");
  const catalog=useCatalog();
  const categories=[...catalog,CUSTOM_CAPACITY_CATEGORY];
  const boxes = initialBoxes;
  const trucks = initialTrucks;
  const [selected, setSelected] = useState<string[]>([]);
  const [truckId, setTruckId] = useState(initialTrucks[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const filtered = useMemo(() => boxes.filter((box) => {
    const customer = users.find((user) => user.id === box.userId);
    const term = search.trim().toLowerCase();
    return (!term || `${box.code} ${customer?.lockerCode ?? ""} ${customer?.firstName ?? ""} ${customer?.paternalLastName ?? ""}`.toLowerCase().includes(term)) && (status === "all" || box.status === status) && (category === "all" || box.categoryId === category);
  }), [boxes, category, search, status, users]);
  const selectable = filtered.filter((box) => box.status === "en-bodega").map((box) => box.id);


  return <div className="grid gap-5">
    <div className="grid gap-3 rounded-card border border-stone-200 bg-white p-4 lg:grid-cols-[1fr_.6fr_.6fr]">
      <label className="flex min-h-12 items-center gap-3 rounded-xl bg-cream-100 px-4"><Search className="size-4 text-navy-400" /><span className="sr-only">Buscar inventario</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Caja, casillero o cliente" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
      <Select label="Estado" hideLabel value={status} onChange={(event) => setStatus(event.target.value)} options={[{ value: "all", label: "Todos los estados" }, ...BOX_STATUSES.filter((item) => ["recibida", "categorizada", "en-bodega", "excede-categoria"].includes(item)).map((item) => ({ value: item, label: getStatusLabel(item) }))]} />
      <Select label="Categoría" hideLabel value={category} onChange={(event) => setCategory(event.target.value)} options={[{ value: "all", label: "Todas las categorías" }, ...categories.map((item) => ({ value: item.id, label: item.name }))]} />
    </div>
    {canLoad&&<div className="grid gap-3 rounded-card bg-navy-950 p-4 text-white sm:grid-cols-[auto_1fr_auto] sm:items-center"><p className="text-sm font-bold">{selected.length} seleccionadas</p><select value={truckId} onChange={(event) => setTruckId(event.target.value)} className="min-h-11 rounded-xl bg-white px-3 text-sm text-navy-950" aria-label="Camión destino"><option value="">Selecciona un camión</option>{trucks.map((truck) => <option key={truck.id} value={truck.id}>{truck.code} · {truck.destinationCity} · {truck.boxIds.length} asignadas</option>)}</select>{truckId && <Link className="rounded-full bg-orange-500 px-4 py-3 text-center text-sm font-bold" href={`/admin/camiones/${truckId}`}>Ir al escaneo de carga</Link>}</div>}
    {filtered.length ? <div className="overflow-x-auto rounded-card border border-stone-200 bg-white"><table className="w-full min-w-[780px] text-left text-sm"><thead className="bg-cream-100 text-xs uppercase tracking-wider text-navy-500"><tr><th className="p-4"><Checkbox aria-label="Seleccionar todas las cajas disponibles" disabled={!canLoad} label="" checked={selectable.length > 0 && selectable.every((id) => selected.includes(id))} onChange={(event) => setSelected(event.target.checked ? selectable : [])} /></th><th className="p-4">Caja</th><th className="p-4">Cliente</th><th className="p-4">Categoría</th><th className="p-4">Peso</th><th className="p-4">Estado</th></tr></thead><tbody className="divide-y divide-stone-200">{filtered.map((box) => { const customer = users.find((user) => user.id === box.userId); return <tr key={box.id} className="hover:bg-cream-50"><td className="p-4"><Checkbox aria-label={`Seleccionar ${box.code}`} label="" disabled={!canLoad||box.status !== "en-bodega"} checked={selected.includes(box.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, box.id] : current.filter((id) => id !== box.id))} /></td><td className="p-4"><Link href={`/admin/cajas/${box.id}`} className="font-bold text-orange-600 hover:text-orange-700">{box.code}</Link></td><td className="p-4"><p className="font-bold text-navy-950">{customer?.firstName} {customer?.paternalLastName}</p><p className="mt-1 text-xs text-navy-400">{customer?.lockerCode}</p></td><td className="p-4">{box.categoryName ?? categories.find((item) => item.id === box.categoryId)?.name}</td><td className="p-4">{box.weightLb} lb</td><td className="p-4"><StatusBadge status={box.status} /></td></tr>; })}</tbody></table></div> : <EmptyState title="No hay cajas con estos filtros" description="Ajusta la búsqueda o registra una nueva recepción." action={<Link href="/admin/recepcion" className="inline-flex min-h-11 items-center rounded-full bg-orange-500 px-5 text-sm font-bold text-white">Ir a recepción</Link>} />}
  </div>;
}
