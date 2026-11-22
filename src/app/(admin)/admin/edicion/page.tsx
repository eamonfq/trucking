import { configService } from "@/lib/services/config";
import Link from "@/components/admin/admin-access";
import { requireAdminUser } from "@/lib/auth/actions";
import { logisticsService as service } from "@/lib/services/logistics";
import { editableRecords } from "@/lib/services/editable-records";
import { OperationEditor } from "@/components/admin/operation-editor";
import { SectionTitle } from "@/components/cliente/section-title";
import { collection, withStore } from "@/lib/db/store";
import { LANGUAGE_TAG } from "@/lib/i18n/config";
import { adminEditMessages, adminEditing } from "@/lib/i18n/catalogs/admin-editing";
import { getLocale, getMessageTranslator, getT } from "@/lib/i18n/server";

export default async function EditingPage(){
  await requireAdminUser();
  const [t, tm, locale] = await Promise.all([getT(adminEditing), getMessageTranslator(adminEditMessages), getLocale()]);
  const categories=await configService.getCatalog();
  const [boxes,shipments,invoices,trucks,drivers,support,recipients,people]=await Promise.all([service.getBoxes(),service.getShipments(),service.getInvoices(),service.getTrucks(),service.getDrivers(),service.getSupportTickets(),service.getRecipients(),service.getUsers()]);
  const history=await withStore(async()=>JSON.parse(JSON.stringify(collection<{id:string;kind:string;entityId:string;reason:string;actorId:string;at:string}>("operationalEdits").slice(0,30).map(({id,kind,entityId,reason,actorId,at})=>({id,kind,entityId,reason,actorId,at}))))) as {id:string;kind:string;entityId:string;reason:string;actorId:string;at:string}[];
  const records=editableRecords({categories,boxes,shipments,invoices,trucks,drivers,support,recipients});
  const recordLabel=(record?:(typeof records)[number])=>record&&(record.kind==="payment"?tm(record.label):record.label);
  return <><SectionTitle eyebrow={t("Control operativo")} title={t("Cambios claros. Historial intacto.")} description={t("Corrige cajas, envíos, facturas, camiones, choferes y asuntos de soporte. Cada cambio queda registrado y se notifica al cliente cuando corresponde.")}/><div className="mt-5 flex flex-wrap gap-3">{([["/admin/clientes","Editar clientes y direcciones"],["/admin/configuracion","Editar reglas y tarifas"],["/admin/camiones","Capacidad y programación"]] as const).map(([href,label])=><Link key={href} href={href} className="inline-flex min-h-11 items-center rounded-md border border-line-300 px-4 text-sm font-semibold">{t(label)}</Link>)}</div><OperationEditor records={records}/><section className="mt-7 rounded-xl border border-line-300 bg-white p-6"><h2 className="font-display text-xl font-bold">{t("Últimas correcciones")}</h2><div className="mt-4 divide-y divide-line-200">{history.map(item=><div key={item.id} className="py-4"><p className="text-xs text-ink-500">{new Date(item.at).toLocaleString(LANGUAGE_TAG[locale])} · {people.find(person=>person.id===item.actorId)?.firstName ?? t("Usuario registrado")} · {recordLabel(records.find(record=>record.id===item.entityId)) ?? item.kind}</p><p className="mt-2 text-sm">{item.reason}</p></div>)}{!history.length&&<p className="text-sm text-ink-500">{t("Sin correcciones todavía.")}</p>}</div></section></>;
}
