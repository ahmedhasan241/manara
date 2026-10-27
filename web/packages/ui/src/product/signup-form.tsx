"use client";

import { useActionState, useState } from "react";
import { Video } from "lucide-react";
import { Alert, Button, Card, Field, Input, Select, buttonClass } from "../components";
import { Checkbox } from "../primitives";
import { useFormat, useT } from "../i18n-provider";
import { signup, type SignupState } from "./signup-action";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

/** The video meetings add-on price for the chosen plan (null cents: included, so there is nothing to choose). */
export interface VideoAddonPrice {
  cents: number | null;
  currency: string;
}

/**
 * "Add video meetings": a checkbox posted as `video_addon`, with the add-on
 * price for the chosen plan and billing interval when known. Hidden when the
 * plan already includes video meetings.
 */
export function VideoAddonOption({ price, interval, defaultChecked }: { price?: VideoAddonPrice | null; interval?: "monthly" | "yearly"; defaultChecked?: boolean }) {
  const t = useT();
  const fmt = useFormat();
  if (price && price.cents == null) return null;
  const yearly = interval === "yearly";
  const amount = price?.cents != null ? fmt.money(yearly ? price.cents * 10 : price.cents, price.currency) : null;
  return (
    <label htmlFor="video_addon" className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-surface-2 p-4 text-sm">
      <Checkbox id="video_addon" name="video_addon" value="1" defaultChecked={defaultChecked} className="mt-0.5" />
      <span className="flex-1">
        <span className="flex items-center gap-2 font-semibold">
          <Video className="h-4 w-4 text-brand-500" aria-hidden />
          {t("Add video meetings")}
        </span>
        <span className="mt-0.5 block text-xs text-ink-muted">
          {amount == null
            ? t("Live lessons over Zoom or Jitsi. Free during the trial.")
            : yearly
              ? t("Live lessons over Zoom or Jitsi. Free during the trial, then {price} / year.", { price: amount })
              : t("Live lessons over Zoom or Jitsi. Free during the trial, then {price} / month.", { price: amount })}
        </span>
      </span>
    </label>
  );
}

export function SignupForm({ plan, type, interval, videoAddon }: { plan?: string; type?: string; interval?: "monthly" | "yearly"; videoAddon?: VideoAddonPrice | null }) {
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
        {interval && <input type="hidden" name="interval" value={interval} />}
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

        <VideoAddonOption price={videoAddon} interval={interval} />

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? t("Creating your workspace…") : t("Create workspace")}
        </Button>
        <p className="text-center text-xs text-ink-muted">{t("By signing up you agree to our terms and privacy policy.")}</p>
      </form>
    </Card>
  );
}
