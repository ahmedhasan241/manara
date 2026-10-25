import { NextResponse, type NextRequest } from "next/server";
import { applyLocaleParam } from "@educloud/ui/proxy";

/**
 * Sends visitors without a session to /login before any page renders, so pages
 * never call the API unauthenticated. (Expired sessions are still caught by the
 * dashboard layout.) `?lang=xx` switches the language.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.has("edu_token") && request.nextUrl.pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return applyLocaleParam(request);
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|.*\\..*).*)"],
};
