import { SectionTitle } from "@/components/cliente/section-title";
import { ConfigEditor } from "@/components/admin/config-editor";
import { configService } from "@/lib/services/config";
export default async function ConfigurationPage() { const [flow, rates] = await Promise.all([configService.getFlowConfig(), configService.getRateTable()]); return <><SectionTitle eyebrow="Reglas operativas" title="Configuración" description="Ajusta el flujo y el tarifario que usan recepción, facturación y el panel del cliente." /><div className="mt-7"><ConfigEditor initialFlow={flow} initialRates={rates} /></div></>; }
