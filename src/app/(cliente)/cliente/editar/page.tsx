import { configService } from "@/lib/services/config";
import { requireClientUser } from "@/lib/auth/actions";
import { logisticsService as service } from "@/lib/services/logistics";
import { editableRecords } from "@/lib/services/editable-records";
import { OperationEditor } from "@/components/admin/operation-editor";
import { SectionTitle } from "@/components/cliente/section-title";
import { clientPages } from "@/lib/i18n/catalogs/client-pages";
import { getT } from "@/lib/i18n/server";
export default async function ClientEditingPage(){
  await requireClientUser();
  const t=await getT(clientPages);
  const categories=await configService.getCatalog();
  const [boxes,shipments,invoices,recipients]=await Promise.all([service.getBoxes(),service.getShipments(),service.getInvoices(),service.getRecipients()]);
  return <><SectionTitle eyebrow={t("Mis operaciones")} title={t("Revisa. Corrige. Continúa.")} description={t("Edita tus prealertas antes de la recepción y el destinatario de tu envío antes de asignarlo a un camión. También puedes corregir método y referencia de un pago mientras está en revisión. Si ya avanzó, agrega una aclaración y contacta a soporte.")}/><OperationEditor records={editableRecords({categories,boxes,shipments,invoices,recipients,trucks:[],drivers:[],support:[]},true)}/></>;
}
