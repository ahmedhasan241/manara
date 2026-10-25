import Link from "next/link";
import { AlertTriangle, CalendarCheck, ChevronDown, Clock, OctagonAlert, ShieldCheck, Users } from "lucide-react";
import type { AttendanceReport, AttendanceStanding } from "@educloud/api-client";
import { Avatar, Badge, Card, EmptyState, FadeIn, HeroBanner, StatCard, Stagger, StaggerItem, buttonClass, cn } from "@educloud/ui";
import { getContext } from "@educloud/portal-kit/session";
import { getI18n, getT } from "@educloud/ui/locale";
import { ScopeFilter } from "@/components/scope-filter";
import { attendanceLabel, attendanceTone, isUniversity, pct } from "@/lib/academic";
import { parseScope, scopeOptions } from "@/lib/scope";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Attendance") };
}

const STATUSES = ["all", "flagged", "warning", "limit"] as const;
type Status = (typeof STATUSES)[number];

const barTone: Record<AttendanceStanding, string> = { ok: "bg-success", warning: "bg-warning", limit: "bg-danger" };

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ scope?: string; id?: string; status?: string }> }) {
  const query = await searchParams;
  const { scope, id } = parseScope(query);
  const status: Status = STATUSES.includes(query.status as Status) ? (query.status as Status) : "all";
  const { api, workspace } = await getContext();
  const { t } = await getI18n();
  const [report, structure, courses] = await Promise.all([
    api.attendanceReport({ scope, id, status: status === "all" ? undefined : status }).catch(() => null),
    api.academicStructure().catch(() => null),
    api.courses({}).catch(() => ({ data: [] })),
  ]);
  const university = isUniversity(structure?.type ?? workspace.tenant.type);
  const settings = report?.settings ?? structure?.settings;
  const labels: Record<Status, string> = { all: t("Everyone"), flagged: t("Flagged"), warning: t("Warning"), limit: t("Over the limit") };
  const href = (s: Status) => {
    const params = new URLSearchParams(Object.entries({ scope: scope === "school" ? undefined : scope, id, status: s === "all" ? undefined : s }).filter((e): e is [string, string] => !!e[1]));
    return `/attendance${params.size ? `?${params}` : ""}`;
  };

  return (
    <>
      <FadeIn>
        <HeroBanner
          eyebrow={
            <>
              <CalendarCheck className="h-3.5 w-3.5" /> {report?.label ?? workspace.tenant.name}
            </>
          }
          title={t("Attendance")}
          subtitle={t("Who is missing lessons, worst first. Open a student to see each subject.")}
          meta={
            settings && (
              <>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-brand-600 dark:text-brand-300" /> {t("Late after {count} min", { count: settings.late_after_minutes })}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-warning" /> {t("Warning at {percent}% absences", { percent: settings.absence_warning_percent })}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <OctagonAlert className="h-4 w-4 text-danger" /> {t("Limit at {percent}% absences", { percent: settings.absence_limit_percent })}
                </span>
              </>
            )
          }
        />
      </FadeIn>

      <ScopeFilter scope={scope} id={id} options={scopeOptions(structure, courses.data)} university={university} keep={{ status: status === "all" ? undefined : status }} />

      <nav aria-label={t("Filter by status")} className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-1">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={href(s)}
            scroll={false}
            aria-current={status === s ? "page" : undefined}
            className={cn("inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition", status === s ? "fill-brand border-transparent text-white shadow-[var(--shadow-soft)]" : "border-line bg-surface text-ink-muted hover:text-ink")}
          >
            {labels[s]}
          </Link>
        ))}
      </nav>

      {!report ? (
        <EmptyState icon={<CalendarCheck className="h-6 w-6" />} title={t("Attendance is not available")} description={t("Pick another scope, or check back once sessions are recorded.")} />
      ) : (
        <AttendanceBody report={report} status={status} />
      )}
    </>
  );
}

