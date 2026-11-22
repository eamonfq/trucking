"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { FileDown, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { deleteBillOfLading, truckCargoForBillOfLading, updateBillOfLading } from "@/lib/auth/bill-of-lading-actions";
import { billOfLadingSchema, type BillOfLading, type BillOfLadingContent, type BillOfLadingLine, type BillOfLadingOrder } from "@/lib/schemas/bill-of-lading";
import { billOfLadingTotals, emptyBillOfLadingLine, emptyBillOfLadingOrder } from "@/lib/utils/bill-of-lading";
import { LANGUAGE_TAG } from "@/lib/i18n/config";
import { trucksBillOfLading, trucksBillOfLadingErrors } from "@/lib/i18n/catalogs/trucks-bill-of-lading";
import { useLocale, useMessageTranslator, useT } from "@/lib/i18n/provider";

const MAX_LINES = 60;
const MAX_ORDERS = 20;
const compact = "min-h-11 py-2 text-sm";
const numberValue = (value?: number) => (value === undefined ? "" : String(value));
const toNumber = (raw: string) => (raw.trim() === "" ? undefined : Number(raw));
const formatNumber = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 2 });

/** Editable fields only: the schema drops the document's metadata (code, truck, authorship). */
function content(bill: BillOfLading): BillOfLadingContent {
  const parsed = billOfLadingSchema.safeParse(bill);
  return parsed.success ? parsed.data : bill;
}

function Panel({ title, description, children, action }: { title: string; description?: string; children: ReactNode; action?: ReactNode }) {
  return <section className="grid min-w-0 gap-4 rounded-card border border-stone-200 bg-white p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-display text-lg font-bold text-navy-950">{title}</h2>{description && <p className="mt-1 max-w-3xl text-sm leading-6 text-navy-500">{description}</p>}</div>{action}</div>
    {children}
  </section>;
}

