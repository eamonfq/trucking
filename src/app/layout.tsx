import { getSession } from "@/lib/auth/actions";
import { connection } from "next/server";
import { CatalogProvider } from "@/components/ui/catalog-provider";
import { configService } from "@/lib/services/config";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";
import { seoConfig, homeDescription } from "@/lib/seo";

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

export const metadata: Metadata = {
  metadataBase: new URL(seoConfig.origin),
  title: { default: "A&L Trucking Logistics", template: "%s | A&L Trucking Logistics" },
  description: homeDescription,
  applicationName: "A&L Trucking Logistics",
  keywords: ["envíos USA México", "carga terrestre", "cajas a México", "A&L Trucking Logistics"],
  robots: { index: seoConfig.indexable, follow: seoConfig.indexable },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await connection();
  const [categories,flow]=await Promise.all([configService.getCatalog(),configService.getFlowConfig()]);
  const operator=(await getSession())?.role==="operador";
  return (
    <html lang="es-MX" data-scroll-behavior="smooth">
      <body className={`${inter.variable} ${bricolage.variable} font-sans antialiased`}><ToastProvider><CatalogProvider categories={operator ? [] : categories} destinations={flow.destinationCities}>{children}</CatalogProvider></ToastProvider></body>
    </html>
  );
}
