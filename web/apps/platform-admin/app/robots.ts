import type { MetadataRoute } from "next";

/** A private app: keep every page out of search results. */
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
