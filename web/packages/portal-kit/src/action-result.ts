import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ApiError } from "@educloud/api-client";
import { clearSession, serverClient } from "@educloud/api-client/server";
import { getT } from "@educloud/ui/locale";

/**
 * Results for server actions, so every create / update / delete in the
 * portals reports back the same way (`useActionToast` in @educloud/ui turns
 * them into toasts). Server-only helpers; import them from "use server" files.
 */

export type Success<T = undefined> = { ok: true; message?: string; data?: T };
/** `code` is the API's reason when it gives one (e.g. "seat_limit", "addon_required"). */
export type Failure = { ok: false; error: string; errors?: Record<string, string[]>; code?: string };
export type Result<T = undefined> = Success<T> | Failure;

/**
 * Anything a server action caught, as a result the UI can show: the API's
 * first validation message, its error message, or a friendly fallback.
 * Next redirects pass through, and an expired session goes to sign-in.
 */
export async function failure(error: unknown, fallback?: string): Promise<Failure> {
  unstable_rethrow(error);
  if (error instanceof ApiError) {
    if (error.status === 401) {
      await clearSession();
      redirect("/login?expired=1");
    }
    const first = Object.values(error.errors ?? {})[0]?.[0];
    return { ok: false, error: first || error.message || fallback || (await getT())("Something went wrong. Please try again."), errors: error.errors, ...(error.code ? { code: error.code } : {}) };
  }
  return { ok: false, error: fallback ?? (await getT())("We couldn't reach the server. Please try again.") };
}

/** Field name → first message, for forms that show errors under inputs. */
export function fieldErrors(errors: Record<string, string[]> | undefined): Record<string, string> {
  return Object.fromEntries(Object.entries(errors ?? {}).map(([key, messages]) => [key, messages[0] ?? ""]));
}

type Api = Awaited<ReturnType<typeof serverClient>>;

/**
 * Runs one API call, refreshes `paths` and returns `{ ok: true, message }`,
 * or the failure. `message` may depend on what the call returned.
 */
export async function attempt<T>(call: (api: Api) => Promise<T>, options: { message?: string | ((data: T) => string); paths?: (string | [string, "layout" | "page"])[] } = {}): Promise<Result<T>> {
  let data: T;
  try {
    data = await call(await serverClient());
  } catch (error) {
    return failure(error);
  }
  for (const path of options.paths ?? []) {
    if (Array.isArray(path)) revalidatePath(path[0], path[1]);
    else revalidatePath(path);
  }
  const message = typeof options.message === "function" ? options.message(data) : options.message;
  return { ok: true, message, data };
}
