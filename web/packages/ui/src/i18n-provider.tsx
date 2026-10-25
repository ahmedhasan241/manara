"use client";

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { localeDir, type Locale } from "./i18n";
import { GlobalLoader, finishLanguageLoad, finishPageLoad } from "./loader";
import { createFormatters, createTranslator, type Catalog, type Formatters, type MessageKey, type Rates, type Translate, type Vars } from "./translate";

interface I18nValue {
  locale: Locale;
  dir: "ltr" | "rtl";
  currency: string;
  t: Translate;
  fmt: Formatters;
}

const I18nContext = createContext<I18nValue | null>(null);

/** Cookie with the browser's time zone, so the server can pick the visitor's currency. */
const TIMEZONE_COOKIE = "geo_tz";

/**
 * Gives client components the visitor's language, currency and catalog. The
 * server passes only the active language's catalog.
 */
export function I18nProvider({ locale, currency, rates, catalog, fallback, children }: { locale: Locale; currency: string; rates?: Rates; catalog: Catalog; fallback?: Catalog; children: ReactNode }) {
  const router = useRouter();
  const value = useMemo<I18nValue>(
    () => ({ locale, dir: localeDir(locale), currency, t: createTranslator(locale, catalog, fallback), fmt: createFormatters(locale, currency, rates) }),
    [locale, currency, rates, catalog, fallback],
  );

  // First visit: tell the server the browser's time zone (a stand-in for the
  // country when there's no geo header, e.g. locally), then refresh prices.
  useEffect(() => {
    if (document.cookie.includes(`${TIMEZONE_COOKIE}=`)) return;
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    document.cookie = `${TIMEZONE_COOKIE}=${encodeURIComponent(zone)}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }, [router]);

  // The new language or currency has arrived from the server: lift the loaders.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    finishLanguageLoad();
  }, [locale]);
  useEffect(() => finishPageLoad(), [currency]);

  return (
    <I18nContext.Provider value={value}>
      {children}
      <GlobalLoader loadingLabel={value.t("Loading…")} />
    </I18nContext.Provider>
  );
}

function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("Wrap the app in <I18nRoot> (from @educloud/ui/locale).");
  return value;
}

/** Translated text for components shared by server and client code. */
export function Translated({ text, vars }: { text: MessageKey; vars?: Vars }) {
  return <>{useT()(text, vars)}</>;
}

/** t("English text", { name }) in client components. */
export const useT = () => useI18n().t;
export const useFormat = () => useI18n().fmt;
export const useLocale = () => useI18n().locale;
export const useCurrency = () => useI18n().currency;
