import { cookies } from "next/headers";
import { TENANT_COOKIE, TOKEN_COOKIE, apiBaseUrl } from "@educloud/api-client/server";

/**
 * Streams file downloads (CSV exports, materials, my-data export) from the API,
 * adding the session token that the browser can't read itself.
 */
const ALLOWED = [/^exports\/courses\/[\w-]+\/(grades|attendance)\.csv$/, /^materials\/[\w-]+\/download$/, /^me\/export$/];

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path.join("/");
  if (!ALLOWED.some((pattern) => pattern.test(path))) {
    return new Response("Not found", { status: 404 });
  }

  const jar = await cookies();
  const upstream = await fetch(`${apiBaseUrl()}/api/v1/${path}`, {
    headers: {
      Accept: "*/*",
      Authorization: `Bearer ${jar.get(TOKEN_COOKIE)?.value ?? ""}`,
      "X-Tenant": jar.get(TENANT_COOKIE)?.value ?? "",
    },
    cache: "no-store",
  });

  const headers = new Headers();
  for (const name of ["content-type", "content-disposition", "content-length"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}
