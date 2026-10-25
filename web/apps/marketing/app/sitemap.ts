import type { MetadataRoute } from "next";
import { LOCALES } from "@educloud/ui";
import { siteUrl } from "@educloud/ui/seo";

/** The product website's pages, each with its language versions. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl(3000);
  return (
    [
      ["/", 1],
      ["/pricing", 0.9],
      ["/security", 0.6],
      ["/signup", 0.7],
    ] as const
  ).map(([path, priority]) => ({
    url: new URL(path, base).toString(),
    priority,
    alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l.code, new URL(`${path}?lang=${l.code}`, base).toString()])) },
  }));
}
