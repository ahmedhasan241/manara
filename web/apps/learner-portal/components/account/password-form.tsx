"use client";

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Alert, Button, Field, useT } from "@educloud/ui";
import { changePassword } from "@/app/actions";
import { PasswordInput } from "@/components/password-input";
import { useMutation } from "@/components/use-mutation";

/** Current, new and repeated password. Other devices are signed out afterwards. */
export function PasswordForm() {
  const t = useT();
  const { run, pending } = useMutation();
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  // Bumped after a change so the fields (and the strength hint) start empty again.
  const [round, setRound] = useState(0);
  const general = error && !Object.values(fields).includes(error) ? error : null;

  return (
    <form
      key={round}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setFields({});
        setError(null);
        run(() => changePassword(data), {
          loading: t("Changing your password…"),
          success: t("Password changed."),
          onSuccess: () => setRound((n) => n + 1),
          onError: (result) => {
            setFields(result.fields ?? {});
            setError(result.error ?? null);
          },
        });
      }}
      className="space-y-4"
    >
      {general && <Alert>{general}</Alert>}
      <Field label={t("Current password")} htmlFor="pw-current" error={fields.current_password}>
        <PasswordInput id="pw-current" name="current_password" autoComplete="current-password" invalid={!!fields.current_password} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("New password")} htmlFor="pw-new" error={fields.password} hint={fields.password ? undefined : t("At least 8 characters, with letters and numbers.")}>
          <PasswordInput id="pw-new" name="password" autoComplete="new-password" strength invalid={!!fields.password} />
        </Field>
        <Field label={t("Repeat new password")} htmlFor="pw-confirm" error={fields.password_confirmation}>
          <PasswordInput id="pw-confirm" name="password_confirmation" autoComplete="new-password" invalid={!!fields.password_confirmation} />
        </Field>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-muted">{t("Changing it signs you out on your other devices.")}</p>
        <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} {t("Change password")}
        </Button>
      </div>
    </form>
  );
}
