/**
 * Currencies the product can show prices in, and how a visitor's country is
 * mapped to one. Exchange rates come from the API; this file only decides
 * which currency to ask for.
 */

export const CURRENCIES = [
  "USD", "EUR", "GBP", "EGP", "SAR", "AED", "KWD", "QAR", "BHD", "OMR", "JOD", "MAD", "TND", "DZD", "IQD",
  "TRY", "INR", "PKR", "BDT", "IDR", "MYR", "NGN", "KES", "ZAR", "BRL", "MXN", "CAD", "AUD", "CNY", "JPY",
] as const;

export type Currency = (typeof CURRENCIES)[number];

export const BASE_CURRENCY: Currency = "USD";
export const CURRENCY_COOKIE = "currency";
/** The browser's time zone, set by the client so the server can guess the country locally. */
export const TIMEZONE_COOKIE = "geo_tz";

export function isCurrency(value: string | null | undefined): value is Currency {
  return CURRENCIES.includes(value as Currency);
}

const EURO = ["AT", "BE", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "HR", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PT", "SI", "SK"];

/** ISO country → currency (countries without a listed currency use USD). */
export const COUNTRY_CURRENCY: Record<string, Currency> = {
  ...Object.fromEntries(EURO.map((c) => [c, "EUR" as Currency])),
  US: "USD", GB: "GBP", EG: "EGP", SA: "SAR", AE: "AED", KW: "KWD", QA: "QAR", BH: "BHD", OM: "OMR", JO: "JOD",
  MA: "MAD", TN: "TND", DZ: "DZD", IQ: "IQD", TR: "TRY", IN: "INR", PK: "PKR", BD: "BDT", ID: "IDR", MY: "MYR",
  NG: "NGN", KE: "KES", ZA: "ZAR", BR: "BRL", MX: "MXN", CA: "CAD", AU: "AUD", CN: "CNY", JP: "JPY",
};

/** Common time zones → country, for guessing the country when no geo header is present (e.g. locally). */
export const TIMEZONE_COUNTRY: Record<string, string> = {
  "Africa/Cairo": "EG", "Asia/Riyadh": "SA", "Asia/Dubai": "AE", "Asia/Kuwait": "KW", "Asia/Qatar": "QA",
  "Asia/Bahrain": "BH", "Asia/Muscat": "OM", "Asia/Amman": "JO", "Africa/Casablanca": "MA", "Africa/Tunis": "TN",
  "Africa/Algiers": "DZ", "Asia/Baghdad": "IQ", "Europe/Istanbul": "TR", "Asia/Kolkata": "IN", "Asia/Calcutta": "IN",
  "Asia/Karachi": "PK", "Asia/Dhaka": "BD", "Asia/Jakarta": "ID", "Asia/Kuala_Lumpur": "MY", "Africa/Lagos": "NG",
  "Africa/Nairobi": "KE", "Africa/Johannesburg": "ZA", "America/Sao_Paulo": "BR", "America/Mexico_City": "MX",
  "America/Toronto": "CA", "America/Vancouver": "CA", "Australia/Sydney": "AU", "Australia/Melbourne": "AU",
  "Asia/Shanghai": "CN", "Asia/Tokyo": "JP", "Europe/London": "GB", "Europe/Paris": "FR", "Europe/Berlin": "DE",
  "Europe/Madrid": "ES", "Europe/Rome": "IT", "Europe/Amsterdam": "NL", "Europe/Brussels": "BE", "Europe/Lisbon": "PT",
  "Europe/Vienna": "AT", "Europe/Dublin": "IE", "Europe/Athens": "GR", "America/New_York": "US", "America/Chicago": "US",
  "America/Denver": "US", "America/Los_Angeles": "US",
};

/**
 * Picks the currency for a request: the visitor's own choice, then the
 * country from the hosting provider's geo header, then the browser's time
 * zone, then the region in Accept-Language, then USD.
 */
export function pickCurrency(input: { saved?: string | null; country?: string | null; timeZone?: string | null; acceptLanguage?: string | null }): Currency {
  if (isCurrency(input.saved)) return input.saved;

  const fromCountry = (code?: string | null) => (code ? COUNTRY_CURRENCY[code.toUpperCase()] : undefined);
  const byGeo = fromCountry(input.country);
  if (byGeo) return byGeo;

  const byZone = fromCountry(input.timeZone ? TIMEZONE_COUNTRY[input.timeZone] : null);
  if (byZone) return byZone;

  const region = (input.acceptLanguage ?? "")
    .split(",")
    .map((part) => part.split(";")[0]!.trim().split("-")[1])
    .find((r) => r && fromCountry(r));
  return fromCountry(region) ?? BASE_CURRENCY;
}
