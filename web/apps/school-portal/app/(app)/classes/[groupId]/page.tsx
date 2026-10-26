import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, CalendarCheck, DoorOpen, Pencil, Trophy, UserPlus, UserRound, Users } from "lucide-react";
import { ApiError, type ApiClient, type MemberRow } from "@educloud/api-client";
import { Avatar, Badge, Card, EmptyState, PageHeader, SectionHeading, Stagger, StaggerItem, buttonClass } from "@educloud/ui";
import { getContext } from "@educloud/portal-kit/session";
import { getI18n, getT } from "@educloud/ui/locale";
import { ClassStudentsPicker } from "@/components/class-students-picker";
import { StructureLink } from "@/components/structure-editor";
import { attendanceLabel, attendanceTone, formatScore, isUniversity, pct, stageLabel } from "@/lib/academic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Class") };
}

/** Every student in the school (the members list is paginated). */
async function allStudents(api: ApiClient) {
  const rows: MemberRow[] = [];
  for (let page = 1; page <= 25; page++) {
    const result = await api.members({ role: "student", page });
    rows.push(...result.data);
    if (page >= result.last_page) break;
  }
  return rows.map((m) => ({ id: m.user.id, name: m.user.name, email: m.user.email })).sort((a, b) => a.name.localeCompare(b.name));
}

