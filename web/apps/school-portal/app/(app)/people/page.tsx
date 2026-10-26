import Link from "next/link";
import { FileSpreadsheet, UserMinus, UserPlus, Users } from "lucide-react";
import type { Role } from "@educloud/api-client";
import { Avatar, Badge, Card, ClearFilters, EmptyState, FilterBar, FilterChips, PageHeader, SearchField, asKey, buttonClass, formatLocation } from "@educloud/ui";
import { getContext } from "@educloud/portal-kit/session";
import { ToastButton } from "@educloud/portal-kit/toast-button";
import { removePerson } from "@/app/builder-actions";
import { getFormat, getRequestLocale, getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("People") };
}

const ROLES = [
  [undefined, "Everyone"],
  ["student", "Students"],
  ["teacher", "Teachers"],
  ["parent", "Parents"],
  ["admin", "Admins"],
] as const satisfies readonly (readonly [Role | undefined, string])[];

const roleTone = { owner: "brand", admin: "brand", teacher: "accent", student: "success", parent: "warning" } as const;

/**
 * Schools, universities and teachers add their own students (one by one on
 * /people/new or pasted from a spreadsheet on /people/import), teachers and parents.
 */
export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ role?: string; search?: string }> }) {
  const fmt = await getFormat();
  const { locale } = await getRequestLocale();
  const t = await getT();
  const { role, search } = await searchParams;
  const { api, can, workspace } = await getContext();
  const canManage = can("members.manage");
  const selected = ROLES.find(([r]) => r === role)?.[0];
  const members = await api.members({ role: selected, search });

  return (
    <>
      <PageHeader
        icon={<Users />}
        title={t("People")}
        description={t("Add your students, teachers and parents. New people get an email to set their password, then sign in to the student portal or this one.")}
        meta={<Badge>{t("{count} people", { count: members.total })}</Badge>}
        actions={
          canManage && (
            <>
              <Link href="/people/import" className={buttonClass("secondary")}>
                <FileSpreadsheet className="h-4 w-4" /> {t("Import")}
              </Link>
              <Link href="/people/new" className={buttonClass("primary")}>
                <UserPlus className="h-4 w-4" /> {t("Add person")}
              </Link>
            </>
          )
        }
        toolbar={
          <FilterBar
            search={<SearchField placeholder={t("Search name or email")} label={t("Search people")} />}
            chips={<FilterChips param="role" label={t("Role")} options={ROLES.map(([value, label]) => ({ value, label: t(label) }))} />}
            summary={
              (search || selected) && (
                <>
                  <span>{t("{count} people", { count: members.total })}</span>
                  <ClearFilters params={["search", "role"]} />
                </>
              )
            }
          />
        }
      />

      <section aria-label={t("People list")}>
        {members.data.length === 0 ? (
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title={t("Nobody here yet")}
            action={
              canManage && (
                <Link href="/people/new" className={buttonClass("primary")}>
                  <UserPlus className="h-4 w-4" /> {t("Add person")}
                </Link>
              )
            }
          />
        ) : (
          <Card className="overflow-hidden p-0">
            <ul className="divide-y divide-line">
              {members.data.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar name={m.user.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{m.user.name}</p>
                    <p className="truncate text-xs text-ink-muted">
                      {m.user.email}
                      {m.student_number && ` · #${m.student_number}`}
                      {formatLocation(m.user, locale) && ` · ${formatLocation(m.user, locale, { flag: true })}`}
                    </p>
                  </div>
                  <span className="hidden text-xs text-ink-muted sm:block">{m.user.last_login_at ? t("Active {date}", { date: fmt.date(m.user.last_login_at) }) : t("Not signed in yet")}</span>
                  <Badge tone={roleTone[m.role]}>{t(asKey(m.role))}</Badge>
                  {canManage && m.role !== "owner" && (
                    <ToastButton
                      action={removePerson.bind(null, m.id)}
                      unstyled
                      label={t("Remove {name}", { name: m.user.name })}
                      className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                      confirm={{ title: t("Remove {name} from {school}?", { name: m.user.name, school: workspace.tenant.name }), description: t("They lose access to this workspace. Their account and past grades are kept."), confirmLabel: t("Remove") }}
                    >
                      <UserMinus className="h-4 w-4" />
                    </ToastButton>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </>
  );
}
