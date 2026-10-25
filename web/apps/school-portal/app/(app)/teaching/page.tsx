import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  ClipboardCheck,
  Clock,
  Crown,
  Flag,
  GraduationCap,
  Home,
  Inbox,
  Medal,
  Presentation,
  Sparkles,
  Target,
  Trophy,
  Users,
  Video,
} from "lucide-react";
import type { TeachingOverview } from "@educloud/api-client";
import { Avatar, Badge, Card, Countdown, EmptyState, FadeIn, HeroBanner, ProgressBar, SectionHeading, Stagger, StaggerItem, StatCard, bannerButtonClass, buttonClass, cn, firstName, type Translate } from "@educloud/ui";
import { getContext } from "@educloud/portal-kit/session";
import { getI18n, getT } from "@educloud/ui/locale";
import { Meter, ScoreRing } from "@/components/meter";
import { formatScore, pct, rateTone, round1, scoreTone, standingLabel, standingTone } from "@/lib/academic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("My teaching") };
}

type Reason = TeachingOverview["at_risk"][number]["reasons"][number];

function reasonText(t: Translate, reason: Reason) {
  const course = reason.course ?? t("overall");
  const value = reason.value == null ? "" : `${round1(reason.value)}%`;
  if (reason.type === "failing") return t("Failing {course} ({value})", { course, value });
  if (reason.type === "absence_limit") return t("Over the absence limit in {course} ({value})", { course, value });
  return t("Many absences in {course} ({value})", { course, value });
}

/**
 * A teacher's day at a glance: today's lessons with their plans, what still
 * needs doing (attendance, marking), how each class is doing, and which
 * students need a hand or deserve a shout-out.
 */
