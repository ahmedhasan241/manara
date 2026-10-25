import type { MetadataRoute } from "next";
import { createClient } from "@educloud/api-client";
import { LOCALES } from "@educloud/ui";
import { siteUrl } from "@educloud/ui/seo";

export const revalidate = 3600;

/** Public pages and every published course, each with its language versions. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl(3004);
  const api = createClient({ baseUrl: process.env.API_URL ?? "http://localhost:8001", init: { next: { revalidate: 3600 } } });
  const entry = (path: string, priority: number, lastModified?: string | null): MetadataRoute.Sitemap[number] => ({
    url: new URL(path, base).toString(),
    lastModified: lastModified ?? undefined,
    priority,
    alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l.code, new URL(`${path}?lang=${l.code}`, base).toString()])) },
  });

  const [courses, organizations] = await Promise.all([
    api.catalogCourses({ per_page: 100 }).then((page) => page.data).catch(() => []),
    api.catalogOrganizations().catch(() => []),
  ]);
  const instructors = [...new Set(courses.map((c) => c.instructor?.id).filter((id): id is number => !!id))];

  return [
    entry("/", 1),
    entry("/explore", 0.9),
    entry("/instructors", 0.7),
    entry("/institutions", 0.7),
    entry("/help", 0.6),
    entry("/security", 0.4),
    ...courses.map((c) => entry(`/course/${c.slug}`, 0.8, c.published_at)),
    ...organizations.map((o) => entry(`/explore?organization=${o.slug}`, 0.5)),
    ...instructors.map((id) => entry(`/instructor/${id}`, 0.6)),
  ];
}
