import { KeyRound, MapPin, UserRound } from "lucide-react";
import { serverClient } from "@educloud/api-client/server";
import { Avatar, Badge, Card, PageHeader, formatLocation } from "@educloud/ui";
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
      <PageHeader
        eyebrow={t("Your account")}
        icon={<Avatar name={me.name} size="md" className="!h-11 !w-11" />}
        title={me.name}
        description={me.headline ? <span dir="auto">{me.headline}</span> : undefined}
        meta={
          <>
            <Badge tone="brand">{t("Manara staff")}</Badge>
            <span dir="ltr" className="truncate text-ink-muted">{me.email}</span>
            {location && (
              <span className="inline-flex items-center gap-1 text-ink-muted">
                <MapPin className="h-3.5 w-3.5" /> {location}
              </span>
            )}
          </>
        }
      />

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