export default async function TeachingPage() {
  const { api, me, workspace, can } = await getContext();
  if (!can("courses.manage")) notFound();
  const { t, fmt } = await getI18n();
  const [overview, structure] = await Promise.all([api.teachingOverview(), api.academicStructure().catch(() => null)]);
  const scale = structure?.settings.grading_scale ?? "percent";
  const { today, upcoming, needs_attendance, to_review, classes, at_risk, top_students, totals } = overview;
  const toMark = to_review.reduce((sum, r) => sum + r.count, 0);
  const next = today.find((l) => l.status === "live") ?? today.find((l) => l.status === "scheduled");

  return (
    <>
      <FadeIn>
        <HeroBanner
          eyebrow={
            <>
              <Presentation className="h-3.5 w-3.5" /> {fmt.date(new Date(), { weekday: "long", month: "long", day: "numeric" })} · {workspace.tenant.name}
            </>
          }
          title={t("Good to see you, {name}", { name: firstName(me.name) })}
          subtitle={
            today.length
              ? t("Lessons today: {count}. Here is your plan, your classes and who needs you.", { count: today.length })
              : t("No lessons today. A good moment to catch up on marking and check in on your classes.")
          }
          meta={
            <>
              <span className="inline-flex items-center gap-1.5">
                <CalendarCheck className="h-4 w-4 text-brand-600 dark:text-brand-300" /> {t("Attendance to take: {count}", { count: needs_attendance.length })}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Inbox className="h-4 w-4 text-brand-600 dark:text-brand-300" /> {t("Exams to mark: {count}", { count: toMark })}
              </span>
              {at_risk.length > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-danger" /> {t("Students at risk: {count}", { count: at_risk.length })}
                </span>
              )}
            </>
          }
          actions={
            <>
              {next && (
                <Link href={`/live/${next.id}`} className={bannerButtonClass()}>
                  <Video className="h-4 w-4" /> {next.status === "live" ? t("Open lesson room") : t("Next lesson")}
                </Link>
              )}
              <Link href="/live" className={bannerButtonClass(next ? "outline" : "solid")}>
                <CalendarPlus className="h-4 w-4" /> {t("Schedule a live lesson")}
              </Link>
              <Link href="/rankings" className={bannerButtonClass("outline")}>
                <Trophy className="h-4 w-4" /> {t("Rankings")}
              </Link>
            </>
          }
          art={
            <div aria-hidden className="relative grid h-44 w-48 place-items-center">
              <div className="absolute inset-0 rounded-[2rem] border-2 border-dashed border-brand-300/80 dark:border-brand-700" />
              <div className="relative grid h-32 w-32 place-items-center rounded-[1.75rem] fill-brand text-white shadow-[var(--shadow-lift)]">
                <Presentation className="h-14 w-14" />
              </div>
              <span className="absolute -end-2 top-4 grid h-11 w-11 place-items-center rounded-2xl bg-surface text-brand-600 shadow-[var(--shadow-lift)]">
                <Sparkles className="h-5 w-5" />
              </span>
              <span className="absolute -start-3 bottom-5 grid h-11 w-11 place-items-center rounded-2xl bg-surface text-brand-600 shadow-[var(--shadow-lift)]">
                <GraduationCap className="h-5 w-5" />
              </span>
            </div>
          }
        />
      </FadeIn>

      <Stagger className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StaggerItem>
          <StatCard label={t("Courses")} value={totals.courses} icon={<BookOpen className="h-5 w-5" />} />
        </StaggerItem>
        <StaggerItem>
          <StatCard label={t("Students")} value={totals.students} icon={<Users className="h-5 w-5" />} />
        </StaggerItem>
        <StaggerItem>
          <StatCard label={t("Live lessons this week")} value={totals.lessons_this_week} icon={<Video className="h-5 w-5" />} accent="live" />
        </StaggerItem>
        <StaggerItem>
          <StatCard label={t("Class average")} value={pct(totals.average)} icon={<Target className="h-5 w-5" />} />
        </StaggerItem>
        <StaggerItem className="col-span-2 lg:col-span-1">
          <StatCard label={t("Attendance rate")} value={pct(totals.attendance_rate)} icon={<CalendarCheck className="h-5 w-5" />} tone={totals.attendance_rate < 75 ? "danger" : undefined} />
        </StaggerItem>
      </Stagger>

      <div className="mb-10 grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_23rem]">
        {/* Today */}
        <section aria-labelledby="today-heading" className="min-w-0">
          <SectionHeading title={<span id="today-heading">{t("Today's lessons")}</span>} description={t("Your plan for each lesson: unit, objectives and homework.")} href="/calendar" linkLabel={t("Calendar")} />
          {today.length === 0 ? (
            <EmptyState
              icon={<CalendarClock className="h-6 w-6" />}
              title={t("Nothing scheduled today")}
              description={upcoming.length ? t("Your next lesson is listed under Coming up.") : t("Schedule a live lesson and add a plan for it.")}
              action={
                <Link href="/live" className={buttonClass("primary", "sm")}>
                  <CalendarPlus className="h-4 w-4" /> {t("Schedule a live lesson")}
                </Link>
              }
            />
          ) : (
            <Stagger as="ol" className="relative space-y-4 before:absolute before:inset-y-3 before:start-[1.1rem] before:w-0.5 before:rounded-full before:bg-brand-200 dark:before:bg-brand-900 sm:before:start-[1.35rem]">
              {today.map((lesson) => {
                const live = lesson.status === "live";
                const done = lesson.status === "ended";
                return (
                  <StaggerItem as="li" key={lesson.id} className="relative flex gap-3 sm:gap-4">
                    <span
                      className={cn(
                        "relative z-10 mt-4 grid h-9 w-9 shrink-0 place-items-center rounded-full shadow-[var(--shadow-soft)] sm:h-11 sm:w-11",
                        live ? "bg-live-500 text-white" : done ? "bg-success text-white" : "fill-brand text-white",
                      )}
                    >
                      {live ? <Video className="h-4 w-4" /> : done ? <ClipboardCheck className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                    </span>
                    <Link
                      href={`/live/${lesson.id}`}
                      className={cn(
                        "group block min-w-0 flex-1 rounded-[1.25rem] border bg-surface p-4 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] sm:p-5",
                        live ? "border-live-500/50" : "border-line",
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                        <span className="font-display text-base font-bold tabular-nums text-ink">{fmt.time(lesson.scheduled_at)}</span>
                        <span>{t("{count} min", { count: lesson.duration_minutes })}</span>
                        {lesson.course && <span className="font-semibold text-brand-600 dark:text-brand-300">{lesson.course.subject ?? lesson.course.title}</span>}
                        <span className="ms-auto">
                          {live ? <Badge tone="live">{t("Live now")}</Badge> : done ? <Badge tone="success">{t("Held")}</Badge> : <Badge tone="brand"><Countdown to={lesson.scheduled_at} /></Badge>}
                        </span>
                      </div>
                      <h3 className="mt-2 font-display text-lg font-bold leading-snug text-heading">{lesson.title}</h3>
                      {lesson.unit && (
                        <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-peach px-2.5 py-0.5 text-xs font-semibold text-brand-700 dark:text-brand-300">
                          <BookOpen className="h-3.5 w-3.5" /> {lesson.unit}
                        </p>
                      )}
                      {lesson.objectives.length > 0 && (
                        <div className="mt-3">
                          <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.08em] text-ink-muted">{t("Objectives")}</p>
                          <ul className="space-y-1 text-sm">
                            {lesson.objectives.map((o, i) => (
                              <li key={i} className="flex gap-2">
                                <Target className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" /> <span>{o}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {lesson.homework && (
                        <p className="mt-3 flex gap-2 rounded-xl bg-surface-2 p-3 text-sm">
                          <Home className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                          <span>
                            <span className="font-semibold">{t("Homework")}: </span>
                            {lesson.homework}
                          </span>
                        </p>
                      )}
                      {!lesson.unit && lesson.objectives.length === 0 && !lesson.homework && (
                        <p className="mt-2 text-sm text-ink-muted">{t("No plan yet. Open the lesson to add objectives and homework.")}</p>
                      )}
                      <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 dark:text-brand-300">
                        {live ? t("Open lesson room") : t("Lesson details")} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
                      </span>
                    </Link>
                  </StaggerItem>
                );
              })}
            </Stagger>
          )}

          {upcoming.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-3 font-display font-bold">{t("Coming up")}</h3>
              <Card className="p-2">
                <ul>
                  {upcoming.slice(0, 6).map((l) => (
                    <li key={l.id}>
                      <Link href={`/live/${l.id}`} className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-surface-3/70">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-peach text-center text-brand-700 dark:text-brand-300">
                          <span className="text-[10px] font-bold uppercase leading-none">{fmt.date(l.scheduled_at, { month: "short" })}</span>
                          <span className="font-display text-base font-bold leading-none">{fmt.date(l.scheduled_at, { day: "numeric" })}</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{l.title}</span>
                          <span className="block truncate text-xs text-ink-muted">
                            {[fmt.time(l.scheduled_at), l.course?.subject ?? l.course?.title, l.unit].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          )}
        </section>

        {/* To do */}
        <aside className="space-y-6">
          <section aria-labelledby="attendance-todo">
            <SectionHeading title={<span id="attendance-todo">{t("Attendance to take")}</span>} />
            {needs_attendance.length === 0 ? (
              <Card className="flex items-center gap-3 text-sm text-ink-muted">
                <CalendarCheck className="h-5 w-5 text-success" /> {t("All caught up. Every class has its roll call.")}
              </Card>
            ) : (
              <Card className="p-2">
                <ul>
                  {needs_attendance.slice(0, 8).map((s) => (
                    <li key={s.id}>
                      <Link href={`/courses/${s.course_id}?tab=attendance&session=${s.id}`} className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-surface-3/70">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warning/12 text-warning">
                          <CalendarCheck className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{s.course?.subject ?? s.course?.title ?? t("Class session")}</span>
                          <span className="block truncate text-xs text-ink-muted">{[fmt.dateTime(s.starts_at), s.topic].filter(Boolean).join(" · ")}</span>
                        </span>
                        <span className={buttonClass("soft", "sm")}>{t("Take")}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </section>

          <section aria-labelledby="marking-todo">
            <SectionHeading title={<span id="marking-todo">{t("Exams to mark")}</span>} />
            {to_review.length === 0 ? (
              <Card className="flex items-center gap-3 text-sm text-ink-muted">
                <ClipboardCheck className="h-5 w-5 text-success" /> {t("Nothing waiting for your marks.")}
              </Card>
            ) : (
              <Card className="p-2">
                <ul>
                  {to_review.map((r) => (
                    <li key={r.assessment.id}>
                      <Link href={`/courses/${r.assessment.course_id}/exams/${r.assessment.id}?tab=results`} className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-surface-3/70">
                        <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500/12 text-brand-700 dark:text-brand-300">
                          <Inbox className="h-4 w-4" />
                          <span className="absolute -end-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-live-500 px-1 text-[10px] font-bold text-white">{r.count}</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{r.assessment.title}</span>
                          <span className="block truncate text-xs text-ink-muted">
                            {[r.course?.title, r.oldest ? t("Waiting since {time}", { time: fmt.relative(r.oldest) }) : null].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        <span className={buttonClass("soft", "sm")}>{t("Mark")}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </section>
        </aside>
      </div>

      {/* Classes */}
      <section aria-labelledby="classes-heading" className="mb-10">
        <SectionHeading title={<span id="classes-heading">{t("My classes")}</span>} description={t("Average, pass rate and attendance for every subject you teach.")} href="/courses" linkLabel={t("All courses")} />
        {classes.length === 0 ? (
          <EmptyState icon={<BookOpen className="h-6 w-6" />} title={t("No courses yet")} />
        ) : (
          <Stagger className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
            {classes.map((c) => {
              const planned = c.lessons_count ?? 0;
              const held = c.lessons_done_count ?? 0;
              return (
                <StaggerItem key={c.id}>
                  <Link href={`/courses/${c.id}`} className="group flex h-full flex-col rounded-[1.25rem] border border-line bg-surface p-4 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] sm:p-5">
                    <div className="flex items-start gap-3">
                      <ScoreRing value={c.average} label={c.average == null ? "—" : `${Math.round(c.average)}%`} tone={c.average == null ? "neutral" : scoreTone(c.average) === "danger" ? "danger" : scoreTone(c.average) === "success" ? "success" : "brand"} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-brand-600 dark:text-brand-300">{[c.code, c.subject].filter(Boolean).join(" · ")}</p>
                        <h3 className="line-clamp-2 font-display font-bold leading-snug text-heading">{c.title}</h3>
                        <p className="mt-1 flex flex-wrap gap-1.5">
                          {c.level && <Badge>{c.level.name}</Badge>}
                          {c.class_group && <Badge tone="brand">{c.class_group.name}</Badge>}
                          {c.credit_hours != null && <Badge>{t("Credit hours: {count}", { count: c.credit_hours })}</Badge>}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3">
                      <Meter label={t("Pass rate")} value={c.pass_rate} tone={c.pass_rate == null ? "neutral" : c.pass_rate >= 75 ? "success" : c.pass_rate >= 50 ? "warning" : "danger"} />
                      <Meter label={t("Attendance rate")} value={c.attendance_rate} tone={rateTone(c.attendance_rate) === "neutral" ? "neutral" : (rateTone(c.attendance_rate) as "success" | "warning" | "danger")} />
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-3 pt-4 text-xs text-ink-muted">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" /> {t("{count} students", { count: c.enrollments_count ?? 0 })}
                      </span>
                      {c.flagged > 0 ? (
                        <Badge tone="danger">
                          <Flag className="h-3 w-3" /> {t("Flagged: {count}", { count: c.flagged })}
                        </Badge>
                      ) : (
                        <Badge tone="success">{t("No one flagged")}</Badge>
                      )}
                    </div>
                    {planned > 0 && (
                      <div className="mt-3">
                        <ProgressBar value={held} max={planned} label={t("{done}/{total} lessons", { done: held, total: planned })} />
                        <p className="mt-1 text-end text-xs text-ink-muted">{t("{done}/{total} lessons", { done: held, total: planned })}</p>
                      </div>
                    )}
                  </Link>
                </StaggerItem>
              );
            })}
          </Stagger>
        )}
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* At risk */}
        <section aria-labelledby="risk-heading">
          <SectionHeading title={<span id="risk-heading">{t("Students who need support")}</span>} description={t("Failing a subject or missing too many lessons.")} href="/attendance?status=flagged" linkLabel={t("Attendance")} />
          {at_risk.length === 0 ? (
            <EmptyState icon={<Sparkles className="h-6 w-6" />} title={t("Everyone is on track")} description={t("No student is failing or over an absence threshold.")} />
          ) : (
            <Card className="p-2">
              <ul>
                {at_risk.map((s) => (
                  <li key={s.student_id}>
                    <Link href={`/students/${s.student_id}`} className="flex items-start gap-3 rounded-xl p-3 transition hover:bg-surface-3/70">
                      <Avatar name={s.name} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-semibold">{s.name}</span>
                          <Badge tone={standingTone[s.standing]}>{standingLabel(t, s.standing)}</Badge>
                        </span>
                        <span className="mt-1 flex flex-wrap gap-1.5">
                          {s.reasons.map((r, i) => (
                            <span key={i} className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium", r.type === "failing" || r.type === "absence_limit" ? "bg-danger/10 text-danger" : "bg-warning/12 text-warning")}>
                              {reasonText(t, r)}
                            </span>
                          ))}
                        </span>
                      </span>
                      <span className="hidden shrink-0 text-end text-xs text-ink-muted sm:block">
                        <span className="block font-semibold tabular-nums text-ink">{pct(s.average)}</span>
                        {t("Attendance {rate}", { rate: pct(s.attendance_rate) })}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>

        {/* Top students */}
        <section aria-labelledby="top-heading">
          <SectionHeading title={<span id="top-heading">{t("Top students")}</span>} description={t("The highest averages across your subjects.")} href="/rankings" linkLabel={t("Rankings")} />
          {top_students.length === 0 ? (
            <EmptyState icon={<Trophy className="h-6 w-6" />} title={t("No results yet")} description={t("Rankings appear once grades are in.")} />
          ) : (
            <Card className="p-2">
              <ol>
                {top_students.map((s, i) => {
                  const Icon = i === 0 ? Crown : i < 3 ? Medal : null;
                  return (
                    <li key={s.student_id}>
                      <Link href={`/students/${s.student_id}`} className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-surface-3/70">
                        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-sm font-bold", i === 0 ? "bg-amber-400 text-amber-950" : i === 1 ? "bg-slate-300 text-slate-800" : i === 2 ? "bg-orange-300 text-orange-900" : "bg-surface-3 text-ink-muted")}>
                          {Icon ? <Icon className="h-4 w-4" /> : (s.rank ?? i + 1)}
                        </span>
                        <Avatar name={s.name} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{s.name}</span>
                          <span className="block text-xs text-ink-muted">{t("Attendance {rate}", { rate: pct(s.attendance_rate) })}</span>
                        </span>
                        <span className="text-end">
                          <span className="block font-display font-bold tabular-nums">{formatScore(scale, s.average, s.gpa)}</span>
                          {s.letter && <span className="text-xs font-semibold text-brand-600 dark:text-brand-300">{s.letter}</span>}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </Card>
          )}
        </section>
      </div>
    </>
  );
}
