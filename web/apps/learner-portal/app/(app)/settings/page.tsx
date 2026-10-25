import { KeyRound, MonitorSmartphone, Palette, Download, UserRound } from "lucide-react";
import { Card, ThemeToggle, buttonClass } from "@educloud/ui";
import { requireAudience } from "@educloud/portal-kit/session";
import { getFormat, getT } from "@educloud/ui/locale";
import { AccountHeader, SectionTitle } from "@/components/account/account-header";
import { PasswordForm } from "@/components/account/password-form";
import { ProfileForm } from "@/components/account/profile-form";
import { RevokeDeviceButton } from "@/components/account/revoke-device-button";
import { SignOutButton } from "@/components/sign-out-button";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Settings") };
}

/** Profile, password, appearance, data export and signed-in devices, for students and parents alike. */
export default async function SettingsPage() {
  const fmt = await getFormat();
  const t = await getT();
  const { api, me, workspace } = await requireAudience("learner", "/staff-account");
  const devices = await api.devices().catch(() => []);

  return (
    <>
      <AccountHeader
        user={me}
        role={workspace.role}
        actions={<SignOutButton className={`${buttonClass("secondary", "sm")} lg:hidden`} />}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <SectionTitle icon={<UserRound />} title={t("Profile")} description={t("How your school and teachers see you, and where you live.")} />
          <ProfileForm user={{ name: me.name, email: me.email, phone: me.phone, country: me.country, city: me.city, area: me.area, locale: me.locale }} />
        </Card>

        <Card className="lg:col-span-2">
          <SectionTitle icon={<KeyRound />} title={t("Password")} description={t("Use a password you don't use anywhere else.")} />
          <PasswordForm />
        </Card>

        <Card>
          <SectionTitle icon={<Palette />} title={t("Appearance")} />
          <ThemeToggle />
        </Card>

        <Card>
          <SectionTitle icon={<Download />} title={t("Your data")} description={t("Download a copy of everything we store about you.")} />
          <a href="/api/files/me/export" className={buttonClass("secondary", "sm")}>
            {t("Download my data")}
          </a>
        </Card>

        <Card className="lg:col-span-2">
          <SectionTitle icon={<MonitorSmartphone />} title={t("Signed-in devices")} />
          <ul className="divide-y divide-line text-sm">
            {devices.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 py-2.5">
                <span className="min-w-0">
                  <span className="font-medium">{d.name}</span> {d.current && <span className="text-xs text-success">{t("(this device)")}</span>}
                  <span className="block text-xs text-ink-muted">
                    {t("Last used")} {d.last_used_at ? fmt.dateTime(d.last_used_at) : t("never")}
                  </span>
                </span>
                {!d.current && <RevokeDeviceButton id={d.id} name={d.name} />}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
