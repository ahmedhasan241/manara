"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useT } from "./i18n-provider";

/**
 * One way to report what happened after every create / update / delete:
 * a success toast with a clear message, or an error toast with the server's
 * reason. Works with the result shapes our server actions return.
 */

/** The common server-action result. `message` overrides the caller's success text. */
export type ActionResult<T = unknown> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; errors?: Record<string, string[]> };

type AnyResult = { ok?: boolean; error?: string | null; message?: string | null } | null | undefined | void;

interface ToastText {
  /** Shown on success. Defaults to the result's `message`, then "Done". */
  success?: string;
  /** Shown when the result has no error text of its own. */
  error?: string;
  /** Extra line under the success title. */
  description?: string;
}

function messageOf(result: unknown): string | null {
  return result && typeof result === "object" && "message" in result && typeof result.message === "string" ? result.message : null;
}

function failed(result: AnyResult): result is { error?: string | null; ok?: boolean } {
  return !!result && typeof result === "object" && (result.ok === false || (typeof result.error === "string" && result.error !== ""));
}

/**
 * `const notify = useActionToast();`
 * `if (notify(await saveProfile(form), { success: t("Profile saved.") })) close();`
 * `await notify.run(() => deleteCourse(id), { loading: t("Deleting…"), success: t("Course deleted.") });`
 */
export function useActionToast() {
  const t = useT();
  const fallbackError = t("Something went wrong. Please try again.");

  const notify = useCallback(
    (result: AnyResult, text: ToastText = {}): boolean => {
      if (failed(result)) {
        toast.error(result.error || text.error || fallbackError);
        return false;
      }
      const message = messageOf(result) || text.success || t("Done");
      toast.success(message, text.description ? { description: text.description } : undefined);
      return true;
    },
    [t, fallbackError],
  );

  const run = useCallback(
    async <R extends AnyResult>(action: () => Promise<R>, text: ToastText & { loading?: string } = {}): Promise<R | undefined> => {
      const id = text.loading ? toast.loading(text.loading) : undefined;
      try {
        const result = await action();
        if (failed(result)) {
          toast.error(result.error || text.error || fallbackError, { id });
        } else {
          const message = messageOf(result) || text.success || t("Done");
          toast.success(message, { id, ...(text.description ? { description: text.description } : {}) });
        }
        return result;
      } catch (error) {
        // Redirects thrown by server actions are not failures.
        if (error && typeof error === "object" && "digest" in error && String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")) {
          if (id !== undefined) toast.dismiss(id);
          throw error;
        }
        toast.error(text.error || fallbackError, { id });
        return undefined;
      }
    },
    [t, fallbackError],
  );

  return Object.assign(notify, { run });
}

/**
 * For forms using `useActionState`: shows a toast each time the action
 * returns a new state with `ok`, `error` or `message`.
 */
export function useStateToast(state: AnyResult, text: ToastText = {}) {
  const notify = useActionToast();
  const last = useRef(state);
  useEffect(() => {
    if (state === last.current) return;
    last.current = state;
    if (!state || typeof state !== "object") return;
    if (state.ok === undefined && !state.error && !state.message) return;
    notify(state, text);
    // Only react to new states, not to changed labels.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}
