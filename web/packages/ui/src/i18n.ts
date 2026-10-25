/**
 * Languages Manara ships in. Arabic is the default; every language has the
 * full catalogue (checked by the type system, see i18n/catalog).
 */

export const LOCALES = [
  { code: "ar", name: "العربية", english: "Arabic", dir: "rtl" },
  { code: "en", name: "English", english: "English", dir: "ltr" },
  { code: "fr", name: "Français", english: "French", dir: "ltr" },
  { code: "es", name: "Español", english: "Spanish", dir: "ltr" },
  { code: "pt", name: "Português", english: "Portuguese", dir: "ltr" },
  { code: "zh", name: "中文", english: "Chinese", dir: "ltr" },
] as const;

export type Locale = (typeof LOCALES)[number]["code"];

export const DEFAULT_LOCALE: Locale = "ar";
export const LOCALE_COOKIE = "locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return LOCALES.some((l) => l.code === value);
}

export function localeDir(locale: Locale): "ltr" | "rtl" {
  return LOCALES.find((l) => l.code === locale)?.dir ?? "ltr";
}

/**
 * The tag used with Intl. Arabic keeps Latin digits so prices, dates and
 * codes read the same everywhere in the product.
 */
export function intlLocale(locale: Locale) {
  return locale === "ar" ? "ar-u-nu-latn" : locale === "zh" ? "zh-CN" : locale;
}
