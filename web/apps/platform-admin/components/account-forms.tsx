"use client";

import { useActionState, useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, Save } from "lucide-react";
import type { User } from "@educloud/api-client";
import { Button, Field, Input, LOCALES, LocationFields, Select, Textarea, cn, useLocale, useStateToast, useT } from "@educloud/ui";
import { changePassword, saveProfile, type ProfileState } from "@/app/actions";

/** Name, headline, bio, phone, where you live and language. */
export function ProfileForm({ me }: { me: User }) {
  const t = useT();
  const locale = useLocale();
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfile, {});
  useStateToast(state);
  const errors = state.fields ?? {};

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("Full name")} htmlFor="name" error={errors.name}>
          <Input id="name" name="name" required maxLength={255} defaultValue={me.name} autoComplete="name" />
        </Field>
        <Field label={t("Phone")} htmlFor="phone" error={errors.phone}>
          <Input id="phone" name="phone" type="tel" maxLength={40} defaultValue={me.phone ?? ""} autoComplete="tel" dir="ltr" />
        </Field>
      </div>
      <Field label={t("Headline")} htmlFor="headline" error={errors.headline} hint={t("A short line about you, e.g. “Customer success, Manara”.")}>
        <Input id="headline" name="headline" maxLength={160} defaultValue={me.headline ?? ""} />
      </Field>
      <Field label={t("Bio")} htmlFor="bio" error={errors.bio}>
        <Textarea id="bio" name="bio" rows={3} maxLength={2000} defaultValue={me.bio ?? ""} />
      </Field>
      <LocationFields defaultValue={me} errors={{ country: errors.country, city: errors.city, area: errors.area }} idPrefix="profile" />
      <Field label={t("Language")} htmlFor="locale" error={errors.locale}>
        <Select id="locale" name="locale" defaultValue={locale} className="sm:max-w-xs">
          {LOCALES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit" disabled={pending}>
        <Save className="h-4 w-4" /> {pending ? t("Saving…") : t("Save profile")}
      </Button>
    </form>
  );
}

/** A rough strength score (0–4) from length and character variety. */
function strength(password: string) {
  if (!password) return 0;
  let score = password.length >= 8 ? 1 : 0;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  return Math.max(score, 1);
}

function PasswordInput({ id, name, autoComplete, error, onChange }: { id: string; name: string; autoComplete: string; error?: string; onChange?: (value: string) => void }) {
  const t = useT();
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        required
        className="pe-11"
        aria-invalid={!!error || undefined}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        dir="ltr"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 end-0 grid w-10 place-items-center text-ink-muted hover:text-ink"
        aria-label={show ? t("Hide password") : t("Show password")}
        aria-pressed={show}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

/** Current password, then the new one twice. Other devices are signed out. */
export function PasswordForm() {
  const t = useT();
  const [state, action, pending] = useActionState<ProfileState, FormData>(changePassword, {});
  useStateToast(state);
  const [password, setPassword] = useState("");
  const [formKey, setFormKey] = useState(0);
  useEffect(() => {
    if (state.ok) {
      setFormKey((k) => k + 1);
      setPassword("");
    }
  }, [state]);
  const errors = state.fields ?? {};
  const score = strength(password);
  const labels = [t("Too short"), t("Weak"), t("Fair"), t("Good"), t("Strong")];
  const tones = ["bg-danger", "bg-danger", "bg-warning", "bg-brand-600", "bg-success"];

  return (
    // A new key after success clears the fields.
    <form action={action} className="space-y-4" key={formKey}>
      <Field label={t("Current password")} htmlFor="current_password" error={errors.current_password}>
        <PasswordInput id="current_password" name="current_password" autoComplete="current-password" error={errors.current_password} />
      </Field>
      <Field label={t("New password")} htmlFor="password" error={errors.password} hint={t("At least 8 characters, with letters and numbers.")}>
        <PasswordInput id="password" name="password" autoComplete="new-password" error={errors.password} onChange={setPassword} />
      </Field>
      {password && (
        <div className="flex items-center gap-3" aria-live="polite">
          <div className="grid flex-1 grid-cols-4 gap-1" aria-hidden>
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className={cn("h-1.5 rounded-full", i <= score ? tones[score] : "bg-surface-3")} />
            ))}
          </div>
          <span className="text-xs font-medium text-ink-muted">{password.length < 8 ? labels[0] : labels[score]}</span>
        </div>
      )}
      <Field label={t("Confirm new password")} htmlFor="password_confirmation" error={errors.password_confirmation}>
        <PasswordInput id="password_confirmation" name="password_confirmation" autoComplete="new-password" error={errors.password_confirmation} />
      </Field>
      <Button type="submit" disabled={pending}>
        <KeyRound className="h-4 w-4" /> {pending ? t("Saving…") : t("Change password")}
      </Button>
    </form>
  );
}
