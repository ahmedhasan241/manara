import { formatCurrencyParts } from "@educloud/api-client";
import { intlLocale, type Locale } from "./i18n";
import type { MessageKey } from "./i18n/catalog/keys";

/*
 * Translation is keyed by the English text, gettext-style, so code reads
 * naturally: t("Save details"). Each catalog maps that English text to its
 * translation. Placeholders use {name}; plural messages give one form per
 * plural category of the language (Arabic has six) and use {count}.
 */

export type Plural = { zero?: string; one?: string; two?: string; few?: string; many?: string; other: string };
export type Translation = string | Plural;
export type Catalog = Partial<Record<MessageKey, Translation>>;
export type Vars = Record<string, string | number>;
export type { MessageKey };

export type Translate = (key: MessageKey, vars?: Vars) => string;

export function createTranslator(locale: Locale, catalog: Catalog, fallback: Catalog = {}): Translate {
  const rules = new Intl.PluralRules(intlLocale(locale));
  const numbers = new Intl.NumberFormat(intlLocale(locale));

  return (key, vars) => {
    const entry = catalog[key] ?? fallback[key] ?? key;
    let text: string;
    if (typeof entry === "string") {
      text = entry;
    } else {
      const count = Number(vars?.count ?? 0);
      const category = count === 0 && entry.zero ? "zero" : rules.select(count);
      text = entry[category as keyof Plural] ?? entry.other;
    }
    return vars ? text.replace(/\{(\w+)\}/g, (_, name: string) => (name in vars ? (typeof vars[name] === "number" ? numbers.format(vars[name]) : String(vars[name])) : `{${name}}`)) : text;
  };
}

export interface Formatters {
  number: (value: number, options?: Intl.NumberFormatOptions) => string;
  percent: (value: number) => string;
  /** A price stored in `from` (default USD), shown in the visitor's currency. */
  money: (cents: number, from?: string) => string;
  /** An amount exactly as charged, in its own currency (receipts, admin prices). */
  exactMoney: (cents: number, currency: string) => string;
  date: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string;
  dateTime: (value: string | Date) => string;
  time: (value: string | Date) => string;
  relative: (value: string | Date) => string;
}

/** Units of each currency per 1 USD, from the API. */
export type Rates = Record<string, number>;

/**
 * Locale-aware number, money and date formatting. Prices are converted into
 * the visitor's currency when rates are known; otherwise they stay as stored.
 */
export function createFormatters(locale: Locale, currency = "USD", rates?: Rates): Formatters {
  const tag = intlLocale(locale);
  const format = (amount: number, code: string, fractions: number) =>
    formatCurrencyParts(new Intl.NumberFormat(tag, { style: "currency", currency: code, minimumFractionDigits: fractions, maximumFractionDigits: fractions }), amount);
  const exactMoney = (cents: number, code: string) => format(cents / 100, code, cents % 100 === 0 ? 0 : 2);
  const relative = new Intl.RelativeTimeFormat(tag, { numeric: "auto" });

  return {
    number: (value, options) => new Intl.NumberFormat(tag, options).format(value),
    percent: (value) => new Intl.NumberFormat(tag, { style: "percent", maximumFractionDigits: 0 }).format(value / 100),
    money: (cents, from = "USD") => {
      const fromRate = rates?.[from];
      const toRate = rates?.[currency];
      if (from === currency || !fromRate || !toRate) return exactMoney(cents, from);
      const amount = (cents / 100 / fromRate) * toRate;
      // Converted prices are approximate, so keep them tidy.
      return format(amount >= 10 ? Math.round(amount) : amount, currency, amount >= 10 ? 0 : 2);
    },
    exactMoney,
    date: (value, options = { dateStyle: "medium" }) => new Intl.DateTimeFormat(tag, options).format(new Date(value)),
    dateTime: (value) => new Intl.DateTimeFormat(tag, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)),
    time: (value) => new Intl.DateTimeFormat(tag, { hour: "numeric", minute: "2-digit" }).format(new Date(value)),
    relative: (value) => {
      const seconds = (new Date(value).getTime() - Date.now()) / 1000;
      const units: [Intl.RelativeTimeFormatUnit, number][] = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
      for (const [unit, size] of units) {
        if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
      }
      return relative.format(Math.round(seconds), "second");
    },
  };
}

/**
 * Marks a value from data (a status, role, level...) as a message key. The
 * catalogs list every such value; unknown ones show as they are.
 */
export const asKey = (value: string) => value as MessageKey;
