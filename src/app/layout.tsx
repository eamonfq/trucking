import { getSession } from "@/lib/auth/actions";
import { connection } from "next/server";
import { CatalogProvider } from "@/components/ui/catalog-provider";
import { configService } from "@/lib/services/config";
import type { Metadata, Viewport } from "next";
import {PwaProvider} from '@/components/pwa/pwa-provider';
import localFont from "next/font/local";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";
import { seoConfig, homeDescription } from "@/lib/seo";
import { I18nProvider } from "@/lib/i18n/provider";
import { getLocale } from "@/lib/i18n/server";
import { LANGUAGE_TAG } from "@/lib/i18n/config";
import { common } from "@/lib/i18n/catalogs/common";
import { translator } from "@/lib/i18n/translate";

const inter = localFont({
  src: [
    { path: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2", style: "normal", weight: "100 900" },
    { path: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-italic.woff2", style: "italic", weight: "100 900" },
  ],
  variable: "--font-inter",
  display: "swap",
});
const bricolage = localFont({
  src: "../../node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2",
  variable: "--font-bricolage",
  display: "swap",
  weight: "200 800",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = translator(common, await getLocale());
  return {
    appleWebApp:{capable:true,title:'A&L',statusBarStyle:'default'},
    icons:{apple:'/pwa/apple-touch-icon.png'},
    metadataBase: new URL(seoConfig.origin),
    title: { default: "A&L Trucking Logistics", template: "%s | A&L Trucking Logistics" },
    description: t(homeDescription),
    applicationName: "A&L Trucking Logistics",
    keywords: [t("envíos USA México"), t("carga terrestre"), t("cajas a México"), "A&L Trucking Logistics"],
    robots: { index: seoConfig.indexable, follow: seoConfig.indexable },
  };
}

export const viewport:Viewport={themeColor:'#101b30'};
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await connection();
  const [categories,flow,locale]=await Promise.all([configService.getCatalog(),configService.getFlowConfig(),getLocale()]);
  const operator=(await getSession())?.role==="operador";
  return (
    <html lang={LANGUAGE_TAG[locale]} data-scroll-behavior="smooth">
      <body className={`${inter.variable} ${bricolage.variable} font-sans antialiased`}><I18nProvider locale={locale}><PwaProvider><ToastProvider><CatalogProvider categories={operator ? [] : categories} destinations={flow.destinationCities}>{children}</CatalogProvider></ToastProvider></PwaProvider></I18nProvider></body>
    </html>
  );
}
