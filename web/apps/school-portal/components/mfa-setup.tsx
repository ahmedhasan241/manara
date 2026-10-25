"use client";

import { useState, useTransition } from "react";
import { Alert, Button, Field, Input, useActionToast, useT } from "@educloud/ui";
import { confirmMfa, startMfa } from "@/app/actions";

export function MfaSetup({ enabled }: { enabled: boolean }) {
  const t = useT();
  const [setup, setSetup] = useState<{ secret: string; otpauth_uri: string } | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const notify = useActionToast();
  const [pending, start] = useTransition();

  if (codes) {
    return (
      <div className="space-y-3">
        <Alert tone="success">{t("Two-factor authentication is on.")}</Alert>
        <p className="text-sm">{t("Save these recovery codes somewhere safe. Each one works once if you lose your phone.")}</p>
        <ul className="grid grid-cols-2 gap-2 rounded-lg bg-surface-2 p-3 font-mono text-sm">
          {codes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (enabled) {
    return <Alert tone="success">{t("Two-factor authentication is on for your account.")}</Alert>;
  }

  if (!setup) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink-muted">{t("Protect your account with a code from an authenticator app (Google Authenticator, Authy, 1Password…).")}</p>
        <Button disabled={pending} onClick={() =>
            start(async () => {
              const result = await startMfa();
              if (result.ok && result.data) setSetup(result.data);
              else notify(result);
            })
          }>
          {pending ? t("Preparing…") : t("Turn on two-factor authentication")}
        </Button>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const code = String(new FormData(e.currentTarget).get("code"));
        start(async () => {
          const result = await confirmMfa(code);
          if (!result.ok) {
            // Shown under the code field.
            setError(result.error);
          } else {
            setError(null);
            notify(result);
            setCodes(result.data ?? []);
          }
        });
      }}
    >
      <ol className="list-decimal space-y-2 ps-5 text-sm">
        <li>
          {t("Open your authenticator app and add an account with this key:")}
          <code className="mt-1 block break-all rounded bg-surface-2 p-2 font-mono">{setup.secret}</code>
          <a className="text-brand-600 underline" href={setup.otpauth_uri}>
            {t("Or open it directly on this device")}
          </a>
        </li>
        <li>{t("Enter the 6-digit code the app shows.")}</li>
      </ol>
      {error && <Alert>{error}</Alert>}
      <Field label={t("Code")} htmlFor="mfa-code">
        <Input id="mfa-code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required className="max-w-40" />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? t("Verifying…") : t("Verify and turn on")}
      </Button>
    </form>
  );
}
