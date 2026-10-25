import { cookies } from "next/headers";
import { TOKEN_COOKIE, apiBaseUrl } from "@educloud/api-client/server";

/**
 * Authorizes private WebSocket channels with the API, using the session token
 * the browser can't read.
 */
export async function POST(request: Request) {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) return new Response("Unauthenticated", { status: 401 });

  const upstream = await fetch(`${apiBaseUrl()}/api/broadcasting/auth`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": request.headers.get("content-type") ?? "application/x-www-form-urlencoded",
    },
    body: await request.text(),
    cache: "no-store",
  });

  return new Response(await upstream.text(), { status: upstream.status, headers: { "Content-Type": "application/json" } });
}
