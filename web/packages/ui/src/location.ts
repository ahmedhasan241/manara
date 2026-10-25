/**
 * Countries for people's profiles: ISO 3166-1 alpha-2 codes (plus XK, Kosovo),
 * names in the reader's language via Intl.DisplayNames, and flag emoji.
 * Safe to use on the server and the client.
 */

export const COUNTRY_CODES = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU", "AW", "AX", "AZ",
  "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BV", "BW", "BY", "BZ",
  "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ",
  "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE", "EG", "EH", "ER", "ES", "ET", "FI", "FJ", "FK", "FM", "FO", "FR",
  "GA", "GB", "GD", "GE", "GF", "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY",
  "HK", "HM", "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT", "JE", "JM", "JO", "JP",
  "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY",
  "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK", "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ",
  "NA", "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY",
  "QA", "RE", "RO", "RS", "RU", "RW", "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS", "ST", "SV", "SX", "SY", "SZ",
  "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "UM", "US", "UY", "UZ",
  "VA", "VC", "VE", "VG", "VI", "VN", "VU", "WF", "WS", "XK", "YE", "YT", "ZA", "ZM", "ZW",
] as const;

export type CountryCode = (typeof COUNTRY_CODES)[number];

/** Where a person lives. Every part is optional. */
export interface UserLocation {
  country?: string | null;
  city?: string | null;
  area?: string | null;
}

/** "🇪🇬" for "EG"; empty for anything that isn't two letters. */
export function countryFlag(code: string | null | undefined): string {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

const namers = new Map<string, Intl.DisplayNames | null>();

/** The country's name in the given language ("مصر", "Egypt", "Égypte"…), or the code itself. */
export function countryName(code: string | null | undefined, locale: string): string {
  if (!code) return "";
  if (!namers.has(locale)) {
    try {
      namers.set(locale, new Intl.DisplayNames([locale], { type: "region" }));
    } catch {
      namers.set(locale, null);
    }
  }
  try {
    return namers.get(locale)?.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/** Every country, sorted by its name in the given language. */
export function countryOptions(locale: string): { code: CountryCode; name: string; flag: string }[] {
  const collator = new Intl.Collator(locale);
  return COUNTRY_CODES.map((code) => ({ code, name: countryName(code, locale), flag: countryFlag(code) })).sort((a, b) => collator.compare(a.name, b.name));
}

/** "Maadi, Cairo, Egypt" (or "المعادي، القاهرة، مصر"); empty when nothing is set. */
export function formatLocation(location: UserLocation | null | undefined, locale: string, { flag = false }: { flag?: boolean } = {}): string {
  if (!location) return "";
  const separator = locale.startsWith("ar") ? "، " : locale.startsWith("zh") ? "，" : ", ";
  const parts = [location.area, location.city, location.country ? countryName(location.country, locale) : null].filter((p): p is string => !!p && p.trim() !== "");
  // Each part keeps its own direction, so "Sheikh Zayed، Giza، مصر" reads correctly in either layout.
  const text = parts.map((p) => `⁨${p}⁩`).join(separator);
  return flag && location.country && text ? `${countryFlag(location.country)} ${text}` : text;
}
