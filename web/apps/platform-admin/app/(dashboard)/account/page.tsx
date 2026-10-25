import { KeyRound, MapPin, UserRound } from "lucide-react";
import { serverClient } from "@educloud/api-client/server";
import { Avatar, Badge, Card, formatLocation } from "@educloud/ui";
import { getI18n, getT } from "@educloud/ui/locale";
import { PasswordForm, ProfileForm } from "@/components/account-forms";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Your account") };
}

export default async function AccountPage() {
  const { t, locale } = await getI18n();
  const me = await (await serverClient()).me();
  const location = formatLocation(me, locale, { flag: true });

  return (
    <>
      <div className="banner-brand relative mb-8 overflow-hidden rounded-[1.75rem] p-5 text-white shadow-[var(--shadow-soft)] sm:p-7">
        <div className="relative flex flex-wrap items-center gap-4">
          <Avatar name={me.name} size="lg" className="ring-4 ring-white/15" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-300">{t("Your account")}</p>
            <h1 className="truncate font-display text-2xl font-bold sm:text-3xl">{me.name}</h1>
            {me.headline && <p dir="auto" className="truncate text-white/80">{me.headline}</p>}
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/75">
              <span dir="ltr" className="truncate">{me.email}</span>
              {location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {location}
                </span>
              )}
            </p>
          </div>
          <Badge tone="brand">{t("Manara staff")}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="p-5 sm:p-6">
          <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-bold">
            <UserRound className="h-5 w-5 text-brand-600 dark:text-brand-300" /> {t("Profile")}
          </h2>
          <p className="mb-5 text-sm text-ink-muted">{t("How you appear to schools and in the audit log.")}</p>
          <ProfileForm me={me} />
        </Card>
        <Card className="h-fit p-5 sm:p-6">
          <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-bold">
            <KeyRound className="h-5 w-5 text-brand-600 dark:text-brand-300" /> {t("Change password")}
          </h2>
          <p className="mb-5 text-sm text-ink-muted">{t("You stay signed in here; every other device is signed out.")}</p>
          <PasswordForm />
        </Card>
      </div>
    </>
  );
}
