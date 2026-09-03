import { SectionTitle } from "@/components/cliente/section-title";
import { ConfigEditor } from "@/components/admin/config-editor";
import { configService } from "@/lib/services/config";
export default async function ConfigurationPage() { const [flow, rates] = await Promise.all([configService.getFlowConfig(), configService.getRateTable()]); return <><SectionTitle eyebrow="Variantes del demo" title="Configuración" description="Cambia en vivo los cinco puntos pendientes de confirmar y el tarifario." /><div className="mt-7"><ConfigEditor initialFlow={flow} initialRates={rates} /></div></>; }