export default async function ClassPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const { api, can, workspace } = await getContext();
  if (!can("courses.manage") && !can("members.manage")) notFound();
  const { t } = await getI18n();
  const canManage = can("members.manage");
  const university = isUniversity(workspace.tenant.type);

  const group = await api.classGroup(groupId).catch((error) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });
  const [students, rankings, attendance] = await Promise.all([
    canManage ? allStudents(api).catch(() => null) : Promise.resolve(null),
    api.rankings({ scope: "group", id: groupId }).catch(() => null),
    api.attendanceReport({ scope: "group", id: groupId, status: "flagged" }).catch(() => null),
  ]);
  const ranks = new Map(rankings?.rows.map((r) => [r.student_id, r]) ?? []);
  const flagged = new Map(attendance?.rows.map((r) => [r.student_id, r]) ?? []);
  const scale = rankings?.grading_scale ?? attendance?.settings.grading_scale ?? "percent";

  return (
    <>
      <PageHeader
        back={{ href: "/classes", label: university ? t("Years & sections") : t("Classes & levels") }}
        icon={<DoorOpen />}
        title={group.name}
        description={[stageLabel(t, group.level.stage), group.level.name, university ? group.level.department : null].filter(Boolean).join(" · ")}
        meta={
          <>
            <Badge>
              <UserRound className="h-3.5 w-3.5" /> {group.advisor?.name ?? (university ? t("No advisor yet") : t("No class teacher yet"))}
            </Badge>
            <Badge>
              <Users className="h-3.5 w-3.5" /> {group.capacity ? t("{count} of {capacity} places", { count: group.students.length, capacity: group.capacity }) : t("{count} students", { count: group.students.length })}
            </Badge>
            {group.room && <Badge>{t("Room {room}", { room: group.room })}</Badge>}
          </>
        }
        actions={
          <>
            <Link href={`/rankings?scope=group&id=${group.id}`} className={buttonClass("ghost")}>
              <Trophy className="h-4 w-4" /> {t("Class rankings")}
            </Link>
            <Link href={`/attendance?scope=group&id=${group.id}`} className={buttonClass("ghost")}>
              <CalendarCheck className="h-4 w-4" /> {t("Class attendance")}
            </Link>
            {canManage && (
              <Link href={`/classes/${group.id}/edit`} className={buttonClass("secondary")}>
                <Pencil className="h-4 w-4" /> {university ? t("Edit section") : t("Edit class")}
              </Link>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-8">
          <section aria-labelledby="students-heading">
            <SectionHeading title={<span id="students-heading">{t("Students")}</span>} description={t("Average, attendance and rank in this class.")} />
            {group.students.length === 0 ? (
              <EmptyState icon={<Users className="h-6 w-6" />} title={t("No students in this class yet")} description={canManage ? t("Use the picker to add students.") : undefined} />
            ) : (
              <Card className="overflow-x-auto p-0 shadow-[var(--shadow-soft)]">
                <table className="w-full min-w-[34rem] text-sm">
                  <thead className="border-b border-line text-ink-muted">
                    <tr>
                      <th className="px-4 py-3 text-start font-medium">{t("Student")}</th>
                      <th className="px-4 py-3 text-start font-medium">{t("Rank")}</th>
                      <th className="px-4 py-3 text-start font-medium">{scale === "gpa" ? t("GPA") : t("Average")}</th>
                      <th className="px-4 py-3 text-start font-medium">{t("Attendance")}</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {group.students.map((s) => {
                      const r = ranks.get(s.id);
                      const a = flagged.get(s.id);
                      return (
                        <tr key={s.id} className="border-b border-line last:border-0">
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-3">
                              <Avatar name={s.name} size="sm" />
                              <span className="min-w-0">
                                <span className="block truncate font-semibold">{s.name}</span>
                                <span className="block truncate text-xs text-ink-muted">{s.email}</span>
                              </span>
                            </span>
                          </td>
                          <td className="px-4 py-3 tabular-nums">{r?.rank ? `#${r.rank}` : "—"}</td>
                          <td className="px-4 py-3 tabular-nums">
                            {formatScore(scale, r?.average, r?.gpa)} {r?.letter && <span className="text-xs font-semibold text-brand-600 dark:text-brand-300">{r.letter}</span>}
                          </td>
                          <td className="px-4 py-3">
                            {a ? <Badge tone={attendanceTone[a.status]}>{attendanceLabel(t, a.status)}</Badge> : <span className="tabular-nums text-ink-muted">{pct(r?.attendance_rate)}</span>}
                          </td>
                          <td className="px-4 py-3 text-end">
                            <Link href={`/students/${s.id}`} className={buttonClass("ghost", "sm")}>
                              {t("Report card")}
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            )}
          </section>

          {canManage && students && (
            <section aria-labelledby="assign-heading">
              <SectionHeading title={<span id="assign-heading" className="inline-flex items-center gap-2"><UserPlus className="h-5 w-5 text-brand-500" /> {t("Assign students")}</span>} description={t("Tick the students who belong to {name}.", { name: group.name })} />
              <Card className="p-4 shadow-[var(--shadow-soft)] sm:p-5">
                <ClassStudentsPicker key={group.students.map((s) => s.id).join(",")} groupId={group.id} students={students} current={group.students.map((s) => s.id)} capacity={group.capacity} subjects={group.courses.length} />
              </Card>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section aria-labelledby="subjects-heading">
            <SectionHeading title={<span id="subjects-heading">{t("Subjects")}</span>} description={t("Courses taught to this class.")} />
            {group.courses.length === 0 ? (
              <Card className="text-sm text-ink-muted">
                {t("No subjects yet. Set the class on a course to teach it here.")}{" "}
                {can("courses.manage") && (
                  <Link href="/courses/new" className="font-semibold text-brand-600 dark:text-brand-300">
                    {t("Create a course")}
                  </Link>
                )}
              </Card>
            ) : (
              <Stagger className="space-y-2">
                {group.courses.map((c) => (
                  <StaggerItem key={c.id}>
                    <div className="relative flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-peach text-brand-700 dark:text-brand-300">
                        <BookOpen className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <Link href={`/courses/${c.id}`} className="block truncate text-sm font-semibold after:absolute after:inset-0 after:rounded-2xl">
                          {c.subject ?? c.title}
                        </Link>
                        <span className="block truncate text-xs text-ink-muted">{[c.code, c.teacher?.name, c.credit_hours != null ? t("Credit hours: {count}", { count: c.credit_hours }) : null, c.periods_per_week ? t("Periods a week: {count}", { count: c.periods_per_week }) : null].filter(Boolean).join(" · ")}</span>
                      </span>
                      <Link href={`/rankings?scope=course&id=${c.id}`} aria-label={t("Rankings")} className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-surface-3 hover:text-ink">
                        <Trophy className="h-4 w-4" />
                      </Link>
                    </div>
                  </StaggerItem>
                ))}
              </Stagger>
            )}
          </section>

          {rankings && rankings.rows.some((r) => r.rank) && (
            <section aria-labelledby="top-heading">
              <SectionHeading title={<span id="top-heading">{t("Top of the class")}</span>} href={`/rankings?scope=group&id=${group.id}`} linkLabel={t("See all")} />
              <Card className="p-2">
                <ol>
                  {rankings.rows
                    .filter((r) => r.rank)
                    .slice(0, 5)
                    .map((r) => (
                      <li key={r.student_id}>
                        <Link href={`/students/${r.student_id}`} className="flex items-center gap-3 rounded-xl p-2.5 transition hover:bg-surface-3/70">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-500/12 font-display text-sm font-bold text-brand-700 dark:text-brand-300">{r.rank}</span>
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold">{r.name}</span>
                          <span className="font-display font-bold tabular-nums">{formatScore(scale, r.average, r.gpa)}</span>
                        </Link>
                      </li>
                    ))}
                </ol>
              </Card>
            </section>
          )}

          {canManage && (
            <Card className="flex items-center gap-3 text-sm">
              <StructureLink kind="edit" href={`/classes/${group.id}/edit`} label={university ? t("Edit section") : t("Edit class")} />
              <span className="text-ink-muted">{t("Change the name, room, capacity or class teacher.")}</span>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}
