"use client";

import { useTransition, type ReactNode } from "react";
import { Button, ConfirmDialog, useActionToast, type ActionResult } from "@educloud/ui";

type ButtonProps = Parameters<typeof Button>[0];

/**
 * A button for server pages that runs one (bound) server action, shows a
 * success or error toast, stays disabled while it runs and, for destructive
 * actions, asks first.
 */
export function ToastButton({
  action,
  success,
  loading,
  confirm,
  children,
  variant = "secondary",
  size = "md",
  className,
  unstyled = false,
  label,
}: {
  action: () => Promise<ActionResult>;
  success?: string;
  loading?: string;
  confirm?: { title: string; description?: string; confirmLabel?: string; tone?: "danger" | "primary" };
  children: ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  /** Render a bare <button> with `className` (icon buttons). */
  unstyled?: boolean;
  /** Accessible name and tooltip (icon buttons). */
  label?: string;
}) {
  const notify = useActionToast();
  const [pending, start] = useTransition();
  const run = () => start(async () => void (await notify.run(action, { success, loading })));

  const button = unstyled ? (
    <button type="button" disabled={pending} className={className} aria-label={label} title={label} aria-busy={pending || undefined} onClick={confirm ? undefined : run}>
      {children}
    </button>
  ) : (
    <Button type="button" variant={variant} size={size} disabled={pending} className={className} aria-label={label} title={label} aria-busy={pending || undefined} onClick={confirm ? undefined : run}>
      {children}
    </Button>
  );

  if (!confirm) return button;
  return (
    <ConfirmDialog title={confirm.title} description={confirm.description} confirmLabel={confirm.confirmLabel} tone={confirm.tone} onConfirm={run}>
      {button}
    </ConfirmDialog>
  );
}
