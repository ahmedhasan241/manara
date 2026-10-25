import { KeyRound, MapPin, UserRound } from "lucide-react";
import { Alert, Avatar, Badge, Button, Card, LOCALES, Select, ThemeToggle, asKey, buttonClass, formatLocation } from "@educloud/ui";
import { getContext } from "@educloud/portal-kit/session";
import { ToastButton } from "@educloud/portal-kit/toast-button";
import { ToastForm } from "@educloud/portal-kit/toast-form";
import { MfaSetup } from "@/components/mfa-setup";
import { PasswordForm, ProfileForm } from "@/components/account-forms";
import { SignOutButton } from "@/components/sign-out-button";
import { revokeDevice, setLocale, switchWorkspace } from "../../actions";
import { getFormat, getI18n, getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Settings") };
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ mfa?: string }> }) {
  const fmt = await getFormat();
  const { mfa } = await searchParams;
  const { api, me, workspace } = await getContext();
  const { t, locale } = await getI18n();
  const [devices, activity] = await Promise.all([api.devices(), api.myActivity()]);
  const location = formatLocation(me, locale, { flag: true });

  return (
    <>
      {/* Profile header: navy banner with the person's name, headline and where they are. */}
      <div className="banner-brand relative mb-8 overflow-hidden rounded-[1.75rem] p-5 text-white shadow-[var(--shadow-soft)] sm:p-7">
        <div className="relative flex flex-wrap items-center gap-4">
          <Avatar name={me.name} size="lg" className="ring-4 ring-white/15" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-300">{t("Settings")}</p>
            <h1 className="truncate font-display text-2xl font-bold sm:text-3xl">{me.name}</h1>
            {me.headline && <p dir="auto" className="truncate text-white/80">{me.headline}</p>}
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/75">
              <span dir="ltr" className="truncate">
                {me.email}
              </span>
              {location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {location}
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">
              {t(asKey(workspace.role))} · {workspace.tenant.name}
            </Badge>
            <SignOutButton variant="button" className="md:hidden [&_button]:border-white/25 [&_button]:text-white" />
          </div>
        </div>
      </div>

      {mfa === "required" && (
        <div className="mb-6">
          <Alert tone="warning">{t("Your school requires two-factor authentication for staff. Turn it on below to continue.")}</Alert>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-bold">
            <UserRound className="h-5 w-5 text-brand-600 dark:text-brand-300" /> {t("Profile")}
          </h2>
          <p className="mb-5 text-sm text-ink-muted">{t("How students, parents and colleagues see you.")}</p>
          <ProfileForm me={me} />
        </Card>

        <div className="space-y-4">
          <Card className="p-5 sm:p-6">
            <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-bold">
              <KeyRound className="h-5 w-5 text-brand-600 dark:text-brand-300" /> {t("Change password")}
            </h2>
            <p className="mb-5 text-sm text-ink-muted">{t("You stay signed in here; every other device is signed out.")}</p>
            <PasswordForm />
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold">{t("Appearance & language")}</h2>
            <div className="space-y-4">
              <div>
                <p className="mb-1.5 text-sm font-medium">{t("Theme")}</p>
                <ThemeToggle />
              </div>
              <ToastForm action={setLocale} className="flex flex-wrap items-end gap-2">
                <div>
                  <label htmlFor="locale" className="mb-1.5 block text-sm font-medium">
                    {t("Language")}
                  </label>
                  <Select id="locale" name="locale" defaultValue={locale}>
                    {LOCALES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button variant="secondary" type="submit">
                  {t("Save")}
                </Button>
              </ToastForm>
            </div>
          </Card>
        </div>

        {(me.memberships?.length ?? 0) > 1 && (
          <Card className="lg:col-span-2">
            <h2 className="mb-3 font-semibold">{t("Workspace")}</h2>
            <ToastForm action={switchWorkspace} loading={t("Switching workspace…")} className="flex flex-wrap items-end gap-2">
              <div className="min-w-60 flex-1">
                <label htmlFor="tenant" className="mb-1.5 block text-sm font-medium">
                  {t("You belong to several schools. Switch to:")}
                </label>
                <Select id="tenant" name="tenant" defaultValue={workspace.tenant.slug}>
                  {me.memberships!.map((m) => (
                    <option key={m.tenant.slug} value={m.tenant.slug}>
                      {m.tenant.name} ({t(asKey(m.role))})
                    </option>
                  ))}
                </Select>
              </div>
              <Button variant="secondary" type="submit">
                {t("Switch")}
              </Button>
            </ToastForm>
          </Card>
        )}

        <Card>
          <h2 className="mb-3 font-semibold">{t("Two-factor authentication")}</h2>
          <MfaSetup enabled={me.mfa_enabled} />
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">{t("Signed-in devices")}</h2>
          <ul className="divide-y divide-line text-sm">
            {devices.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 py-2">
                <span className="min-w-0">
                  {d.name} {d.current && <span className="text-xs text-success">{t("(this device)")}</span>}
                  <span className="block text-xs text-ink-muted">
                    {t("Last used")} {d.last_used_at ? fmt.dateTime(d.last_used_at) : t("never")}
                  </span>
                </span>
                {!d.current && (
                  <ToastButton
                    action={revokeDevice.bind(null, d.id)}
                    variant="ghost"
                    size="sm"
                    confirm={{ title: t("Sign out {device}?", { device: d.name }), description: t("Anyone using it will have to sign in again."), confirmLabel: t("Sign out") }}
                  >
                    {t("Sign out")}
                  </ToastButton>
                )}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">{t("Your data")}</h2>
          <p className="mb-3 text-sm text-ink-muted">{t("Download a copy of everything we store about you (profile, grades, attendance and sign-in history).")}</p>
          <a href="/api/files/me/export" className={buttonClass("secondary", "sm")}>
            {t("Download my data")}
          </a>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-3 font-semibold">{t("Recent security activity")}</h2>
          <ul className="divide-y divide-line text-sm">
            {activity.data.slice(0, 10).map((a) => (
              <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>{a.action}</span>
                <span className="text-ink-muted">
                  {a.ip_address} · {fmt.dateTime(a.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
