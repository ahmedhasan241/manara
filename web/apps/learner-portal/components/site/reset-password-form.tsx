"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Alert, Button, Field, Input, toast, useT } from "@educloud/ui";
import { resetPassword, type AuthState } from "@/app/site-actions";
import { PasswordInput } from "@/components/password-input";
import { AuthLink } from "./auth-dialog";

export function ResetPasswordForm({ token, email }: { token: string; email: string }) {
  const t = useT();
  const [state, action, pending] = useActionState<AuthState, FormData>(resetPassword, { step: "password" });
  const fields = state.fields ?? {};
  const toasted = useRef(false);
  useEffect(() => {
    if (state.done && !toasted.current) {
      toasted.current = true;
      toast.success(t("Password saved. You can sign in now."));
    }
  }, [state.done, t]);

  if (state.done) {
    return (
      <div className="mt-6 space-y-4 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success/10 text-success">
          <CheckCircle2 className="h-8 w-8" />
        </span>
        {state.info && <p className="text-sm text-ink-muted">{state.info}</p>}
        <AuthLink mode="login" next="/my-learning" className="block text-center font-semibold text-brand-600 hover:underline dark:text-brand-300">
          {t("Sign in now")}
        </AuthLink>
      </div>
    );
  }

  const general = state.error && !Object.values(fields).includes(state.error) ? state.error : null;

  return (
    <form
      onSubmit={(e) => {
        // By hand, so a failed attempt keeps what was typed.
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="mt-6 space-y-4"
    >
      <input type="hidden" name="token" value={token} />
      <Field label={t("Email")} htmlFor="reset-email" error={fields.email}>
        <Input id="reset-email" name="email" type="email" defaultValue={email} required autoComplete="username" className="h-12 rounded-full px-5" aria-invalid={!!fields.email || undefined} />
      </Field>
      <Field label={t("New password")} htmlFor="reset-password" error={fields.password ?? fields.token} hint={fields.password ? undefined : t("At least 8 characters, with letters and numbers.")}>
        <PasswordInput id="reset-password" name="password" autoComplete="new-password" strength className="h-12 rounded-full px-5" invalid={!!fields.password} />
      </Field>
      <Field label={t("Repeat password")} htmlFor="reset-confirm" error={fields.password_confirmation}>
        <PasswordInput id="reset-confirm" name="password_confirmation" autoComplete="new-password" className="h-12 rounded-full px-5" invalid={!!fields.password_confirmation} />
      </Field>
      {general && <Alert>{general}</Alert>}
      <Button type="submit" size="lg" className="w-full !rounded-full" disabled={pending || !token} aria-busy={pending || undefined}>
        {pending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" /> {t("Saving…")}
          </>
        ) : (
          t("Save password")
        )}
      </Button>
      {!token && <p className="text-center text-xs text-danger">{t("This link is missing its token. Ask for a new reset email.")}</p>}
    </form>
  );
}
