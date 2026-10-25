import { createClient, type MarketingContent, type Plan } from "@educloud/api-client";
import type { Translate } from "../translate";
import { getI18n } from "../locale-server";

export type SiteContent = MarketingContent & { plans: Plan[] };

/** Shown only if the API is unreachable at build/render time. */
function fallback(t: Translate): SiteContent {
  return {
    hero: {
      eyebrow: t("For teachers, lecturers, schools and universities"),
      title: t("Less admin. More teaching."),
      subtitle: t("Grades, attendance, live lectures, recordings and messages in one calm place."),
      primary_cta: t("Start your 14-day free trial"),
      secondary_cta: t("See packages"),
    },
    stats: [],
    audiences: [],
    features: [],
    testimonials: [],
    faq: [],
    cta: { title: t("Set up your classroom in five minutes"), subtitle: t("Create a workspace and invite your students."), button: t("Get started free") },
    plans: [],
  };
}

/**
 * Website content edited from the platform admin, in the visitor's language.
 * Cached for a minute (per language) so edits appear quickly without hitting
 * the API on every visit.
 */
export async function loadContent(): Promise<SiteContent> {
  const { t, locale } = await getI18n();
  try {
    return await createClient({ baseUrl: process.env.API_URL ?? "http://localhost:8001", locale, init: { next: { revalidate: 60, tags: ["marketing"] } } }).marketing();
  } catch {
    return fallback(t);
  }
}
