"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, Info, Loader2, MailCheck } from "lucide-react";
import {
  Alert,
  ArchPhoto,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Field,
  Input,
  LocationFields,
  Logo,
  ToggleGroup,
  ToggleGroupItem,
  firstName,
  startPageLoad,
  toast,
  useT,
} from "@educloud/ui";
import { dialogForgot, dialogLogin, dialogRegister, type AuthState } from "@/app/site-actions";
import { PasswordInput } from "@/components/password-input";

export type AuthMode = "login" | "register" | "forgot";

/** Builds a link that opens the dialog over the current page. */
export function useAuthHref() {
  const pathname = usePathname();
  const params = useSearchParams();
  return (mode: AuthMode, next?: string) => {
    const query = new URLSearchParams(params.toString());
    query.set("auth", mode);
    query.set("next", next ?? `${pathname}${params.size ? `?${stripAuth(params)}` : ""}`);
    return `${pathname}?${query}`;
  };
}

function stripAuth(params: URLSearchParams) {
  const copy = new URLSearchParams(params.toString());
  copy.delete("auth");
  copy.delete("next");
  copy.delete("notice");
  return copy.toString();
}

export function AuthLink({ mode = "login", next, className, children }: { mode?: AuthMode; next?: string; className?: string; children: React.ReactNode }) {
  const href = useAuthHref();
  return (
    <Link href={href(mode, next)} scroll={false} className={className}>
      {children}
    </Link>
  );
}

/**
 * The sign-in / sign-up dialog for the whole website. Rendered once in the
 * site layout; opened by the `auth` search param so any link can open it and
 * it survives reloads.
 */
