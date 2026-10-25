import { NextResponse, type NextRequest } from "next/server";
import { applyLocaleParam } from "@educloud/ui/proxy";

/**
 * Maps {slug}.TENANT_ROOT_DOMAIN to /{slug}, so each subscriber's website is served
 * from its own subdomain. In local development, open http://localhost:3002/{slug}.
 * `?lang=xx` switches the language.
 */
export function proxy(request: NextRequest) {
  const root = process.env.TENANT_ROOT_DOMAIN ?? "educloud.test";
  const host = (request.headers.get("host") ?? "").split(":")[0] ?? "";

  if (host.endsWith(`.${root}`)) {
    const slug = host.slice(0, -(root.length + 1));
    const url = request.nextUrl.clone();
    url.pathname = `/${slug}${url.pathname === "/" ? "" : url.pathname}`;
    return applyLocaleParam(request, (init) => NextResponse.rewrite(url, init));
  }

  return applyLocaleParam(request);
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|.*\\..*).*)"],
};
