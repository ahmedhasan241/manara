"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Alert, Button, Field, Input, LOCALES, LocationFields, Select, isLocale, useLocale, useSetLocale, useT } from "@educloud/ui";
import { updateProfile } from "@/app/actions";
import { useMutation } from "@/components/use-mutation";

export interface ProfileValues {
  name: string;
  email: string;
  phone?: string | null;
  country?: string | null;
  city?: string | null;
  area?: string | null;
  locale?: string | null;
}

/** Name, phone, where they live and their language. Saved with a toast. */
export function ProfileForm({ user }: { user: ProfileValues }) {
  const t = useT();
  const current = useLocale();
  const setLocale = useSetLocale();
  const { run, pending } = useMutation();
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const general = error && !Object.values(fields).includes(error) ? error : null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const locale = String(data.get("locale") ?? "");
        setFields({});
        setError(null);
        run(() => updateProfile(data), {
          loading: t("Saving your profile…"),
          success: t("Profile saved."),
          onSuccess: () => {
            // Show the app in the newly chosen language straight away.
            if (isLocale(locale) && locale !== current) setLocale(locale);
          },
          onError: (result) => {
            setFields(result.fields ?? {});
            setError(result.error ?? null);
          },
        });
      }}
      className="space-y-5"
    >
      {general && <Alert>{general}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("Full name")} htmlFor="profile-name" error={fields.name}>
          <Input id="profile-name" name="name" required maxLength={255} autoComplete="name" defaultValue={user.name} aria-invalid={!!fields.name || undefined} />
        </Field>
        <Field label={t("Email address")} htmlFor="profile-email" hint={t("Your email is how you sign in. Ask your school or Manara support to change it.")}>
          <Input id="profile-email" type="email" value={user.email} readOnly disabled dir="ltr" className="text-ink-muted" />
        </Field>
        <Field label={t("Phone (optional)")} htmlFor="profile-phone" error={fields.phone}>
          <Input id="profile-phone" name="phone" type="tel" inputMode="tel" maxLength={32} autoComplete="tel" dir="ltr" defaultValue={user.phone ?? ""} placeholder="+20 100 000 0000" aria-invalid={!!fields.phone || undefined} />
        </Field>
        <Field label={t("Language")} htmlFor="profile-locale" error={fields.locale} hint={t("For the app and the emails we send you.")}>
          <Select id="profile-locale" name="locale" defaultValue={user.locale && isLocale(user.locale) ? user.locale : current}>
            {LOCALES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <LocationFields idPrefix="profile" defaultValue={user} errors={{ country: fields.country, city: fields.city, area: fields.area }} />
      <div className="flex justify-end">
        <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {pending ? t("Saving…") : t("Save profile")}
        </Button>
      </div>
    </form>
  );
}
