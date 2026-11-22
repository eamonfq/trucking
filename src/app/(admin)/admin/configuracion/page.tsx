import { requireAdminUser } from "@/lib/auth/actions";
import { recordRevision } from "@/lib/db/revision";
import { SectionTitle } from "@/components/cliente/section-title";
import { ConfigEditor } from "@/components/admin/config-editor";
import { configService } from "@/lib/services/config";
import { adminConfig } from "@/lib/i18n/catalogs/admin-config";
import { getT } from "@/lib/i18n/server";
export default async function ConfigurationPage() { await requireAdminUser(["configuracion"]); const [flow, rates, t] = await Promise.all([configService.getFlowConfig(), configService.getCatalog(), getT(adminConfig)]); return <><SectionTitle eyebrow={t("Reglas operativas")} title={t("Configuración")} description={t("Ajusta el flujo y el tarifario que usan recepción, facturación y el panel del cliente.")} /><div className="mt-7"><ConfigEditor initialFlow={flow} initialRates={rates} initialRevision={recordRevision({flow,rates})} /></div></>; }
