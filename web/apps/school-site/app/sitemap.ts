import type { MetadataRoute } from "next";
import { siteUrl } from "@educloud/ui/seo";

/** The site's home page; each school's own site lists itself from its subdomain. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: siteUrl(3002).toString(), priority: 1 }];
}
