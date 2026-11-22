"use client";
import type { Invoice, Shipment } from "@/lib/types";
import { formatUsd } from "@/lib/utils/format";
import { LANGUAGE_TAG } from "@/lib/i18n/config";
import { customersPayments, paymentMethodNames } from "@/lib/i18n/catalogs/customers-payments";
import { useLocale, useMessageTranslator, useT } from "@/lib/i18n/provider";
export function PaymentHistory({invoice,shipments=[]}:{invoice:Invoice;shipments?:Pick<Shipment,"id"|"code"|"boxIds">[]}){
 const t=useT(customersPayments),tmethod=useMessageTranslator(paymentMethodNames),locale=useLocale();
 if(!invoice.payments?.length)return null;
 const states={confirmado:t("Pago confirmado"),pendiente:t("En revisión"),rechazado:t("Reporte rechazado"),acuerdo:t("Acuerdo · sin dinero recibido")};
 return <section className="mt-5 grid gap-3"><h3 className="font-display text-lg font-bold">{t("Folios y movimientos")}</h3>{invoice.payments.map(p=><article key={p.folio} className="rounded-xl border border-stone-200 bg-white p-4 text-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{p.folio}</strong><strong>{formatUsd(p.amountUsd)}</strong></div><p className="mt-2">{states[p.status]} · {tmethod(p.method)}</p>{p.externalReference&&<p className="mt-2 break-words">{t("Referencia externa: {reference}",{reference:p.externalReference})}</p>}<p className="mt-2 text-navy-500">{new Date(p.recordedAt).toLocaleString(LANGUAGE_TAG[locale])} · {p.warehouseName??t("Ubicación pendiente de validación")}</p><p className="mt-1 text-navy-500">{t("Registrado por: {name}",{name:p.actorName})}</p>{p.confirmedByName&&<p className="mt-1 text-navy-500">{t("Validado por: {name}",{name:p.confirmedByName})}</p>}<p className="mt-1 text-navy-500">{t("Guía: {codes} · Paquetes: {packages}",{codes:shipments.filter(s=>s.id===p.shipmentId||s.boxIds.some(id=>p.boxIds.includes(id))).map(s=>s.code).join(", ")||t("Pendiente de asignar"),packages:p.boxCodes?.join(", ")||p.boxIds.length})}</p><p className="mt-1 text-navy-500">{t("Factura: {number} · Paquetes vinculados: {count}",{number:invoice.number,count:p.boxIds.length})}</p></article>)}</section>;
}
