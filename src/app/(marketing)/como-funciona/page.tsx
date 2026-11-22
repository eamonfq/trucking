import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { FlowExplorer } from "@/components/marketing/flow-explorer";
import { configService } from "@/lib/services/config";
import { publicPages } from "@/lib/i18n/catalogs/public-pages";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata():Promise<Metadata>{const t=await getT(publicPages);return {alternates:{canonical:"/como-funciona"},title:t("Cómo funciona el sistema"),description:t("Explora paso a paso el flujo de A&L: cliente, recepción, carga, entrega, facturación y soporte.")};}
export default async function HowItWorksPage() {
  const [flow,t]=await Promise.all([configService.getFlowConfig(),getT(publicPages)]);
  return <><MarketingHeader /><main className="bg-cream-100"><section className="mx-auto max-w-[90rem] px-5 py-14 sm:px-8 sm:py-20 lg:px-18"><p className="text-over font-semibold uppercase text-brand-700">{t("El sistema, de principio a fin")}</p><h1 className="mt-5 max-w-4xl font-display text-5xl font-extrabold leading-[.98] tracking-[-.04em] text-navy-900 sm:text-7xl">{t("Cada caja tiene")}<br />{t("un siguiente paso.")}</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-ink-700">{t("Descubre qué hace el cliente, qué gestiona nuestro equipo y qué valida el sistema. Recorre las etapas sin crear una cuenta ni modificar datos reales.")}</p><div className="mt-10"><FlowExplorer initialFlow={flow} /></div><section className="mt-12 grid gap-6 border-t border-line-300 pt-8 md:grid-cols-2"><div><h2 className="font-display text-2xl font-bold text-navy-900">{t("Tres flujos conectados, no confundidos.")}</h2><p className="mt-3 text-sm leading-7 text-ink-700">{t("Confirmar un envío no despacha el camión. Reportar un pago no lo aprueba. Llegar a destino no confirma una entrega. Cada acción tiene su responsable y queda registrada.")}</p></div><div><h2 className="font-display text-2xl font-bold text-navy-900">{t("De la explicación a tu cuenta.")}</h2><p className="mt-3 text-sm leading-7 text-ink-700">{t("Tu panel muestra únicamente tus cajas, envíos, facturas y conversaciones. El rastreo público muestra hitos operativos sin exponer datos privados.")}</p><Link href="/registro" className="mt-4 inline-flex min-h-12 items-center font-semibold text-brand-700">{t("Crear mi cuenta →")}</Link></div></section></section></main><MarketingFooter /></>;
}
