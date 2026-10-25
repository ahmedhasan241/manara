"use client";

import { useActionState, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Eye, EyeOff, GraduationCap, LineChart, ShieldCheck, Sparkles, Video } from "lucide-react";
import { Alert, Button, Field, Input, Logo } from "./components";
import { ArchPhoto } from "./imagery";
import { MotionProvider } from "./motion";
import { AppearanceMenu } from "./theme";
import { useT } from "./i18n-provider";

export interface LoginState {
  step: "password" | "mfa";
  challenge?: string;
  error?: string;
  email?: string;
}

/**
 * Two-step sign-in (password, then authenticator or recovery code) on a split
 * screen: an animated showcase on the left, the form on the right.
 */
export function LoginForm({
  action,
  title,
  subtitle = "Welcome back. Sign in to continue.",
  defaultEmail,
  forgotPasswordHref,
}: {
  action: (state: LoginState, form: FormData) => Promise<LoginState>;
  title: string;
  subtitle?: string;
  defaultEmail?: string;
  /** Where "Forgot password?" leads (the reset flow lives in the learner portal). */
  forgotPasswordHref?: string;
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState(action, { step: "password", email: defaultEmail });
  const [showPassword, setShowPassword] = useState(false);

  return (
    <MotionProvider>
      <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
        <Showcase />

        <div className="relative flex items-center justify-center bg-surface px-5 py-12">
          <div className="absolute end-5 top-5">
            <AppearanceMenu />
          </div>
          <motion.div
            className="w-full max-w-md"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-8 lg:hidden">
              <Logo className="text-xl" />
            </div>
            <h1 className="text-center font-display text-3xl font-bold tracking-tight">{title}</h1>
            <p className="mt-2 text-center text-ink-muted">{state.step === "mfa" ? t("One more step to keep your account safe.") : subtitle}</p>

            {/* Step pill, like the Login / Register switch in the Campus design */}
            <div className="mx-auto mt-8 grid max-w-xs grid-cols-2 rounded-full bg-brand-500/10 p-1.5 text-sm font-semibold" aria-hidden>
              {(["password", "mfa"] as const).map((step) => (
                <span key={step} className="relative grid h-10 place-items-center rounded-full">
                  {state.step === step && <motion.span layoutId="login-step" className="fill-brand absolute inset-0 rounded-full shadow-[var(--shadow-soft)]" />}
                  <span className={`relative ${state.step === step ? "text-white" : "text-brand-700 dark:text-brand-200"}`}>{step === "password" ? t("Sign in") : t("Verify")}</span>
                </span>
              ))}
            </div>

            <form action={formAction} className="mt-8">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={state.step}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-5"
                >
                  {state.error && <Alert>{state.error}</Alert>}

                  {state.step === "password" ? (
                    <>
                      <Field label={t("Email")} htmlFor="email">
                        <Input id="email" name="email" type="email" autoComplete="username" required defaultValue={state.email} autoFocus placeholder={t("you@school.edu")} className="h-12 rounded-full px-5" />
                      </Field>
                      <Field label={t("Password")} htmlFor="password">
                        <div className="relative">
                          <Input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required className="h-12 rounded-full px-5 pe-12" />
                          <button
                            type="button"
                            onClick={() => setShowPassword((s) => !s)}
                            className="absolute inset-y-0 end-1 grid w-11 place-items-center text-ink-muted hover:text-ink"
                            aria-label={showPassword ? t("Hide password") : t("Show password")}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </Field>
                      {forgotPasswordHref && (
                        <p className="-mt-1 text-end text-sm">
                          <a href={forgotPasswordHref} className="font-medium text-brand-700 hover:underline dark:text-brand-300">
                            {t("Forgot password?")}
                          </a>
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <input type="hidden" name="challenge" value={state.challenge} />
                      <div className="flex items-center gap-3 rounded-2xl bg-brand-500/10 p-4 text-sm text-brand-800 dark:text-brand-100">
                        <ShieldCheck className="h-5 w-5 shrink-0" />
                        {t("Enter the 6-digit code from your authenticator app, or one of your recovery codes.")}
                      </div>
                      <Field label={t("Verification code")} htmlFor="code">
                        <Input
                          id="code"
                          name="code"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          required
                          autoFocus
                          maxLength={32}
                          className="h-14 text-center font-mono text-2xl tracking-[0.5em]"
                          placeholder="••••••"
                        />
                      </Field>
                    </>
                  )}

                  <Button type="submit" size="lg" className="group w-full !rounded-full" disabled={pending}>
                    {pending ? (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-label={t("Signing in")} />
                    ) : (
                      <>
                        {state.step === "password" ? t("Sign in") : t("Verify and continue")}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
                      </>
                    )}
                  </Button>
                </motion.div>
              </AnimatePresence>
            </form>

            <p className="mt-8 flex items-center justify-center gap-2 text-xs text-ink-muted">
              <ShieldCheck className="h-3.5 w-3.5" /> {t("Protected with two-factor sign-in and end-to-end encrypted messages.")}
            </p>
          </motion.div>
        </div>
      </div>
    </MotionProvider>
  );
}

const floating = (t: ReturnType<typeof useT>) => [
  { icon: Video, title: t("Live now: {title}", { title: "Calculus II" }), body: t("{count} joined", { count: 32 }), className: "-start-8 top-[10%]", delay: 0.3, tone: "bg-live-500" },
  { icon: GraduationCap, title: t("Grade posted"), body: t("Quiz 4 · 18/20"), className: "-end-8 top-[44%]", delay: 0.5, tone: "fill-brand" },
  { icon: LineChart, title: t("Attendance"), body: t("96% this week"), className: "-start-4 bottom-[4%]", delay: 0.7, tone: "fill-brand" },
];

/** The login art: a soft peach panel with a student portrait and a few live updates floating by. */
function Showcase() {
  const t = useT();
  return (
    <div className="relative hidden bg-surface-2 p-6 lg:block">
      <div className="band-peach relative flex h-full flex-col justify-between overflow-hidden rounded-[2.25rem] p-10 shadow-[var(--shadow-soft)]">
        <Logo className="relative text-xl" />

        <div className="relative mx-auto my-6 w-full max-w-sm">
          <ArchPhoto photo="student" alt="" className="max-w-[18rem]" />
          {floating(t).map(({ icon: Icon, title, body, className, delay, tone }) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className={`absolute ${className}`}
            >
              <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-ink shadow-[var(--shadow-lift)]">
                <span className={`grid h-10 w-10 place-items-center rounded-xl text-white ${tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-heading">{title}</p>
                  <p className="text-xs text-ink-muted">{body}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div className="relative max-w-md" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}>
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-brand-700 shadow-[var(--shadow-soft)] dark:text-brand-300">
            <Sparkles className="h-3.5 w-3.5" /> {t("Teaching, beautifully organised")}
          </p>
          <h2 className="font-display text-3xl font-bold leading-tight">{t("Classes, grades and live lectures, all in one place.")}</h2>
          <p className="mt-3 text-ink-muted">{t("Join lessons from anywhere, catch up with recordings, and keep everyone in the loop.")}</p>
        </motion.div>
      </div>
    </div>
  );
}
