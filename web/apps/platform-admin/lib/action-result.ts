import { redirect, unstable_rethrow } from "next/navigation";
import { ApiError } from "@educloud/api-client";
import { clearSession } from "@educloud/api-client/server";
import { getT } from "@educloud/ui/locale";

export type Failure = { ok: false; error: string; errors?: Record<string, string[]> };

/**
 * Turns anything a server action caught into a result the UI can toast:
 * the API's first validation message, its error message, or a friendly
 * fallback. Next redirects pass through; an expired session goes to sign-in.
 */
export async function failure(error: unknown, fallback?: string): Promise<Failure> {
  unstable_rethrow(error);
  if (error instanceof ApiError) {
    if (error.status === 401) {
      await clearSession();
      redirect("/login?expired=1");
    }
    const first = Object.values(error.errors ?? {})[0]?.[0];
    return { ok: false, error: first ?? (error.message || fallback || (await getT())("Something went wrong. Please try again.")), errors: error.errors };
  }
  return { ok: false, error: fallback ?? (await getT())("Something went wrong. Please try again.") };
}

/** Field name → first message, for forms that show errors under inputs. */
export function fieldErrors(errors: Record<string, string[]> | undefined): Record<string, string> {
  return Object.fromEntries(Object.entries(errors ?? {}).map(([k, v]) => [k, v[0] ?? ""]));
}
