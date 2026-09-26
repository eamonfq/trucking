import { configService } from "@/lib/services/config";
import Link from "@/components/admin/admin-access";
import { requireAdminUser } from "@/lib/auth/actions";
import { logisticsService as service } from "@/lib/services/logistics";
import { editableRecords } from "@/lib/services/editable-records";
import { OperationEditor } from "@/components/admin/operation-editor";
import { SectionTitle } from "@/components/cliente/section-title";
import { collection, withStore } from "@/lib/db/store";

export default async function EditingPage(){
  await requireAdminUser();
  const categories=await configService.getCatalog();
  const [boxes,shipments,invoices,trucks,drivers,support,recipients,people]=await Promise.all([service.getBoxes(),service.getShipments(),service.getInvoices(),service.getTrucks(),service.getDrivers(),service.getSupportTickets(),service.getRecipients(),service.getUsers()]);
  const history=await withStore(async()=>JSON.parse(JSON.stringify(collection<{id:string;kind:string;entityId:string;reason:string;actorId:string;at:string}>("operationalEdits").slice(0,30).map(({id,kind,entityId,reason,actorId,at})=>({id,kind,entityId,reason,actorId,at}))))) as {id:string;kind:string;entityId:string;reason:string;actorId:string;at:string}[];
  const records=editableRecords({categories,boxes,shipments,invoices,trucks,drivers,support,recipients});
  return <><SectionTitle eyebrow="Control operativo" title="Cambios claros. Historial intacto." description="Corrige cajas, envíos, facturas, camiones, choferes y asuntos de soporte. Cada cambio queda registrado y se notifica al cliente cuando corresponde."/><div className="mt-5 flex flex-wrap gap-3">{[["/admin/clientes","Editar clientes y direcciones"],["/admin/configuracion","Editar reglas y tarifas"],["/admin/camiones","Capacidad y programación"]].map(([href,label])=><Link key={href} href={href} className="inline-flex min-h-11 items-center rounded-md border border-line-300 px-4 text-sm font-semibold">{label}</Link>)}</div><OperationEditor records={records}/><section className="mt-7 rounded-xl border border-line-300 bg-white p-6"><h2 className="font-display text-xl font-bold">Últimas correcciones</h2><div className="mt-4 divide-y divide-line-200">{history.map(item=><div key={item.id} className="py-4"><p className="text-xs text-ink-500">{new Date(item.at).toLocaleString("es-MX")} · {people.find(person=>person.id===item.actorId)?.firstName ?? "Usuario registrado"} · {records.find(record=>record.id===item.entityId)?.label ?? item.kind}</p><p className="mt-2 text-sm">{item.reason}</p></div>)}{!history.length&&<p className="text-sm text-ink-500">Sin correcciones todavía.</p>}</div></section></>;
}
