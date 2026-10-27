import { cookies, headers } from "next/headers";
import { createClient } from "./index";
import { CURRENCY_COOKIE, TIMEZONE_COOKIE, pickCountry, pickCurrency, type Currency } from "./currency";

/**
 * Server-only helpers for Next.js apps. The API token lives in an httpOnly cookie
 * so page scripts never see it.
 */
export const TOKEN_COOKIE = "edu_token";
export const TENANT_COOKIE = "edu_tenant";
/** Parents: the child currently being viewed. */
export const STUDENT_COOKIE = "edu_student";

export const apiBaseUrl = () => process.env.API_URL ?? "http://localhost:8001";

/** Locale cookie shared with @educloud/ui (kept here so this package has no UI dependency). */
const LOCALE_COOKIE = "locale";

/**
 * The currency to show this visitor: their choice, else their country (geo
 * header from the host, or the time zone their browser reported).
 */
export async function resolveCurrency(): Promise<Currency> {
  const jar = await cookies();
  return pickCurrency({ saved: jar.get(CURRENCY_COOKIE)?.value, ...(await geoSignals()) });
}

/**
 * The visitor's country, which decides the prices they're offered (plans can
 * be priced per country). Null when it can't be told.
 */
export async function resolveCountry(): Promise<string | null> {
  return pickCountry(await geoSignals());
}

async function geoSignals() {
  const [jar, head] = await Promise.all([cookies(), headers()]);
  return {
    country: head.get("x-vercel-ip-country") ?? head.get("cf-ipcountry") ?? head.get("cloudfront-viewer-country") ?? head.get("x-country-code"),
    timeZone: jar.get(TIMEZONE_COOKIE)?.value ? decodeURIComponent(jar.get(TIMEZONE_COOKIE)!.value) : null,
    acceptLanguage: head.get("accept-language"),
  };
}

/**
 * Exchange rates (units per 1 USD) for showing prices in local currencies.
 * Cached for an hour; null if the API can't be reached.
 */
export async function fetchRates(): Promise<Record<string, number> | null> {
  try {
    // `next` is Next.js's fetch cache option (not in the DOM RequestInit type).
    const init = { next: { revalidate: 3600 }, headers: { Accept: "application/json" } } as RequestInit;
    const response = await fetch(`${apiBaseUrl()}/api/v1/currencies`, init);
    if (!response.ok) return null;
    return ((await response.json()) as { rates: Record<string, number> }).rates;
  } catch {
    return null;
  }
}

export async function serverClient() {
  const jar = await cookies();
  return createClient({
    baseUrl: apiBaseUrl(),
    token: jar.get(TOKEN_COOKIE)?.value,
    tenant: jar.get(TENANT_COOKIE)?.value,
    student: jar.get(STUDENT_COOKIE)?.value,
    locale: (await headers()).get("x-educloud-locale") ?? jar.get(LOCALE_COOKIE)?.value ?? "ar",
    currency: await resolveCurrency(),
    country: await resolveCountry(),
    init: { cache: "no-store" },
  });
}

export async function setStudent(studentId: number) {
  (await cookies()).set(STUDENT_COOKIE, String(studentId), { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" });
}

export async function setSession(token: string, tenant?: string) {
  const jar = await cookies();
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
  jar.set(TOKEN_COOKIE, token, options);
  if (tenant) jar.set(TENANT_COOKIE, tenant, options);
}

export async function setTenant(tenant: string) {
  const jar = await cookies();
  jar.set(TENANT_COOKIE, tenant, { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(TOKEN_COOKIE);
  jar.delete(TENANT_COOKIE);
  jar.delete(STUDENT_COOKIE);
}

export async function hasSession() {
  return Boolean((await cookies()).get(TOKEN_COOKIE)?.value);
}
