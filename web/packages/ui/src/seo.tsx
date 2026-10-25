import type { Metadata } from "next";
import { LOCALES, type Locale } from "./i18n";

/**
 * Search and sharing metadata shared by every app: canonical URLs, hreflang
 * alternates for each language (`?lang=xx`), Open Graph and Twitter cards.
 * Each app sets its public address in NEXT_PUBLIC_SITE_URL.
 */

const OG_LOCALES: Record<Locale, string> = { ar: "ar_AR", en: "en_US", fr: "fr_FR", es: "es_ES", pt: "pt_BR", zh: "zh_CN" };

export function siteUrl(fallbackPort: number) {
  return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? `http://localhost:${fallbackPort}`);
}

/** hreflang links for a path: one per language, plus x-default (Arabic). */
export function languageAlternates(path = "/") {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l.code] = `${path}?lang=${l.code}`;
  languages["x-default"] = path;
  return { canonical: path, languages };
}

/**
 * Root-layout metadata. `index: false` for private apps (portals, admin):
 * they still get icons and titles but ask search engines to stay out.
 */
export function rootMetadata({
  base,
  locale,
  name,
  title,
  description,
  keywords,
  index = true,
}: {
  base: URL;
  locale: Locale;
  name: string;
  title: string;
  description: string;
  keywords?: string[];
  index?: boolean;
}): Metadata {
  return {
    metadataBase: base,
    title: { default: title, template: `%s · ${name}` },
    description,
    applicationName: name,
    keywords,
    category: "education",
    creator: "Manara",
    publisher: "Manara",
    formatDetection: { telephone: false, email: false, address: false },
    alternates: index ? languageAlternates("/") : undefined,
    openGraph: {
      type: "website",
      siteName: name,
      title,
      description,
      url: "/",
      locale: OG_LOCALES[locale],
      alternateLocale: Object.values(OG_LOCALES).filter((l) => l !== OG_LOCALES[locale]),
    },
    twitter: { card: "summary_large_image", title, description },
    robots: index
      ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } }
      : { index: false, follow: false, nocache: true },
    manifest: "/manifest.webmanifest",
  };
}

/**
 * Page metadata with its own canonical URL and language alternates, and the
 * same title/description on social cards.
 */
export function pageMetadata({ path, title, description, image, type = "website" }: { path: string; title: string; description?: string | null; image?: string | false; type?: "website" | "article" }): Metadata {
  // false: the page has its own opengraph-image file, which Next links itself.
  const images = image === false ? {} : { images: [image ?? "/opengraph-image"] };
  return {
    title,
    description: description ?? undefined,
    alternates: languageAlternates(path),
    openGraph: { type, title, description: description ?? undefined, url: path, ...images },
    twitter: { card: "summary_large_image", title, description: description ?? undefined, ...images },
  };
}

/** Structured data (schema.org) for rich search results. */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

/** The brand mark as an SVG file (favicons, manifest). */
export const BRAND_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#132544"/><g fill="none" stroke="#e0b55f" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 3.6v2.5M15 5.3l1.4 1.7M25 5.3l-1.4 1.7"/><path d="M11.5 11.7 20 8.1l8.5 3.6L20 15.3z"/><path d="M12.7 12.3v3.4"/><path d="M15.6 16.9h8.8v2.3h-8.8z"/><path d="M16.6 19.2 15.1 29.4M23.4 19.2l1.5 10.2"/><path d="M16.2 23.4l7.5-2.3M15.7 27.2l8.8-2.7"/><path d="M7.4 30.8c4.2-1.7 8.4-1.4 12.6.9 4.2-2.3 8.4-2.6 12.6-.9"/><path d="M7.4 33.8c4.2-1.7 8.4-1.4 12.6.9 4.2-2.3 8.4-2.6 12.6-.9"/></g></svg>`;

/** Light/dark browser chrome colours, matching the page backgrounds. */
export const THEME_COLORS = [
  { media: "(prefers-color-scheme: light)", color: "#f9f8f5" },
  { media: "(prefers-color-scheme: dark)", color: "#0e1930" },
];
