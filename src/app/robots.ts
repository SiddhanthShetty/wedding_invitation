import type { MetadataRoute } from "next";
import { allowIndexing, siteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  if (!allowIndexing) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/print"] },
    sitemap: siteUrl.ok ? `${siteUrl.url}/sitemap.xml` : undefined,
  };
}
