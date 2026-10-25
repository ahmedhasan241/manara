"use client";

import { useActionState, useState } from "react";
import { Alert, Button, Card, Field, Input, Select, buttonClass } from "../components";
import { useT } from "../i18n-provider";
import { signup, type SignupState } from "./signup-action";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

export function SignupForm({ plan, type }: { plan?: string; type?: string }) {
  const t = useT();
  const [state, action, pending] = useActionState<SignupState, FormData>(signup, {});
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const rootDomain = process.env.NEXT_PUBLIC_TENANT_ROOT_DOMAIN ?? "educloud.test";

  if (state.done) {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-xl font-semibold">{t("Your workspace is ready")}</h2>
        <p className="mt-2 text-ink-muted">{t("Sign in as {email} to add your first course.", { email: state.done.email })}</p>
        <a href={state.done.portalUrl} className={`${buttonClass("primary", "lg")} mt-6`}>
          {t("Go to my dashboard")}
        </a>
      </Card>
    );
  }

  const e = state.errors ?? {};

  return (
    <Card className="p-6 sm:p-8">
      <form action={action} className="space-y-4" noValidate>
        {plan && <input type="hidden" name="plan" value={plan} />}
        {state.message && <Alert>{state.message}</Alert>}

        <Field label={t("Your name")} htmlFor="name" error={e.name}>
          <Input id="name" name="name" autoComplete="name" required />
        </Field>
        <Field label={t("Work email")} htmlFor="email" error={e.email}>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label={t("Password")} htmlFor="password" error={e.password} hint={t("At least 10 characters with upper and lower case letters and a number.")}>
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} />
        </Field>
        <Field label={t("I am a…")} htmlFor="workspace_type" error={e.workspace_type}>
          <Select id="workspace_type" name="workspace_type" defaultValue={["teacher", "school", "university"].includes(type ?? "") ? type : "school"}>
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
            onChange={(ev) => !slugTouched && setSlug(slugify(ev.target.value))}
          />
        </Field>
        <Field label={t("Web address")} htmlFor="workspace_slug" error={e.workspace_slug} hint={t("Your public site: {address}", { address: `${slug || t("your-school")}.${rootDomain}` })}>
          <Input
            id="workspace_slug"
            name="workspace_slug"
            required
            value={slug}
            onChange={(ev) => {
              setSlugTouched(true);
              setSlug(slugify(ev.target.value));
            }}
          />
        </Field>

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? t("Creating your workspace…") : t("Create workspace")}
        </Button>
        <p className="text-center text-xs text-ink-muted">{t("By signing up you agree to our terms and privacy policy.")}</p>
      </form>
    </Card>
  );
}
