"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/ui/badge";
import { loadBoxesOnTruck } from "@/lib/auth/admin-actions";
import type { Box, Truck } from "@/lib/types";

export function WarehouseBoard({ initialBoxes, trucks }: { initialBoxes: Box[]; trucks: Truck[] }) { const [selected, setSelected] = useState<string[]>([]); const [truckId, setTruckId] = useState(trucks[0]?.id ?? ""); const [message, setMessage] = useState(""); return <><div className="flex flex-col gap-3 rounded-2xl bg-navy-950 p-4 sm:flex-row sm:items-center"><select value={truckId} onChange={(event) => setTruckId(event.target.value)} className="min-h-11 flex-1 rounded-xl bg-white px-3 text-sm" aria-label="Camión destino">{trucks.map((truck) => <option key={truck.id} value={truck.id}>{truck.code} · {truck.route}</option>)}</select><Button disabled={!selected.length} onClick={async () => { const result = await loadBoxesOnTruck(selected, truckId); setMessage(`${result.count} cajas cargadas`); setSelected([]); }}>Cargar en camión</Button></div>{message && <p className="mt-3 text-sm font-bold text-success-700">{message}</p>}<div className="mt-5 grid gap-3">{initialBoxes.map((box) => <div key={box.id} className="flex items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-4"><Checkbox label={`${box.code} · ${box.categoryId}`} checked={selected.includes(box.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, box.id] : current.filter((id) => id !== box.id))} /><StatusBadge status={box.status} /></div>)}</div></>; }