export function BillOfLadingEditor({ initial }: { initial: BillOfLading }) {
  const router = useRouter();
  const { showToast } = useToast();
  const t = useT(trucksBillOfLading);
  const tm = useMessageTranslator(trucksBillOfLadingErrors);
  const locale = useLocale();
  const [meta, setMeta] = useState(initial);
  const [bill, setBill] = useState<BillOfLadingContent>(() => content(initial));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cargo, setCargo] = useState<{ lines: BillOfLadingLine[]; pieces: number; weightLb: number } | null>(null);
  const [loadingCargo, setLoadingCargo] = useState(false);
  const totals = billOfLadingTotals(bill);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = <K extends keyof BillOfLadingContent>(key: K, value: BillOfLadingContent[K]) => { setBill((current) => ({ ...current, [key]: value })); setDirty(true); };
  const text = (key: { [K in keyof BillOfLadingContent]: BillOfLadingContent[K] extends string ? K : never }[keyof BillOfLadingContent]) => ({ value: bill[key] as string, onChange: (event: { target: { value: string } }) => set(key, event.target.value as never) });
  const setLine = (id: string, change: Partial<BillOfLadingLine>) => set("lines", bill.lines.map((line) => (line.id === id ? { ...line, ...change } : line)));
  const setOrder = (id: string, change: Partial<BillOfLadingOrder>) => set("orders", bill.orders.map((order) => (order.id === id ? { ...order, ...change } : order)));

  const save = async () => {
    setSaving(true);
    const result = await updateBillOfLading(meta.id, bill);
    setSaving(false);
    if (!result.ok) { showToast({ title: t("No se pudo guardar"), description: result.error, variant: "error" }); return false; }
    setMeta(result.bill); setBill(content(result.bill)); setDirty(false);
    showToast({ title: t("Bill of lading guardado"), description: t("{code} quedó actualizado.", { code: result.bill.code }) });
    router.refresh();
    return true;
  };
  const download = async () => {
    if (dirty && !(await save())) return;
    const link = document.createElement("a");
    link.href = `/api/bill-of-lading/${meta.id}`;
    link.click();
  };
  const remove = async () => {
    setDeleting(true);
    const result = await deleteBillOfLading(meta.id);
    setDeleting(false);
    if (!result.ok) return showToast({ title: t("No se pudo eliminar"), description: result.error, variant: "error" });
    setDirty(false); setDeleteOpen(false);
    showToast({ title: t("{code} eliminado", { code: meta.code }) });
    router.push("/admin/camiones/bill-of-lading");
  };
  const loadCargo = async () => {
    if (!meta.truckId) return;
    setLoadingCargo(true);
    const result = await truckCargoForBillOfLading(meta.truckId);
    setLoadingCargo(false);
    if (!result.ok) return showToast({ title: t("No se pudo leer la carga"), description: tm(result.error), variant: "error" });
    setCargo(result);
  };
  const applyCargo = () => {
    if (!cargo) return;
    const orders = bill.orders.length === 1 && bill.orders[0]!.orderNumber === meta.truckCode ? [{ ...bill.orders[0]!, packages: cargo.pieces, weightLb: cargo.weightLb }] : bill.orders;
    setBill((current) => ({ ...current, lines: cargo.lines.length ? cargo.lines : [emptyBillOfLadingLine(crypto.randomUUID())], orders }));
    setDirty(true); setCargo(null);
    showToast({ title: t("Carga actualizada"), description: t("Revisa las filas y guarda los cambios.") });
  };

  return <div className="grid gap-6">
    <Panel title={t("Encabezado")} description={meta.truckCode ? t("Creado desde el camión {code}. Todos los datos se pueden corregir; el PDF usa solo lo guardado aquí.", { code: meta.truckCode }) : t("Creado en blanco. El PDF usa solo lo guardado aquí.")}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label={t("Fecha (Date)")} type="date" {...text("date")} />
        <Input label="Bill of Lading Number" maxLength={60} {...text("number")} />
        <Input label="SID No." maxLength={60} {...text("sidNumber")} />
      </div>
    </Panel>

    <Panel title={t("Origen, destino y facturación")}>
      <div className="grid gap-4 lg:grid-cols-3">
        <Textarea label={t("Ship from (nombre y dirección)")} rows={4} maxLength={400} {...text("shipFrom")} />
        <Textarea label={t("Ship to (nombre y dirección)")} rows={4} maxLength={400} {...text("shipTo")} />
        <Textarea label="Third party freight charges bill to" rows={4} maxLength={400} hint={t("Se copia del último bill of lading.")} {...text("billTo")} />
      </div>
    </Panel>

    <Panel title={t("Transportista (Carrier)")}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
        <div className="sm:col-span-2 lg:col-span-1"><Input label="Carrier name" maxLength={120} {...text("carrierName")} /></div>
        <Input label="Trailer number" maxLength={60} {...text("trailerNumber")} />
        <Input label="Serial number(s)" maxLength={120} {...text("serialNumbers")} />
        <Input label="SCAC" maxLength={10} {...text("scac")} />
        <Input label="Pro number" maxLength={60} {...text("proNumber")} />
      </div>
    </Panel>

    <Panel title={t("Instrucciones especiales (Special Instructions)")} description={t("Aparecen en el recuadro «Special Instructions» del PDF. Por ejemplo: HANDLE WITH CARE, composición del envío o condiciones de los vehículos.")}>
      <Textarea label="Special Instructions" rows={5} maxLength={2000} {...text("specialInstructions")} />
    </Panel>

    <Panel title={t("Condiciones del flete")}>
      <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
        <Select label="Freight charge terms" value={bill.freightTerms} onChange={(event) => set("freightTerms", event.target.value as BillOfLadingContent["freightTerms"])} options={[{ value: "prepaid", label: "Prepaid" }, { value: "collect", label: "Collect" }, { value: "third-party", label: "3rd Party" }]} />
        <div className="pb-3"><Checkbox label="Master bill of lading with attached underlying bills of lading" checked={bill.masterBol} onChange={(event) => set("masterBol", event.target.checked)} /></div>
      </div>
    </Panel>

    <Panel title="Customer order information" description={t("Una fila por pedido. El Grand Total del PDF suma estas filas.")} action={<Button variant="ghost" onClick={() => set("orders", [...bill.orders, emptyBillOfLadingOrder(crypto.randomUUID())])} disabled={bill.orders.length >= MAX_ORDERS}><Plus className="size-4" />{t("Agregar pedido")}</Button>}>
      {bill.orders.map((order, index) => <div key={order.id} className="grid gap-3 rounded-md border border-stone-200 p-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
        <Input label={`Customer order no. ${index + 1}`} className={compact} maxLength={60} value={order.orderNumber} onChange={(event) => setOrder(order.id, { orderNumber: event.target.value })} />
        <Input label="# of packages" className={compact} type="number" min="0" step="any" inputMode="decimal" value={numberValue(order.packages)} onChange={(event) => setOrder(order.id, { packages: toNumber(event.target.value) })} />
        <Input label="Weight (lb)" className={compact} type="number" min="0" step="any" inputMode="decimal" value={numberValue(order.weightLb)} onChange={(event) => setOrder(order.id, { weightLb: toNumber(event.target.value) })} />
        <Select label="Pallet/Slip" className={compact} value={order.palletSlip} onChange={(event) => setOrder(order.id, { palletSlip: event.target.value as BillOfLadingOrder["palletSlip"] })} options={[{ value: "", label: t("Sin marcar") }, { value: "Y", label: "Y" }, { value: "N", label: "N" }]} />
        <Button variant="ghost" aria-label={t("Quitar pedido {number}", { number: index + 1 })} className="min-h-11" onClick={() => set("orders", bill.orders.filter((item) => item.id !== order.id))}><Trash2 className="size-4" /></Button>
        <div className="sm:col-span-5"><Textarea label="Additional shipper information" className="min-h-20 text-sm" rows={2} maxLength={300} value={order.info} onChange={(event) => setOrder(order.id, { info: event.target.value })} /></div>
      </div>)}
      <p className="text-sm font-semibold text-navy-900">Grand Total: {formatNumber(totals.orderPackages)} packages · {formatNumber(totals.orderWeightLb)} lb</p>
    </Panel>

    <Panel title={t("Carrier information (carga)")} description={t("Las cajas comunes van juntas en una sola fila con su cantidad; cada vehículo (nota con VIN) va en su propia fila. Puedes cambiar tipos y descripciones, y agregar o quitar filas.")}
      action={<div className="flex flex-wrap gap-2">{meta.truckId && <Button variant="ghost" onClick={loadCargo} loading={loadingCargo}><RefreshCw className="size-4" />{t("Recalcular desde {code}", { code: meta.truckCode ?? "" })}</Button>}<Button variant="ghost" onClick={() => set("lines", [...bill.lines, emptyBillOfLadingLine(crypto.randomUUID())])} disabled={bill.lines.length >= MAX_LINES}><Plus className="size-4" />{t("Agregar fila")}</Button></div>}>
      {bill.lines.map((line, index) => <div key={line.id} className="grid gap-3 rounded-md border border-stone-200 p-3 sm:grid-cols-4 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto_auto] lg:items-end">
        <Input label="Package qty" className={compact} type="number" min="0" step="any" inputMode="decimal" value={numberValue(line.packageQty)} onChange={(event) => setLine(line.id, { packageQty: toNumber(event.target.value) })} />
        <Input label="Package type" className={compact} maxLength={30} placeholder="BOXES, ATV…" value={line.packageType} onChange={(event) => setLine(line.id, { packageType: event.target.value })} />
        <Input label="Weight (lb)" className={compact} type="number" min="0" step="any" inputMode="decimal" value={numberValue(line.weightLb)} onChange={(event) => setLine(line.id, { weightLb: toNumber(event.target.value) })} />
        <Input label="Handling unit qty" className={compact} type="number" min="0" step="any" inputMode="decimal" value={numberValue(line.handlingQty)} onChange={(event) => setLine(line.id, { handlingQty: toNumber(event.target.value) })} />
        <Input label="Handling unit type" className={compact} maxLength={30} placeholder="PALLET…" value={line.handlingType} onChange={(event) => setLine(line.id, { handlingType: event.target.value })} />
        <div className="pb-3"><Checkbox label="HM (X)" checked={line.hazmat} onChange={(event) => setLine(line.id, { hazmat: event.target.checked })} /></div>
        <Button variant="ghost" aria-label={t("Quitar fila {number}", { number: index + 1 })} className="min-h-11" onClick={() => set("lines", bill.lines.filter((item) => item.id !== line.id))}><Trash2 className="size-4" /></Button>
        <div className="grid gap-3 sm:col-span-4 sm:grid-cols-[minmax(0,3fr)_minmax(0,1fr)_minmax(0,1fr)] lg:col-span-7">
          <Input label="Commodity description" className={compact} maxLength={500} value={line.description} onChange={(event) => setLine(line.id, { description: event.target.value })} />
          <Input label="NMFC No." className={compact} maxLength={30} value={line.nmfc} onChange={(event) => setLine(line.id, { nmfc: event.target.value })} />
          <Input label="Class" className={compact} maxLength={20} value={line.freightClass} onChange={(event) => setLine(line.id, { freightClass: event.target.value })} />
        </div>
      </div>)}
      <p className="text-sm font-semibold text-navy-900">Grand Total: {formatNumber(totals.packageQty)} packages · {formatNumber(totals.weightLb)} lb</p>
    </Panel>

    <Panel title={t("Valor declarado y COD")}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
        <Input label="Declared value not exceeding" maxLength={40} placeholder="N/A" {...text("declaredValue")} />
        <Input label="Per" maxLength={40} placeholder="N/A" {...text("declaredValuePer")} />
        <Input label="COD amount" maxLength={40} {...text("codAmount")} />
        <Select label="Fee terms" value={bill.codFeeTerms} onChange={(event) => set("codFeeTerms", event.target.value as BillOfLadingContent["codFeeTerms"])} options={[{ value: "", label: t("Sin marcar") }, { value: "collect", label: "Collect" }, { value: "prepaid", label: "Prepaid" }]} />
        <div className="lg:col-span-4"><Checkbox label="Customer check acceptable" checked={bill.customerCheckAcceptable} onChange={(event) => set("customerCheckAcceptable", event.target.checked)} /></div>
      </div>
    </Panel>

    <Panel title={t("Firmas")} description={t("Los nombres se imprimen tal como se escriben; el PDF no lleva firmas manuscritas.")}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input label={t("Shipper signature (nombre)")} maxLength={120} {...text("shipperSignature")} />
        <Input label="Shipper date" type="date" {...text("shipperSignatureDate")} />
        <Input label={t("Carrier signature (nombre)")} maxLength={120} {...text("carrierSignature")} />
        <Input label="Pickup date" type="date" {...text("carrierSignatureDate")} />
        <Select label="Trailer loaded" value={bill.trailerLoaded} onChange={(event) => set("trailerLoaded", event.target.value as BillOfLadingContent["trailerLoaded"])} options={[{ value: "", label: t("Sin marcar") }, { value: "shipper", label: "By shipper" }, { value: "driver", label: "By driver" }]} />
        <Select label="Freight counted" value={bill.freightCounted} onChange={(event) => set("freightCounted", event.target.value as BillOfLadingContent["freightCounted"])} options={[{ value: "", label: t("Sin marcar") }, { value: "shipper", label: "By shipper" }, { value: "driver-pallets", label: "By driver/pallets said to contain" }, { value: "driver-pieces", label: "By driver/pieces" }]} />
      </div>
    </Panel>

    <div className="sticky bottom-3 z-30 rounded-card border border-stone-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur sm:px-4 sm:py-3">
      <div className="flex items-center justify-between gap-2">
        <p className={dirty ? "text-xs font-semibold text-orange-700 sm:text-sm" : "hidden text-sm text-navy-500 sm:block"}>{dirty ? t("Cambios sin guardar.") : t("Guardado · {date} · {name}", { date: new Date(meta.updatedAt).toLocaleString(LANGUAGE_TAG[locale], { dateStyle: "short", timeStyle: "short" }), name: meta.updatedByName })}</p>
        <div className="ml-auto flex gap-2">
          <Button variant="destructive" aria-label={t("Eliminar")} className="px-3 sm:px-5.5" onClick={() => setDeleteOpen(true)}><Trash2 className="size-4" /><span className="hidden sm:inline">{t("Eliminar")}</span></Button>
          <Button variant="secondary" aria-label={dirty ? t("Guardar y descargar PDF") : t("Descargar PDF")} className="px-3 sm:px-5.5" onClick={download} loading={saving && dirty}><FileDown className="size-4" /><span className="hidden sm:inline">{dirty ? t("Guardar y descargar PDF") : t("Descargar PDF")}</span><span className="sm:hidden">PDF</span></Button>
          <Button className="px-3 sm:px-5.5" onClick={save} loading={saving} disabled={!dirty}><Save className="size-4" />{t("Guardar")}</Button>
        </div>
      </div>
    </div>

    <Dialog open={cargo !== null} onClose={() => setCargo(null)} title={t("Recalcular la carga")} description={cargo ? t("{code} tiene ahora {pieces} piezas y {weight} lb.", { code: meta.truckCode ?? "", pieces: formatNumber(cargo.pieces), weight: formatNumber(cargo.weightLb) }) : undefined}>
      <p className="text-sm leading-6 text-navy-600">{t("Se reemplazarán las filas de «Carrier information» por la carga actual del camión: las cajas juntas y cada vehículo en su fila. Se pierden los cambios hechos a mano en esas filas. Las demás secciones no cambian.")}</p>
      <div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={() => setCargo(null)}>{t("Cancelar")}</Button><Button onClick={applyCargo}>{t("Reemplazar filas")}</Button></div>
    </Dialog>
    <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} title={t("Eliminar {code}", { code: meta.code })} description={t("El documento se borra del sistema. Las copias PDF ya descargadas no cambian.")}>
      <div className="mt-2 flex justify-end gap-2"><Button variant="ghost" onClick={() => setDeleteOpen(false)}>{t("Cancelar")}</Button><Button variant="destructive" loading={deleting} onClick={remove}>{t("Eliminar")}</Button></div>
    </Dialog>
  </div>;
}
