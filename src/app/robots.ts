import type { MetadataRoute } from "next";
import { seoConfig, siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  if (!seoConfig.indexable) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/cliente", "/admin", "/api/", "/design", "/rastrear", "/login", "/registro", "/recuperar", "/restablecer", "/verificar", "/invitacion"] },
    sitemap: siteUrl("/sitemap.xml"),
  };
}
