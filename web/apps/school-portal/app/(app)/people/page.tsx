import Link from "next/link";
import { GraduationCap, Search, UserMinus, UserPlus, Users } from "lucide-react";
import type { Role } from "@educloud/api-client";
import { Avatar, Badge, Card, CharacterGroup, EmptyState, FadeIn, Field, HeroBanner, Input, Select, Textarea, asKey, bannerButtonClass, cn, formatLocation } from "@educloud/ui";
import { getContext } from "@educloud/portal-kit/session";
import { ToastButton } from "@educloud/portal-kit/toast-button";
import { ActionForm } from "@/components/action-form";
import { addPerson, importPeople, removePerson } from "@/app/builder-actions";
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
 * Schools, universities and teachers add their own students (one by one or
 * pasted from a spreadsheet), teachers and parents.
 */
export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ role?: string; search?: string }> }) {
  const fmt = await getFormat();
  const { locale } = await getRequestLocale();
  const t = await getT();
  const { role, search } = await searchParams;
  const { api, can, workspace } = await getContext();
  const canManage = can("members.manage");
  const selected = ROLES.find(([r]) => r === role)?.[0];
  const [members, courses] = await Promise.all([api.members({ role: selected, search }), api.courses({})]);

  return (
    <>
      <FadeIn>
        <HeroBanner
          eyebrow={
            <>
              <Users className="h-3.5 w-3.5" /> {workspace.tenant.name}
            </>
          }
          title={t("People")}
          subtitle={t("Add your students, teachers and parents. New people get an email to set their password, then sign in to the student portal or this one.")}
          meta={<span>{t("{count} people", { count: members.total })}</span>}
          actions={
            canManage && (
              <a href="#add" className={bannerButtonClass()}>
                <UserPlus className="h-4 w-4" /> {t("Add people")}
              </a>
            )
          }
          art={<CharacterGroup count={3} className="w-72" />}
        />
      </FadeIn>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section aria-label={t("People list")}>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {ROLES.map(([r, label]) => (
              <Link
                key={label}
                href={r ? `/people?role=${r}` : "/people"}
                aria-current={selected === r ? "page" : undefined}
                className={cn("rounded-full border px-4 py-2 text-sm font-semibold", selected === r ? "fill-brand border-transparent text-white" : "border-line bg-surface text-ink-muted hover:text-ink")}
              >
                {t(label)}
              </Link>
            ))}
            <form className="relative ms-auto w-full sm:w-64" role="search">
              {selected && <input type="hidden" name="role" value={selected} />}
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <Input name="search" defaultValue={search} placeholder={t("Search name or email")} aria-label={t("Search people")} className="ps-9" />
            </form>
          </div>

          {members.data.length === 0 ? (
            <EmptyState icon={<Users className="h-6 w-6" />} title={t("Nobody here yet")} description={t("Add people with the forms on this page.")} />
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

        {canManage && (
          <aside id="add" className="space-y-6">
            <Card className="p-5">
              <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-bold">
                <UserPlus className="h-5 w-5 text-brand-600 dark:text-brand-300" /> {t("Add one person")}
              </h2>
              <p className="mb-4 text-sm text-ink-muted">{t("They'll get an email to set their password.")}</p>
              <ActionForm action={addPerson} submit={t("Add person")} resetOnSuccess>
                <Field label={t("Full name")} htmlFor="p-name">
                  <Input id="p-name" name="name" required />
                </Field>
                <Field label={t("Email")} htmlFor="p-email">
                  <Input id="p-email" name="email" type="email" required />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t("Role")} htmlFor="p-role">
                    <Select id="p-role" name="role" defaultValue="student">
                      <option value="student">{t("Student")}</option>
                      <option value="teacher">{t("Teacher / lecturer")}</option>
                      <option value="admin">{t("Admin")}</option>
                    </Select>
                  </Field>
                  <Field label={t("Student no.")} htmlFor="p-number">
                    <Input id="p-number" name="student_number" placeholder={t("Optional")} />
                  </Field>
                </div>
              </ActionForm>
            </Card>

            <Card className="p-5">
              <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-bold">
                <GraduationCap className="h-5 w-5 text-brand-600 dark:text-brand-300" /> {t("Add a whole class")}
              </h2>
              <p className="mb-4 text-sm text-ink-muted">{t("Paste from a spreadsheet: one person per line, “Name, email” (and optionally a student number).")}</p>
              <ActionForm action={importPeople} submit={t("Import")} resetOnSuccess>
                <Textarea name="people" rows={6} required placeholder={t("Sara Ali, sara@school.edu, S-104\nOmar Nasser, omar@school.edu")} aria-label={t("People to add")} className="font-mono text-xs" />
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t("Add as")} htmlFor="b-role">
                    <Select id="b-role" name="role" defaultValue="student">
                      <option value="student">{t("Students")}</option>
                      <option value="teacher">{t("Teachers")}</option>
                    </Select>
                  </Field>
                  <Field label={t("Enroll in")} htmlFor="b-course">
                    <Select id="b-course" name="course_id" defaultValue="">
                      <option value="">{t("No course")}</option>
                      {courses.data.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              </ActionForm>
            </Card>
          </aside>
        )}
      </div>
    </>
  );
}
