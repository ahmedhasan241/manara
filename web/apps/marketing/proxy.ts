import type { NextRequest } from "next/server";
import { applyLocaleParam } from "@educloud/ui/proxy";

/** `?lang=xx` opens any page in that language (and remembers it). */
export function proxy(request: NextRequest) {
  return applyLocaleParam(request);
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
