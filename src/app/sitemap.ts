import type { MetadataRoute } from "next";
import { allowIndexing, siteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  if (!allowIndexing || !siteUrl.ok) return [];
  return [{ url: siteUrl.url, changeFrequency: "weekly", priority: 1 }];
}
