export const homeDescription = "Envía cajas de USA a México con A&L Trucking Logistics. Consulta tarifas por categoría, cotiza con tus medidas y da seguimiento a tu envío desde tu cuenta.";

export function getSeoConfig(origin = process.env.NEXT_PUBLIC_SITE_URL, enabled = process.env.SEO_INDEXABLE) {
  const url = new URL(origin || "http://localhost:3100");
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("NEXT_PUBLIC_SITE_URL debe ser un origen HTTP(S), sin credenciales, ruta ni parámetros.");
  }
  const host = url.hostname.toLowerCase();
  const local = host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".test") || host === "[::1]" || /^\d+\.\d+\.\d+\.\d+$/.test(host);
  return { origin: url.origin, indexable: enabled === "true" && !local && url.protocol === "https:" };
}

export const seoConfig = getSeoConfig();
export const siteUrl = (path: string) => new URL(path, seoConfig.origin).toString();
