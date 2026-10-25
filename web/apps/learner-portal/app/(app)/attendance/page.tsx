import Link from "next/link";
import { AlertTriangle, CalendarCheck, CalendarX2, CheckCircle2, Clock, Info, ShieldCheck } from "lucide-react";
import type { AttendanceStats, ReportCardSubject } from "@educloud/api-client";
import { Badge, Card, EmptyState, FadeIn, HeroBanner, SectionHeading, Stagger, StaggerItem, StatCard, buttonClass, cn, firstName } from "@educloud/ui";
import { requireAudience } from "@educloud/portal-kit/session";
import { getI18n, getT } from "@educloud/ui/locale";
import { ThresholdBar } from "@/components/academics/meters";
import { AbsenceTimeline } from "@/components/academics/absence-timeline";
import { attendanceStatusLabel, attendanceTone, formatPercent, loadReportCard, TONE_SOFT } from "@/lib/academics";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Attendance") };
}

/**
 * Attendance per subject against the school's warning and limit lines, the
 * rules in plain words, and a timeline of recent absences and lates.
 */
export default async function AttendancePage() {
  const { api, workspace } = await requireAudience("learner", "/staff-account");
  const { t, fmt } = await getI18n();
  const isParent = workspace.role === "parent";
  const card = await loadReportCard(() => api.reportCard());

  if (!card) {
    return (
      <EmptyState
        icon={<CalendarCheck className="h-6 w-6" />}
        title={isParent ? t("No student linked yet") : t("No attendance yet")}
        description={isParent ? t("Ask the school office to link your child to your account. Their grades and attendance will appear here.") : t("Attendance appears here once your lessons begin.")}
      />
    );
  }

  const child = isParent ? firstName(card.student.name) : null;
  const { absence_warning_percent: warning, absence_limit_percent: limit, late_after_minutes: lateAfter } = card.settings;
  const subjects = card.subjects.filter((s): s is ReportCardSubject & { attendance: AttendanceStats } => !!s.attendance);
  const totals = subjects.reduce(
    (sum, s) => ({ sessions: sum.sessions + s.attendance.sessions, present: sum.present + s.attendance.present, late: sum.late + s.attendance.late, absent: sum.absent + s.attendance.absent, excused: sum.excused + s.attendance.excused }),
    { sessions: 0, present: 0, late: 0, absent: 0, excused: 0 },
  );
  const flagged = subjects.filter((s) => s.attendance.status !== "ok");
  const rate = card.overall?.attendance_rate ?? (totals.sessions ? Math.round(((totals.present + totals.late) / totals.sessions) * 1000) / 10 : null);
  // Worst first, so anything worth a look is at the top.
  const sorted = [...subjects].sort((a, b) => b.attendance.absence_percent - a.attendance.absence_percent);

  return (
    <>
      <FadeIn>
        <HeroBanner
          eyebrow={
            <>
              <CalendarCheck className="h-3.5 w-3.5" /> {workspace.tenant.name}
            </>
          }
          title={child ? t("{name}'s attendance", { name: child }) : t("Your attendance")}
          subtitle={
            flagged.length > 0
              ? child
                ? t("{name} has missed quite a few lessons in some subjects. Every lesson from now on helps.", { name: child })
                : t("You've missed quite a few lessons in some subjects. Every lesson you join from now on helps!")
              : child
                ? t("{name} is showing up for lessons. Thank you for the support at home!", { name: child })
                : t("Showing up is half the work, and you're doing great.")
          }
          meta={
            rate != null && (
              <span className="rounded-full bg-surface px-3 py-1 font-semibold text-brand-700 shadow-[var(--shadow-soft)] dark:text-brand-300">
                {t("{percent} attendance overall", { percent: formatPercent(rate, fmt) })}
              </span>
            )
          }
          actions={
            <Link href="/report-card" className={buttonClass("secondary")}>
              {isParent ? t("Report card") : t("My grades")}
            </Link>
          }
        />
      </FadeIn>

      <Stagger className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StaggerItem>
          <StatCard label={t("Present")} value={totals.present} icon={<CheckCircle2 className="h-5 w-5" />} />
        </StaggerItem>
        <StaggerItem>
          <StatCard label={t("Late")} value={totals.late} icon={<Clock className="h-5 w-5" />} />
        </StaggerItem>
        <StaggerItem>
          <StatCard label={t("Absent")} value={totals.absent} icon={<CalendarX2 className="h-5 w-5" />} tone={totals.absent > 0 ? "danger" : undefined} />
        </StaggerItem>
        <StaggerItem>
          <StatCard label={t("Excused")} value={totals.excused} icon={<ShieldCheck className="h-5 w-5" />} />
        </StaggerItem>
      </Stagger>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="subjects-heading">
          <SectionHeading title={<span id="subjects-heading">{t("By subject")}</span>} description={t("The bar shows the share of lessons missed in each subject.")} />
          {sorted.length === 0 ? (
            <EmptyState icon={<CalendarCheck className="h-6 w-6" />} title={t("No classes recorded yet")} />
          ) : (
            <Stagger as="ul" className="space-y-3">
              {sorted.map((s) => {
                const a = s.attendance;
                const tone = attendanceTone(a.status);
                return (
                  <StaggerItem as="li" key={s.course.id}>
                    <Card className={cn("shadow-[var(--shadow-soft)]", a.status === "limit" && "border-danger/40", a.status === "warning" && "border-warning/40")}>
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{s.course.subject ?? s.course.title}</p>
                          <p className="truncate text-xs text-ink-muted">{[s.course.subject ? s.course.title : s.course.code, s.course.teacher?.name].filter(Boolean).join(" · ")}</p>
                        </div>
                        <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold", TONE_SOFT[tone])}>
                          {a.status !== "ok" && <AlertTriangle className="h-3 w-3" />}
                          {a.sessions === 0 ? t("No lessons yet") : attendanceStatusLabel(a.status, t)}
                        </span>
                      </div>
                      <ThresholdBar
                        value={a.absence_percent}
                        warning={warning}
                        limit={limit}
                        label={t("{percent} of lessons missed", { percent: formatPercent(a.absence_percent, fmt) })}
                        warningLabel={`${warning}%`}
                        limitLabel={`${limit}%`}
                      />
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
                        <span className="font-semibold">{t("{percent} of lessons missed", { percent: formatPercent(a.absence_percent, fmt) })}</span>
                        <span className="flex flex-wrap gap-x-3 gap-y-1 text-ink-muted">
                          <span>{t("{count} lessons", { count: a.sessions })}</span>
                          <span className="text-success">{t("Present {count}", { count: a.present })}</span>
                          <span className="text-warning">{t("Late {count}", { count: a.late })}</span>
                          <span className="text-danger">{t("Absent {count}", { count: a.absent })}</span>
                          <span>{t("Excused {count}", { count: a.excused })}</span>
                        </span>
                      </div>
                    </Card>
                  </StaggerItem>
                );
              })}
            </Stagger>
          )}
        </section>

        <aside className="space-y-8">
          <section aria-labelledby="rules-heading">
            <SectionHeading title={<span id="rules-heading">{t("How attendance works")}</span>} />
            <Card className="space-y-3 bg-sky/50 text-sm dark:bg-surface">
              <Rule icon={<Clock className="h-4 w-4" />} tone="text-warning">
                {t("Joining an online lesson more than {minutes} minutes after it starts counts as late.", { minutes: lateAfter })}
              </Rule>
              <Rule icon={<Info className="h-4 w-4" />} tone="text-warning">
                {child ? t("Missing {percent}% of the lessons in a subject brings a warning, and the school lets you know.", { percent: warning }) : t("Missing {percent}% of the lessons in a subject brings a warning, so you and your family know early.", { percent: warning })}
              </Rule>
              <Rule icon={<AlertTriangle className="h-4 w-4" />} tone="text-danger">
                {child ? t("Missing {percent}% or more of the lessons in a subject puts your child at risk in that subject.", { percent: limit }) : t("Missing {percent}% or more of the lessons in a subject puts you at risk in that subject.", { percent: limit })}
              </Rule>
              <Rule icon={<ShieldCheck className="h-4 w-4" />} tone="text-brand-600 dark:text-brand-300">
                {t("Excused absences and lates don't count towards these limits.")}
              </Rule>
            </Card>
          </section>

          <section aria-labelledby="timeline-heading">
            <SectionHeading title={<span id="timeline-heading">{t("Recent absences and lates")}</span>} />
            {card.absences.length === 0 ? (
              <Card className="flex items-center gap-3 text-sm text-ink-muted">
                <Badge tone="success">
                  <CheckCircle2 className="h-3 w-3" />
                </Badge>
                {child ? t("{name} hasn't missed a lesson. Wonderful!", { name: child }) : t("You haven't missed a lesson. Keep it up!")}
              </Card>
            ) : (
              <AbsenceTimeline absences={card.absences} />
            )}
          </section>
        </aside>
      </div>
    </>
  );
}

function Rule({ icon, tone, children }: { icon: React.ReactNode; tone: string; children: React.ReactNode }) {
  return (
    <p className="flex gap-3">
      <span className={cn("mt-0.5 shrink-0", tone)}>{icon}</span>
      <span className="leading-relaxed">{children}</span>
    </p>
  );
}
