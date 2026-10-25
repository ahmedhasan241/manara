"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast, useT } from "@educloud/ui";

/** The result shape of this portal's server actions (see lib/action-result.ts). */
export type MutationResult = { ok?: boolean; error?: string | null; message?: string | null; login?: boolean; expired?: boolean; fields?: Record<string, string> } | null | undefined | void;

/** Next's redirect() reaches the client as a rejected promise with this digest. */
export function isRedirectError(error: unknown): error is { digest: string } {
  return !!error && typeof error === "object" && "digest" in error && String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT");
}

/** Where a redirect error is taking the page ("/learn/x"), if known. */
export function redirectTarget(error: unknown): string | null {
  if (!isRedirectError(error)) return null;
  return error.digest.split(";")[2] ?? null;
}

function failed(result: MutationResult): result is { ok?: boolean; error?: string | null; login?: boolean; expired?: boolean } {
  return !!result && typeof result === "object" && (result.ok === false || (typeof result.error === "string" && result.error !== ""));
}

type Text<R> = string | null | ((result: R) => string | null);

/** The failure branch of a result union (or the whole result when it has none). */
type FailureOf<R> = [Extract<NonNullable<R>, { ok: false }>] extends [never] ? NonNullable<R> : Extract<NonNullable<R>, { ok: false }>;

export interface MutationOptions<R> {
  /** Toast while the action runs; it turns into the success or error toast. */
  loading?: string;
  /** Success toast (falls back to the result's `message`). `null` keeps success silent. */
  success?: Text<R>;
  /** Toast when the action finishes by redirecting (enrol, pay…), given the target path. */
  redirected?: string | ((target: string) => string | null);
  /** Show the error inline instead of as a toast. */
  quietError?: boolean;
  onSuccess?: (result: R) => void;
  onError?: (result: FailureOf<R>) => void;
}

/**
 * Runs one server action with the toasts every mutation in this portal gets:
 * a loading toast (optional), then success or the server's error. A redirect
 * keeps its success toast (the toaster lives in the root layout, so it stays
 * on screen on the next page). `{ login: true }` opens sign-in and comes back.
 *
 * `const { run, pending } = useMutation({ dialog: true });`
 * `run(() => removeFromCart(id), { success: t("Removed from cart.") })`
 */
export function useMutation({ dialog = false }: { dialog?: boolean } = {}) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  const signIn = useCallback(
    (notice?: string | null) => {
      const here = `${pathname}${params.size ? `?${params}` : ""}`;
      if (dialog) {
        const query = new URLSearchParams(params.toString());
        query.set("auth", "login");
        query.set("next", here);
        if (notice) query.set("notice", notice);
        router.push(`${pathname}?${query}`, { scroll: false });
      } else {
        router.push(`/login?${new URLSearchParams({ next: here, ...(notice ? { expired: "1" } : {}) })}`);
      }
    },
    [dialog, params, pathname, router],
  );

  const run = useCallback(
    <R extends MutationResult>(action: () => Promise<R>, options: MutationOptions<R> = {}) => {
      start(async () => {
        const id = options.loading ? toast.loading(options.loading) : undefined;
        let result: R;
        try {
          result = await action();
        } catch (error) {
          if (isRedirectError(error)) {
            const target = redirectTarget(error) ?? "";
            const text = typeof options.redirected === "function" ? options.redirected(target) : options.redirected;
            if (text) toast.success(text, { id });
            else if (id !== undefined) toast.dismiss(id);
            throw error;
          }
          toast.error(t("We couldn't reach the server. Please try again."), { id });
          return;
        }

        if (failed(result)) {
          if (result.login) {
            if (id !== undefined) toast.dismiss(id);
            // "Please sign in" (no session yet) opens the dialog quietly; an expired session says so.
            signIn(result.expired ? result.error : null);
            options.onError?.(result as FailureOf<R>);
            return;
          }
          if (options.quietError) {
            if (id !== undefined) toast.dismiss(id);
          } else toast.error(result.error || t("Something went wrong. Please try again."), { id });
          options.onError?.(result as FailureOf<R>);
          return;
        }

        const message = (result as { message?: unknown } | null | undefined)?.message;
        const own = typeof message === "string" && message ? message : null;
        const text = options.success === null ? null : typeof options.success === "function" ? options.success(result) : (own ?? options.success ?? null);
        if (text) toast.success(text, { id });
        else if (id !== undefined) toast.dismiss(id);
        options.onSuccess?.(result);
      });
    },
    [signIn, t],
  );

  return { run, pending, signIn };
}
