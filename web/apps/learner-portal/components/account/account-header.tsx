import { Mail, MapPin, Phone } from "lucide-react";
import type { User } from "@educloud/api-client";
import { Avatar, Badge, asKey, formatLocation } from "@educloud/ui";
import { getI18n } from "@educloud/ui/locale";

/** The person at the top of Settings: avatar, name, role, email, phone and where they live. */
export async function AccountHeader({ user, role, actions }: { user: User; role?: string; actions?: React.ReactNode }) {
  const { t, locale } = await getI18n();
  const place = formatLocation(user, locale, { flag: true });

  return (
    <section className="banner-brand relative mb-6 overflow-hidden rounded-[var(--radius-card)] p-5 text-white sm:p-7">
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
        <Avatar name={user.name} size="lg" className="h-16 w-16 shrink-0 text-xl ring-4 ring-brand-400/30" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate font-display text-xl font-semibold sm:text-2xl">{user.name}</h1>
            {role && <Badge tone="brand" className="!bg-brand-400/20 !text-brand-200">{t(asKey(role))}</Badge>}
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-white/75">
            <li className="flex min-w-0 items-center gap-1.5">
              <Mail className="h-4 w-4 shrink-0 text-brand-300" aria-hidden /> <span className="truncate" dir="ltr">{user.email}</span>
            </li>
            {user.phone && (
              <li className="flex items-center gap-1.5">
                <Phone className="h-4 w-4 shrink-0 text-brand-300" aria-hidden /> <span dir="ltr">{user.phone}</span>
              </li>
            )}
            <li className="flex min-w-0 items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0 text-brand-300" aria-hidden />
              <span className="truncate">{place || t("Add where you live below")}</span>
            </li>
          </ul>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </section>
  );
}

/** Icon, title and one line of help at the top of a settings card. */
export function SectionTitle({ icon, title, description }: { icon: React.ReactNode; title: string; description?: string }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-500/12 text-brand-700 dark:text-brand-300 [&_svg]:h-[18px] [&_svg]:w-[18px]">{icon}</span>
      <div>
        <h2 className="font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
      </div>
    </div>
  );
}
