"use client";

import { useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useActionToast, type ActionResult } from "@educloud/ui";
import { UpgradeNotice, upgradeCode } from "./upgrade-notice";

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
  onSuccess,
  redirectTo,
  children,
}: {
  /** Page to open after a success when the result has no href of its own (e.g. back to the record after editing). */
  redirectTo?: string;
  /** Called after each success (e.g. to clear state the form doesn't own). */
  onSuccess?: () => void;
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
  // Out of seats or add-ons: the reason stays on screen with a link to the package.
  const [upgrade, setUpgrade] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    start(async () => {
      const result = await notify.run(() => action(data), { success, loading });
      setUpgrade(result && result.ok === false && upgradeCode(result) ? result.error : null);
      if (!result || result.ok === false) return;
      if (resetOnSuccess) form.current?.reset();
      onSuccess?.();
      const href = result.data && typeof result.data === "object" && "href" in result.data ? result.data.href : undefined;
      if (typeof href === "string") router.push(href);
      else if (redirectTo) router.push(redirectTo);
    });
  }

  return (
    <form ref={form} onSubmit={submit} className={className} aria-busy={pending || undefined}>
      <fieldset disabled={pending} className="contents">
        {upgrade && <UpgradeNotice message={upgrade} className="mb-4" />}
        {children}
      </fieldset>
    </form>
  );
}
