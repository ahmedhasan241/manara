import type { MetadataRoute } from "next";
import { siteUrl } from "@educloud/ui/seo";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl(3004);
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/","/checkout/","/cart","/learn/","/my-learning","/wishlist","/dashboard","/login"] }],
    sitemap: new URL("/sitemap.xml", base).toString(),
    host: base.origin,
  };
}
