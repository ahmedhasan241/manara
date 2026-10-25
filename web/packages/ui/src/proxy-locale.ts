import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, isLocale } from "./i18n";

/** Request header the root layout reads before the cookie. */
export const LOCALE_HEADER = "x-educloud-locale";

/**
 * Lets any page be opened in a language with `?lang=fr` (what search engines
 * follow from the hreflang links): the page renders in that language and the
 * choice is remembered in the locale cookie.
 *
 * Pass the response your proxy would return (`NextResponse.next()` or a
 * rewrite); returns it with the locale applied.
 */
export function applyLocaleParam(request: NextRequest, respond: (init?: { request: { headers: Headers } }) => NextResponse = (init) => NextResponse.next(init)) {
  const lang = request.nextUrl.searchParams.get("lang");
  if (!isLocale(lang)) return respond();

  const headers = new Headers(request.headers);
  headers.set(LOCALE_HEADER, lang);
  const response = respond({ request: { headers } });
  response.cookies.set(LOCALE_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return response;
}
