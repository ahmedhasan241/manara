"use client";

import { useRef, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useActionToast, type ActionResult } from "@educloud/ui";

/**
 * A form (usable from server pages) bound to a server action that returns an
 * ActionResult: shows a success or error toast, disables its controls while
 * the action runs, and can clear itself after a success. When the result
 * carries `data.href`, it opens that page afterwards (e.g. a new course).
 */
export function ToastForm({
  action,
  success,
  loading,
  className,
  resetOnSuccess = false,
  children,
}: {
  action: (form: FormData) => Promise<ActionResult<unknown> | void>;
  success?: string;
  loading?: string;
  className?: string;
  resetOnSuccess?: boolean;
  children: ReactNode;
}) {
  const notify = useActionToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const form = useRef<HTMLFormElement>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    start(async () => {
      const result = await notify.run(() => action(data), { success, loading });
      if (!result || result.ok === false) return;
      if (resetOnSuccess) form.current?.reset();
      const href = result.data && typeof result.data === "object" && "href" in result.data ? result.data.href : undefined;
      if (typeof href === "string") router.push(href);
    });
  }

  return (
    <form ref={form} onSubmit={submit} className={className} aria-busy={pending || undefined}>
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
    </form>
  );
}
