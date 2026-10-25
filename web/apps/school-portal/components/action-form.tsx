"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { Button, cn, useStateToast, useT } from "@educloud/ui";
import type { ActionState } from "@/app/builder-actions";

/**
 * A form bound to a server action that returns a result ({ ok, message } or
 * { ok: false, error }): the outcome shows as a toast, and the submit button
 * is disabled while it runs.
 */
export function ActionForm({
  action,
  children,
  submit,
  className,
  submitClassName,
  resetOnSuccess = false,
  success,
  onSuccess,
}: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  children: ReactNode;
  submit: ReactNode;
  className?: string;
  submitClassName?: string;
  resetOnSuccess?: boolean;
  /** Success text when the action doesn't return its own message. */
  success?: string;
  /** Called after each success (e.g. to close a dialog). */
  onSuccess?: () => void;
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState(async (prev: ActionState, form: FormData): Promise<ActionState> => ({ ...(await action(prev, form)), at: Date.now() }), {} as ActionState);
  useStateToast(state, { success });
  const done = useRef(onSuccess);
  done.current = onSuccess;
  useEffect(() => {
    if (state.ok) done.current?.();
  }, [state]);

  return (
    // A new key after each success clears the fields for the next entry.
    <form action={formAction} className={cn("space-y-4", className)} key={resetOnSuccess && state.ok ? state.at : undefined}>
      {children}
      <Button type="submit" disabled={pending} className={submitClassName}>
        {pending ? t("Saving…") : submit}
      </Button>
    </form>
  );
}
