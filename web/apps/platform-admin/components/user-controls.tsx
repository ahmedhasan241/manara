"use client";

import { useState, useTransition } from "react";
import { Button, ConfirmDialog, Field, Input, useActionToast, useT, type ActionResult } from "@educloud/ui";
import { resetUserMfa, setUserSuspended } from "@/app/actions";

/**
 * Suspend / reactivate and reset two-factor for one user.
 */
export function UserControls({ userId, suspended, mfaEnabled }: { userId: number; suspended: boolean; mfaEnabled: boolean }) {
  const t = useT();
  const [reason, setReason] = useState("");
  const notify = useActionToast();
  const [pending, start] = useTransition();

  function run(action: () => Promise<ActionResult>, success: string) {
    start(async () => {
      if (notify(await action(), { success })) setReason("");
    });
  }

  return (
    <div className="space-y-4">
      {suspended ? (
        <Button disabled={pending} aria-busy={pending || undefined} onClick={() => run(() => setUserSuspended(userId, false), t("Account reactivated."))}>
          {t("Reactivate account")}
        </Button>
      ) : (
        <div className="space-y-3">
          <Field label={t("Reason (shown in the audit log)")} htmlFor="reason">
            <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("e.g. Abuse report #1234")} />
          </Field>
          <ConfirmDialog
            title={t("Suspend this account? They'll be signed out on every device.")}
            confirmLabel={t("Suspend account")}
            onConfirm={() => run(() => setUserSuspended(userId, true, reason || undefined), t("Account suspended and signed out everywhere."))}
          >
            <Button variant="danger" disabled={pending}>
              {t("Suspend account")}
            </Button>
          </ConfirmDialog>
        </div>
      )}
      {mfaEnabled && (
        <div className="border-t border-line pt-4">
          <p className="mb-2 text-sm text-ink-muted">{t("Lost their phone? Turn off two-factor so they can sign in and set it up again.")}</p>
          <ConfirmDialog
            title={t("Turn off two-factor authentication for this user?")}
            confirmLabel={t("Reset two-factor")}
            onConfirm={() => run(() => resetUserMfa(userId), t("Two-factor authentication turned off."))}
          >
            <Button variant="secondary" disabled={pending}>
              {t("Reset two-factor")}
            </Button>
          </ConfirmDialog>
        </div>
      )}
    </div>
  );
}
