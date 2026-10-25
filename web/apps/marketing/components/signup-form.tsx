"use client";

import { useActionState, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button, Card, Field, Input, LocationFields, Select, buttonClass, useStateToast, useT } from "@educloud/ui";
import { signup, type SignupState } from "@/app/signup/actions";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

const TYPES = ["teacher", "school", "university"];

/** Workspace sign-up: who you are, where you are, and your workspace's name and web address. */
export function SignupForm({ plan, type }: { plan?: string; type?: string }) {
  const t = useT();
  const [state, action, pending] = useActionState<SignupState, FormData>(signup, {});
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const rootDomain = process.env.NEXT_PUBLIC_TENANT_ROOT_DOMAIN ?? "educloud.test";

  // One toast per attempt: success, or the first problem (fields are also marked inline).
  useStateToast(state);

  if (state.done) {
    return (
      <Card className="p-8 text-center">
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <h2 className="text-xl font-semibold">{t("Your workspace is ready")}</h2>
        <p className="mt-2 text-ink-muted">{t("Sign in as {email} to add your first course.", { email: state.done.email })}</p>
        <a href={state.done.portalUrl} className={`${buttonClass("primary", "lg")} mt-6`}>
          {t("Go to my dashboard")} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
        </a>
      </Card>
    );
  }

  const e = state.errors ?? {};
  const v = state.values ?? {};
  const workspaceType = v.workspace_type ?? (TYPES.includes(type ?? "") ? type : "school");

  return (
    <Card className="p-5 sm:p-8">
      {/* Re-mounted after each attempt so the fields show what was typed (React resets forms after an action). */}
      <form key={state.attempt ?? 0} action={action} className="space-y-4" noValidate aria-busy={pending || undefined}>
        {plan && <input type="hidden" name="plan" value={plan} />}

        <Field label={t("Your name")} htmlFor="name" error={e.name}>
          <Input id="name" name="name" autoComplete="name" required defaultValue={v.name} aria-invalid={!!e.name || undefined} />
        </Field>
        <Field label={t("Work email")} htmlFor="email" error={e.email}>
          <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={v.email} aria-invalid={!!e.email || undefined} />
        </Field>
        <Field label={t("Password")} htmlFor="password" error={e.password} hint={t("At least 10 characters with upper and lower case letters and a number.")}>
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} aria-invalid={!!e.password || undefined} />
        </Field>

        <LocationFields required compact idPrefix="signup" defaultValue={{ country: v.country ?? "", city: v.city ?? "", area: v.area ?? "" }} errors={{ country: e.country, city: e.city, area: e.area }} />

        <Field label={t("I am a…")} htmlFor="workspace_type" error={e.workspace_type}>
          <Select id="workspace_type" name="workspace_type" defaultValue={workspaceType}>
            <option value="teacher">{t("Teacher, lecturer or doctor (individual)")}</option>
            <option value="school">{t("School")}</option>
            <option value="university">{t("University")}</option>
          </Select>
        </Field>
        <Field label={t("School or workspace name")} htmlFor="workspace_name" error={e.workspace_name}>
          <Input
            id="workspace_name"
            name="workspace_name"
            required
            defaultValue={v.workspace_name}
            aria-invalid={!!e.workspace_name || undefined}
            onChange={(ev) => !slugTouched && setSlug(slugify(ev.target.value))}
          />
        </Field>
        <Field label={t("Web address")} htmlFor="workspace_slug" error={e.workspace_slug} hint={t("Your public site: {address}", { address: `${slug || t("your-school")}.${rootDomain}` })}>
          <Input
            id="workspace_slug"
            name="workspace_slug"
            required
            dir="ltr"
            value={slug}
            aria-invalid={!!e.workspace_slug || undefined}
            onChange={(ev) => {
              setSlugTouched(true);
              setSlug(slugify(ev.target.value));
            }}
          />
        </Field>

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {pending ? t("Creating your workspace…") : t("Create workspace")}
        </Button>
        <p className="text-center text-xs text-ink-muted">{t("By signing up you agree to our terms and privacy policy.")}</p>
      </form>
    </Card>
  );
}