export function AuthDialog() {
  const t = useT();
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const mode = params.get("auth") as AuthMode | null;
  const open = mode === "login" || mode === "register" || mode === "forgot";
  const notice = params.get("notice");

  function close(done = false) {
    const rest = stripAuth(params);
    const next = params.get("next");
    // After signing in, go where the person was heading (with the page loader meanwhile).
    if (done) startPageLoad();
    router.replace(done && next?.startsWith("/") ? next : `${pathname}${rest ? `?${rest}` : ""}`, { scroll: false });
    if (done) router.refresh();
  }

  function switchTo(next: AuthMode) {
    const query = new URLSearchParams(params.toString());
    query.set("auth", next);
    query.delete("notice");
    router.replace(`${pathname}?${query}`, { scroll: false });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto p-0 sm:w-[min(56rem,calc(100vw-2rem))] sm:p-0 md:grid md:grid-cols-[1fr_1.1fr]" aria-describedby={undefined}>
        {/* Photo side */}
        <div className="band-peach relative hidden flex-col justify-between gap-6 p-8 md:flex">
          <Logo className="text-lg" />
          <ArchPhoto photo={mode === "register" ? "studentNotebook" : "onlineLearning"} alt="" className="max-w-[13rem]" />
          <div>
            <p className="font-display text-xl font-semibold leading-tight">{mode === "register" ? t("Start learning today.") : t("Welcome back!")}</p>
            <p className="mt-2 text-sm text-ink-muted">{t("Courses from teachers, doctors, schools and universities, all in one place.")}</p>
          </div>
        </div>

        <div className="p-5 sm:p-8">
          <div className="mb-4 flex justify-center md:hidden">
            <Logo />
          </div>
          <DialogTitle className="px-8 text-center text-xl">{mode === "forgot" ? t("Reset your password") : t("Welcome to Manara")}</DialogTitle>
          {mode !== "forgot" && (
            <ToggleGroup
              type="single"
              value={mode ?? "login"}
              onValueChange={(value) => value && switchTo(value as AuthMode)}
              className="mx-auto mt-5 grid max-w-xs grid-cols-2 gap-1 rounded-xl bg-surface-3 p-1"
              aria-label={t("Sign in")}
            >
              <ToggleGroupItem value="login" className="h-9">{t("Login")}</ToggleGroupItem>
              <ToggleGroupItem value="register" className="h-9">{t("Register")}</ToggleGroupItem>
            </ToggleGroup>
          )}
          {notice && (
            <p role="status" className="mt-4 flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2 text-sm font-medium text-warning">
              <Info className="mt-0.5 h-4 w-4 shrink-0" /> <span>{notice}</span>
            </p>
          )}

          <div className="mt-5">
            {mode === "login" && <LoginPanel onDone={() => close(true)} onForgot={() => switchTo("forgot")} />}
            {mode === "register" && <RegisterPanel onDone={() => close(true)} />}
            {mode === "forgot" && <ForgotPanel onBack={() => switchTo("login")} />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const pill = "h-10";

function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  const t = useT();
  return (
    <Button type="submit" size="lg" className="group w-full !rounded-full" disabled={pending} aria-busy={pending || undefined}>
      {pending ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> <span className="sr-only">{t("Working")}</span>
        </>
      ) : (
        children
      )}
    </Button>
  );
}

/** Runs `onDone` once when the action reports success (and shows its toast). */
function useDone(state: AuthState, onDone: () => void, toastText: (state: AuthState) => string) {
  const fired = useRef(false);
  useEffect(() => {
    if (state.done && !fired.current) {
      fired.current = true;
      toast.success(toastText(state));
      onDone();
    }
    // toastText is a fresh closure each render; only the state matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, onDone]);
}

/** Shown once signed in, while the next page loads, so the form doesn’t sit there empty. */
function DonePanel({ title }: { title: string }) {
  const t = useT();
  return (
    <div role="status" className="flex flex-col items-center gap-3 py-10 text-center">
      <span className="grid h-14 w-14 animate-pop-in place-items-center rounded-full bg-success/10 text-success">
        <CheckCircle2 className="h-8 w-8" />
      </span>
      <p className="font-display text-lg font-semibold">{title}</p>
      <p className="inline-flex items-center gap-2 text-sm text-ink-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> {t("Loading…")}
      </p>
    </div>
  );
}

function LoginPanel({ onDone, onForgot }: { onDone: () => void; onForgot: () => void }) {
  const t = useT();
  const [state, action, pending] = useActionState<AuthState, FormData>(dialogLogin, { step: "password" });
  useDone(state, onDone, (s) => (s.name ? t("Welcome back, {name}!", { name: firstName(s.name) }) : t("Welcome back!")));
  if (state.done) return <DonePanel title={state.name ? t("Welcome back, {name}!", { name: firstName(state.name) }) : t("Welcome back!")} />;

  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert>{state.error}</Alert>}
      {state.step === "password" ? (
        <>
          <Field label={t("Email address")} htmlFor="auth-email">
            <Input id="auth-email" name="email" type="email" autoComplete="username" required autoFocus defaultValue={state.email} placeholder={t("you@example.com")} className={pill} />
          </Field>
          <Field label={t("Password")} htmlFor="auth-password">
            <PasswordInput id="auth-password" name="password" autoComplete="current-password" className={pill} invalid={!!state.error} />
          </Field>
          <div className="text-end">
            <button type="button" onClick={onForgot} className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-300">
              {t("Forgot password?")}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-center text-sm text-ink-muted">{t("Two-step verification is on for {email}.", { email: state.email ?? "" })}</p>
          <input type="hidden" name="challenge" value={state.challenge} />
          <Field label={t("Verification code")} htmlFor="auth-code" hint={t("From your authenticator app, or a recovery code.")}>
            <Input id="auth-code" name="code" inputMode="numeric" autoComplete="one-time-code" required autoFocus maxLength={32} className="h-12 text-center font-mono text-xl tracking-[0.5em]" placeholder="••••••" aria-invalid={!!state.error || undefined} />
          </Field>
        </>
      )}
      <Submit pending={pending}>
        {state.step === "password" ? t("Login") : t("Verify")} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:rotate-180" />
      </Submit>
    </form>
  );
}

function RegisterPanel({ onDone }: { onDone: () => void }) {
  const t = useT();
  const [state, action, pending] = useActionState<AuthState, FormData>(dialogRegister, { step: "password" });
  useDone(state, onDone, () => t("Account created — welcome to Manara!"));
  if (state.done) return <DonePanel title={t("Account created — welcome to Manara!")} />;
  const fields = state.fields ?? {};
  const values = state.values ?? {};
  // Only errors without a field of their own go in the banner.
  const general = state.error && !Object.values(fields).includes(state.error) ? state.error : null;

  return (
    <form
      // Submitted by hand so a failed attempt keeps what was typed (form actions reset the form).
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="space-y-4"
    >
      {general && <Alert>{general}</Alert>}
      <Field label={t("Full name")} htmlFor="reg-name" error={fields.name}>
        <Input id="reg-name" name="name" autoComplete="name" required autoFocus defaultValue={values.name} placeholder={t("Your name")} className={pill} aria-invalid={!!fields.name || undefined} />
      </Field>
      <Field label={t("Email address")} htmlFor="reg-email" error={fields.email}>
        <Input id="reg-email" name="email" type="email" autoComplete="email" required defaultValue={values.email} placeholder={t("you@example.com")} className={pill} aria-invalid={!!fields.email || undefined} />
      </Field>
      <Field label={t("Password")} htmlFor="reg-password" error={fields.password} hint={fields.password ? undefined : t("At least 8 characters, with letters and numbers.")}>
        <PasswordInput id="reg-password" name="password" autoComplete="new-password" className={pill} strength invalid={!!fields.password} />
      </Field>
      <LocationFields idPrefix="reg" required compact defaultValue={values.country || values.city ? { country: values.country, city: values.city, area: values.area } : null} errors={{ country: fields.country, city: fields.city, area: fields.area }} />
      <Submit pending={pending}>
        {t("Create account")}{" "}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:rotate-180" />
      </Submit>
    </form>
  );
}

function ForgotPanel({ onBack }: { onBack: () => void }) {
  const t = useT();
  const [state, action, pending] = useActionState<AuthState, FormData>(dialogForgot, { step: "password" });
  const shown = useRef<AuthState | null>(null);
  useEffect(() => {
    if (state.done && shown.current !== state) {
      shown.current = state;
      toast.success(t("Password reset link sent."), { description: state.email ? t("Check {email} for a link to set a new password.", { email: state.email }) : undefined });
    }
  }, [state, t]);

  if (state.done) {
    return (
      <div className="space-y-4 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success/10 text-success">
          <MailCheck className="h-7 w-7" />
        </span>
        <p className="font-display text-lg font-semibold">{t("Check your inbox")}</p>
        <p className="text-sm text-ink-muted">{state.info || t("Check {email} for a link to set a new password.", { email: state.email ?? "" })}</p>
        <button type="button" onClick={onBack} className="block w-full text-center text-sm font-semibold text-brand-600 hover:underline dark:text-brand-300">
          {t("Back to login")}
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <p className="text-center text-sm text-ink-muted">{t("Enter your email and we'll send you a link to set a new password.")}</p>
      {state.error && !state.fields?.email && <Alert>{state.error}</Alert>}
      <Field label={t("Email address")} htmlFor="forgot-email" error={state.fields?.email}>
        <Input id="forgot-email" name="email" type="email" autoComplete="email" required autoFocus defaultValue={state.email} className={pill} aria-invalid={!!state.fields?.email || undefined} />
      </Field>
      <Submit pending={pending}>{t("Send reset link")}</Submit>
      <button type="button" onClick={onBack} className="block w-full text-center text-sm font-semibold text-brand-600 hover:underline dark:text-brand-300">
        {t("Back to login")}
      </button>
    </form>
  );
}