async function AttendanceBody({ report, status }: { report: AttendanceReport; status: Status }) {
  const t = await getT();
  const { totals, settings } = report;

  return (
    <div className="space-y-6">
      <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StaggerItem>
          <StatCard label={t("Students")} value={totals.students} icon={<Users className="h-5 w-5" />} />
        </StaggerItem>
        <StaggerItem>
          <StatCard label={t("Attendance rate")} value={pct(totals.rate)} icon={<CalendarCheck className="h-5 w-5" />} tone={totals.rate < 75 ? "danger" : totals.rate >= 90 ? "success" : undefined} />
        </StaggerItem>
        <StaggerItem>
          <StatCard label={t("Absence warnings")} value={totals.warning} icon={<AlertTriangle className="h-5 w-5" />} hint={t("At {percent}% absences or more", { percent: settings.absence_warning_percent })} />
        </StaggerItem>
        <StaggerItem>
          <StatCard label={t("Over the limit")} value={totals.limit} icon={<OctagonAlert className="h-5 w-5" />} tone={totals.limit ? "danger" : undefined} hint={t("At {percent}% absences or more", { percent: settings.absence_limit_percent })} />
        </StaggerItem>
      </Stagger>

      <Card className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center">
        <ShieldCheck className="h-5 w-5 shrink-0 text-brand-500" />
        <p className="text-ink-muted">
          {t("Late counts as attended. A student gets a warning at {warning}% absences and is over the limit at {limit}%; parents are told about each absence.", { warning: settings.absence_warning_percent, limit: settings.absence_limit_percent })}
        </p>
      </Card>

      {report.rows.length === 0 ? (
        <EmptyState icon={<ShieldCheck className="h-6 w-6" />} title={status === "all" ? t("No attendance yet") : t("No one here")} description={status === "all" ? t("Attendance appears once class sessions or live lessons are held.") : t("No student matches this filter. Nice work.")} />
      ) : (
        <div className="space-y-2">
          <div className="hidden grid-cols-[minmax(0,1.6fr)_repeat(4,4.5rem)_minmax(8rem,1fr)_8.5rem_1.5rem] gap-3 px-4 text-xs font-medium text-ink-muted lg:grid">
            <span>{t("Student")}</span>
            <span>{t("Present")}</span>
            <span>{t("Late")}</span>
            <span>{t("Absent")}</span>
            <span>{t("Excused")}</span>
            <span>{t("Absences")}</span>
            <span>{t("Status")}</span>
            <span />
          </div>
          {report.rows.map((row) => (
            <details key={row.student_id} className="group rounded-2xl border border-line bg-surface shadow-[var(--shadow-soft)] open:border-brand-300/70">
              <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4 lg:grid-cols-[minmax(0,1.6fr)_repeat(4,4.5rem)_minmax(8rem,1fr)_8.5rem_1.5rem] [&::-webkit-details-marker]:hidden">
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar name={row.name} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{row.name}</span>
                    <span className="block truncate text-xs text-ink-muted">
                      {[row.class_group, t("Sessions: {count}", { count: row.sessions }), t("Rate {rate}", { rate: pct(row.rate) })].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </span>
                <span className="hidden tabular-nums text-success lg:block">{row.present}</span>
                <span className="hidden tabular-nums text-warning lg:block">{row.late}</span>
                <span className="hidden tabular-nums text-danger lg:block">{row.absent}</span>
                <span className="hidden tabular-nums lg:block">{row.excused}</span>
                <span className="col-span-2 row-start-2 lg:col-span-1 lg:row-start-auto">
                  <AbsenceBar percent={row.absence_percent} status={row.status} warning={settings.absence_warning_percent} limit={settings.absence_limit_percent} />
                </span>
                <span className="col-start-2 row-start-1 flex items-center justify-end gap-2 lg:col-start-auto lg:row-start-auto lg:justify-start">
                  <Badge tone={attendanceTone[row.status]}>{attendanceLabel(t, row.status)}</Badge>
                </span>
                <ChevronDown className="hidden h-4 w-4 text-ink-muted transition-transform group-open:rotate-180 lg:block" />
              </summary>
              <div className="border-t border-line p-4">
                <p className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted lg:hidden">
                  <span className="text-success">{t("Present: {count}", { count: row.present })}</span>
                  <span className="text-warning">{t("Late: {count}", { count: row.late })}</span>
                  <span className="text-danger">{t("Absent: {count}", { count: row.absent })}</span>
                  <span>{t("Excused: {count}", { count: row.excused })}</span>
                </p>
                {row.courses.length === 0 ? (
                  <p className="text-sm text-ink-muted">{t("No subjects with attendance yet.")}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[34rem] text-sm">
                      <thead className="text-xs text-ink-muted">
                        <tr>
                          <th className="py-2 pe-3 text-start font-medium">{t("Subject")}</th>
                          <th className="px-3 py-2 text-start font-medium">{t("Sessions")}</th>
                          <th className="px-3 py-2 text-start font-medium">{t("Present")}</th>
                          <th className="px-3 py-2 text-start font-medium">{t("Late")}</th>
                          <th className="px-3 py-2 text-start font-medium">{t("Absent")}</th>
                          <th className="px-3 py-2 text-start font-medium">{t("Excused")}</th>
                          <th className="px-3 py-2 text-start font-medium">{t("Absences")}</th>
                          <th className="py-2 ps-3 text-start font-medium">{t("Status")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {row.courses.map((c, i) => (
                          <tr key={c.course?.id ?? i} className="border-t border-line">
                            <td className="py-2 pe-3 font-medium">
                              {c.course ? (
                                <Link href={`/courses/${c.course.id}?tab=attendance`} className="hover:text-brand-600 dark:hover:text-brand-300">
                                  {c.course.subject ?? c.course.title}
                                </Link>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-3 py-2 tabular-nums">{c.sessions}</td>
                            <td className="px-3 py-2 tabular-nums">{c.present}</td>
                            <td className="px-3 py-2 tabular-nums">{c.late}</td>
                            <td className="px-3 py-2 tabular-nums">{c.absent}</td>
                            <td className="px-3 py-2 tabular-nums">{c.excused}</td>
                            <td className="px-3 py-2 tabular-nums">{pct(c.absence_percent)}</td>
                            <td className="py-2 ps-3">
                              <Badge tone={attendanceTone[c.status]}>{attendanceLabel(t, c.status)}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <Link href={`/students/${row.student_id}`} className={cn(buttonClass("soft", "sm"), "mt-4")}>
                  {t("Report card")}
                </Link>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

/** Share of absences with the warning and limit marks. */
async function AbsenceBar({ percent, status, warning, limit }: { percent: number; status: AttendanceStanding; warning: number; limit: number }) {
  const t = await getT();
  const scaleMax = Math.max(limit * 1.5, percent, 10);
  const at = (value: number) => `${Math.min(100, (value / scaleMax) * 100)}%`;
  return (
    <span className="block" title={t("Absences: {percent}%", { percent: Math.round(percent * 10) / 10 })}>
      <span className="mb-1 block text-xs font-semibold tabular-nums">{pct(percent)}</span>
      <span className="relative block h-2 overflow-hidden rounded-full bg-surface-3">
        <span className={cn("block h-full rounded-full", barTone[status])} style={{ width: at(percent) }} />
        <span aria-hidden className="absolute inset-y-0 w-0.5 bg-warning" style={{ insetInlineStart: at(warning) }} />
        <span aria-hidden className="absolute inset-y-0 w-0.5 bg-danger" style={{ insetInlineStart: at(limit) }} />
      </span>
    </span>
  );
}
