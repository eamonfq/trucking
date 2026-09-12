import type { MetadataRoute } from "next";
import { seoConfig, siteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  if (!seoConfig.indexable) return [];
  return ["/", "/como-funciona"].map(path => ({
    url: siteUrl(path),
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
