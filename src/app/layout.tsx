import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const inter = localFont({
  src: [
    { path: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2", style: "normal", weight: "100 900" },
    { path: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-italic.woff2", style: "italic", weight: "100 900" },
  ],
  variable: "--font-inter",
  display: "swap",
});
const sora = localFont({
  src: "../../node_modules/@fontsource-variable/sora/files/sora-latin-wght-normal.woff2",
  variable: "--font-sora",
  display: "swap",
  weight: "100 800",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "A&L Trucking Logistics", template: "%s | A&L Trucking Logistics" },
  description: "Demo operativo de envíos terrestres USA a México con precio fijo por categoría de caja.",
  applicationName: "A&L Trucking Logistics",
  keywords: ["envíos USA México", "carga terrestre", "cajas a México", "A&L Trucking Logistics"],
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-MX">
      <body className={`${inter.variable} ${sora.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
