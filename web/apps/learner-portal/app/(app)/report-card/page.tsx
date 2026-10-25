import Link from "next/link";
import { Award, BookOpen, CalendarCheck, CalendarX2, Clock, GraduationCap, Medal, School, Sparkles, Trophy, UserRound, Users } from "lucide-react";
import type { ReportCard, ReportCardSubject } from "@educloud/api-client";
import { Badge, Card, EmptyState, FadeIn, HeroBanner, SectionHeading, Stagger, StaggerItem, buttonClass, cn, firstName } from "@educloud/ui";
import { requireAudience } from "@educloud/portal-kit/session";
import { getI18n, getT } from "@educloud/ui/locale";
import { PrintButton } from "@/components/site/print-button";
import { ScoreBar } from "@/components/academics/meters";
import { AbsenceTimeline } from "@/components/academics/absence-timeline";
import { TONE_SOFT, TONE_TEXT, attendanceStatusLabel, attendanceTone, formatPercent, formatScore, loadReportCard, rankText, scoreTone, standingExplanation, standingLabel, standingTone, usesGpa } from "@/lib/academics";

export async function generateMetadata() {
  const t = await getT();
  const { workspace } = await requireAudience("learner", "/staff-account");
  return { title: workspace.role === "parent" ? t("Report card") : t("My grades") };
}

/**
 * The report card: overall average or GPA with a standing, ranks in the class,
 * level and school, every subject against its pass mark, and recent absences.
 * Prints cleanly on one or two pages.
 */
