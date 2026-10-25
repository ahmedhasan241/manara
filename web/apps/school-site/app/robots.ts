import type { MetadataRoute } from "next";
import { siteUrl } from "@educloud/ui/seo";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl(3002);
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: new URL("/sitemap.xml", base).toString(),
    host: base.origin,
  };
}
