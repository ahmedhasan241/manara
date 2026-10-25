import { ApiError } from "@educloud/api-client";
import { getT } from "@educloud/ui/locale";

/**
 * What every learner-portal server action returns, so the client can show one
 * toast per mutation: `{ ok: true, message? }` on success, `{ ok: false, error }`
 * otherwise. `fields` has the first validation message per form field, and
 * `login` asks the client to open the sign-in dialog (no session, or it expired).
 */
export type Ok<T extends object = object> = { ok: true; message?: string } & T;
export type Failure = { ok: false; error: string; fields?: Record<string, string>; login?: boolean; expired?: boolean };
export type Result<T extends object = object> = Ok<T> | Failure;

/** Turns any thrown error into a failure with a message people can act on. */
export async function failure(error: unknown): Promise<Failure> {
  const t = await getT();
  if (error instanceof ApiError) {
    if (error.status === 401) return { ok: false, error: t("Your session has expired. Please sign in again."), login: true, expired: true };
    const fields = Object.fromEntries(
      Object.entries(error.errors ?? {})
        .filter(([, messages]) => messages?.[0])
        .map(([field, messages]) => [field, messages[0]!]),
    );
    const first = Object.values(fields)[0];
    return { ok: false, error: first ?? error.message ?? t("Something went wrong. Please try again."), ...(first ? { fields } : {}) };
  }
  return { ok: false, error: t("We couldn't reach the server. Please try again.") };
}

/** `{ ok: false, login: true }` for actions that need an account. */
export async function needsLogin(): Promise<Failure> {
  return { ok: false, error: (await getT())("Please sign in to continue."), login: true };
}