export default async function ReportCardPage() {
  const { api, workspace } = await requireAudience("learner", "/staff-account");
  const { t, fmt } = await getI18n();
  const isParent = workspace.role === "parent";
  const card = await loadReportCard(() => api.reportCard());

  if (!card) {
    return (
      <EmptyState
        icon={<GraduationCap className="h-6 w-6" />}
        title={isParent ? t("No student linked yet") : t("No report card yet")}
        description={isParent ? t("Ask the school office to link your child to your account. Their grades and attendance will appear here.") : t("Once you're enrolled in subjects and your teachers post grades, your report card will appear here.")}
      />
    );
  }

  const child = isParent ? firstName(card.student.name) : null;
  const gpa = usesGpa(card.settings);
  const overall = card.overall;
  const group = card.class_group;
  const graded = card.subjects.filter((s) => s.percent != null);
  const passedCount = graded.filter((s) => s.passed).length;

  const ranks = [
    { key: "group", icon: Users, label: t("In my class"), parentLabel: t("In the class"), place: card.ranks.group, hint: group?.name },
    { key: "level", icon: School, label: t("In my year"), parentLabel: t("In the year"), place: card.ranks.level, hint: group?.level?.name },
    { key: "school", icon: Trophy, label: t("In the school"), parentLabel: t("In the school"), place: card.ranks.school, hint: workspace.tenant.name },
  ].filter((r) => r.place);

  return (
    <div data-print-root className="print:text-[12px]">
      <FadeIn>
        <HeroBanner
          className="print:mb-4 print:border-line print:bg-none print:p-4"
          eyebrow={
            <>
              <GraduationCap className="h-3.5 w-3.5" /> {workspace.tenant.name}
              {group && ` · ${[group.level?.name, group.name].filter(Boolean).join(" · ")}`}
            </>
          }
          title={child ? t("{name}'s report card", { name: child }) : t("Your report card")}
          subtitle={child ? t("How {name} is doing in every subject, side by side.", { name: child }) : t("Every subject in one place. Be proud of the progress you've made!")}
          meta={
            <>
              {isParent && <span className="font-semibold">{card.student.name}</span>}
              {group?.advisor && (
                <span className="inline-flex items-center gap-1.5">
                  <UserRound className="h-4 w-4" /> {t("Class advisor: {name}", { name: group.advisor.name })}
                </span>
              )}
              {group?.room && <span className="text-ink-muted">{t("Room {room}", { room: group.room })}</span>}
              <span className="text-ink-muted">{fmt.date(new Date())}</span>
            </>
          }
          actions={
            <div className="flex flex-wrap gap-3 print:hidden">
              <PrintButton />
              <Link href="/attendance" className={buttonClass("ghost")}>
                <CalendarCheck className="h-4 w-4" /> {t("Attendance")}
              </Link>
            </div>
          }
        />
      </FadeIn>

      {/* Overall + ranks */}
      <div className="mb-10 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] print:mb-6 print:grid-cols-2">
        <FadeIn>
          <Card className="relative h-full overflow-hidden shadow-[var(--shadow-soft)] print:shadow-none">
            <div aria-hidden className="absolute -end-12 -top-12 h-40 w-40 rounded-full bg-brand-500/8 print:hidden" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="grid h-28 w-28 shrink-0 place-items-center rounded-[1.75rem] bg-brand-600 text-white shadow-[var(--shadow-glow)] print:border print:border-brand-600 print:bg-transparent print:text-brand-700 print:shadow-none">
                <div className="text-center">
                  <p className="font-display text-3xl font-bold leading-none tabular-nums">{overall ? formatScore(overall, card.settings.grading_scale, fmt) : "—"}</p>
                  <p className="mt-1 text-xs font-semibold opacity-85">{gpa ? t("GPA") : t("Average")}</p>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {overall?.letter && <span className="rounded-lg bg-peach px-2.5 py-0.5 font-display text-lg font-bold text-brand-700 dark:text-brand-300">{overall.letter}</span>}
                  {overall && (
                    <Badge tone={standingTone(overall.standing)} className="text-sm">
                      {overall.standing === "honors" ? <Award className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />} {standingLabel(overall.standing, t)}
                    </Badge>
                  )}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  {overall ? standingExplanation(overall.standing, t, child) : child ? t("No grades have been posted for {name} yet.", { name: child }) : t("No grades have been posted yet. They'll show up here as your teachers mark your work.")}
                </p>
                {overall && (
                  <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    {gpa && overall.average != null && <Fact label={t("Average")} value={formatPercent(overall.average, fmt)} />}
                    {gpa && overall.credits > 0 && <Fact label={t("Credits earned")} value={t("{earned} of {total}", { earned: overall.credits_earned, total: overall.credits })} />}
                    <Fact label={t("Subjects passed")} value={t("{earned} of {total}", { earned: passedCount, total: graded.length })} />
                    <Fact label={t("Attendance")} value={formatPercent(overall.attendance_rate, fmt)} />
                  </dl>
                )}
              </div>
            </div>
          </Card>
        </FadeIn>

        {ranks.length > 0 ? (
          <Stagger className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {ranks.map(({ key, icon: Icon, label, parentLabel, place, hint }) => {
              const text = rankText(place, t);
              const top = place?.rank != null && place.rank <= 3;
              return (
                <StaggerItem key={key}>
                  <Card className={cn("flex h-full items-center gap-3 shadow-[var(--shadow-soft)] xl:flex-col xl:items-start print:shadow-none", top && "border-brand-300/70 bg-peach/40 dark:border-brand-800")}>
                    <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", top ? "bg-brand-600 text-white" : "bg-brand-600/10 text-brand-700 dark:text-brand-300")}>
                      {top ? <Medal className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-ink-muted">{isParent ? parentLabel : label}</p>
                      <p className="font-display text-xl font-bold tabular-nums">{text ?? "—"}</p>
                      {hint && <p className="truncate text-xs text-ink-muted">{hint}</p>}
                    </div>
                  </Card>
                </StaggerItem>
              );
            })}
          </Stagger>
        ) : (
          <Card className="flex items-center text-sm text-ink-muted">{t("Ranks appear once grades are posted.")}</Card>
        )}
      </div>

      {/* Subjects */}
      <section aria-labelledby="subjects-heading" className="mb-10 print:mb-6">
        <SectionHeading
          title={<span id="subjects-heading">{t("Subjects")}</span>}
          description={t("Each bar shows the overall mark; the dark line is the pass mark.")}
        />
        {card.subjects.length === 0 ? (
          <EmptyState icon={<BookOpen className="h-6 w-6" />} title={t("Not enrolled in any courses yet")} />
        ) : (
          <Card className="p-0 shadow-[var(--shadow-soft)] print:shadow-none">
            <div className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,2fr)_6rem_7rem_6rem] gap-4 border-b border-line px-5 py-3 text-xs font-semibold text-ink-muted lg:grid print:grid">
              <span>{t("Subject")}</span>
              <span>{t("Mark")}</span>
              <span>{t("Result")}</span>
              <span>{t("Attendance")}</span>
              <span className="text-end">{t("Rank")}</span>
            </div>
            <ul className="divide-y divide-line">
              {card.subjects.map((s) => (
                <SubjectRow key={s.course.id} subject={s} card={card} />
              ))}
            </ul>
          </Card>
        )}
      </section>

      {/* Absences */}
      <section aria-labelledby="absences-heading" className="print:break-inside-avoid">
        <SectionHeading title={<span id="absences-heading">{t("Recent absences and lates")}</span>} href="/attendance" linkLabel={t("Attendance")} className="print:[&_a]:hidden" />
        {card.absences.length === 0 ? (
          <Card className="flex items-center gap-3 text-sm text-ink-muted">
            <CalendarCheck className="h-5 w-5 text-success" /> {child ? t("{name} hasn't missed a lesson. Wonderful!", { name: child }) : t("You haven't missed a lesson. Keep it up!")}
          </Card>
        ) : (
          <AbsenceTimeline absences={card.absences.slice(0, 8)} />
        )}
      </section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

async function SubjectRow({ subject: s, card }: { subject: ReportCardSubject; card: ReportCard }) {
  const { t, fmt } = await getI18n();
  const pass = s.course.pass_percent ?? 50;
  const tone = scoreTone(s.percent, pass);
  const att = s.attendance;
  const attTone = attendanceTone(att?.status);
  const gpa = usesGpa(card.settings);
  const credits = s.credit_hours ?? s.course.credit_hours;

  return (
    <li className="grid grid-cols-1 gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,2fr)_6rem_7rem_6rem] lg:items-center lg:gap-4 print:grid-cols-[minmax(0,2.2fr)_minmax(0,2fr)_6rem_7rem_6rem] print:items-center print:py-2.5">
      <div className="min-w-0">
        <p className="truncate font-semibold">{s.course.subject ?? s.course.title}</p>
        <p className="truncate text-xs text-ink-muted">
          {[s.course.subject ? s.course.title : s.course.code, s.course.teacher?.name].filter(Boolean).join(" · ")}
          {gpa && credits != null && ` · ${t("{count} credits", { count: credits })}`}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <ScoreBar
          value={s.percent ?? null}
          pass={pass}
          tone={tone === "neutral" ? "neutral" : tone}
          className="flex-1"
          label={t("{subject}: {percent}", { subject: s.course.subject ?? s.course.title, percent: formatPercent(s.percent, fmt) })}
          passLabel={t("Pass mark {percent}%", { percent: pass })}
        />
        <span className={cn("w-14 shrink-0 text-end font-display text-base font-bold tabular-nums", TONE_TEXT[tone])}>{s.percent == null ? "—" : formatPercent(s.percent, fmt)}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 lg:contents print:contents">
        <span className="flex items-center gap-1.5">
          {s.letter && <span className="rounded-md bg-surface-3 px-1.5 py-0.5 text-xs font-bold">{s.letter}</span>}
          {s.percent == null ? (
            <Badge>{t("Not graded yet")}</Badge>
          ) : s.passed ? (
            <Badge tone="success">{t("Passed")}</Badge>
          ) : (
            <Badge tone="danger">{t("Below pass")}</Badge>
          )}
        </span>
        <span>
          {att && att.sessions > 0 ? (
            <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold", TONE_SOFT[attTone])} title={attendanceStatusLabel(att.status, t)}>
              {att.status === "ok" ? <CalendarCheck className="h-3 w-3" /> : att.status === "warning" ? <Clock className="h-3 w-3" /> : <CalendarX2 className="h-3 w-3" />}
              {formatPercent(att.rate, fmt)}
            </span>
          ) : (
            <span className="text-xs text-ink-muted">—</span>
          )}
        </span>
        <span className="ms-auto text-end text-sm font-semibold tabular-nums text-ink-muted lg:ms-0 print:ms-0">
          {rankText({ rank: s.rank, of: s.of }, t) ?? "—"}
        </span>
      </div>
    </li>
  );
}
