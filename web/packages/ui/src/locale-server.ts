import { cache, createElement, type ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { fetchRates, resolveCurrency } from "@educloud/api-client/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, localeDir, type Locale } from "./i18n";
import { loadCatalog } from "./i18n/catalog";
import { I18nProvider } from "./i18n-provider";
import { UiProviders } from "./primitives";
import { createFormatters, createTranslator } from "./translate";

/** Set by the proxy when the URL has `?lang=` (see proxy-locale.ts). */
const LOCALE_HEADER = "x-educloud-locale";

/**
 * The visitor's language: `?lang=` in the URL, else their saved choice,
 * otherwise Arabic.
 */
export async function getRequestLocale(): Promise<{ locale: Locale; dir: "ltr" | "rtl" }> {
  const [jar, head] = await Promise.all([cookies(), headers()]);
  const requested = head.get(LOCALE_HEADER) ?? jar.get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(requested) ? requested : DEFAULT_LOCALE;
  return { locale, dir: localeDir(locale) };
}

/**
 * Language, currency, translator and formatters for this request (server
 * components). Cached per request.
 */
export const getI18n = cache(async () => {
  const [{ locale, dir }, currency, rates] = await Promise.all([getRequestLocale(), resolveCurrency(), fetchRates()]);
  const [catalog, fallback] = await Promise.all([loadCatalog(locale), loadCatalog("en")]);
  return { locale, dir, currency, rates: rates ?? undefined, catalog, fallback, t: createTranslator(locale, catalog, fallback), fmt: createFormatters(locale, currency, rates ?? undefined) };
});

/** t("English text") in server components. */
export async function getT() {
  return (await getI18n()).t;
}

/** Root-layout wrapper that hands the active catalog to client components. */
export async function I18nRoot({ children }: { children: ReactNode }) {
  const { locale, currency, rates, catalog, fallback } = await getI18n();
  return createElement(I18nProvider, { locale, currency, rates, catalog, fallback, children: createElement(UiProviders, null, children) });
}

/** Locale-aware date, number and money formatting in server components. */
export async function getFormat() {
  return (await getI18n()).fmt;
}
