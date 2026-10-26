import Link from "next/link";
import { AlertTriangle, BookOpen, CalendarCheck, CalendarClock, CalendarDays, GraduationCap, Sparkles, Video } from "lucide-react";
import { Badge, BannerArt, Card, CategoryTile, Countdown, CourseCover, EmptyState, FadeIn, HeroBanner, ProgressBar, SectionHeading, Sparkline, Stagger, StaggerItem, Stars, StatCard, asKey, bannerButtonClass, firstName } from "@educloud/ui";
import { requireAudience } from "@educloud/portal-kit/session";
import { ProgressRing } from "@/components/progress-ring";
import { Celebration } from "@/components/celebration";
import { getI18n, getT } from "@educloud/ui/locale";
import { StandingWidget } from "@/components/academics/standing-widget";
import { loadReportCard } from "@/lib/academics";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Overview") };
}

/**
 * One learner at a glance: what's next, where they left off, averages and
 * attendance, latest grades. Parents see the child picked in the switcher.
 */
export default async function OverviewPage() {
  const { api, me, workspace } = await requireAudience("learner", "/staff-account");
  const { t } = await getI18n();
  const isParent = workspace.role === "parent";
  const [overview, lessons, card] = await Promise.all([api.learnerOverview(), api.upcomingLessons().catch(() => []), loadReportCard(() => api.reportCard()).catch(() => null)]);

  if (!overview.student) {
    return (
      <EmptyState
        icon={<Sparkles className="h-6 w-6" />}
        title={t("No student linked yet")}
        description={t("Ask the school office to link your child to your account. Their grades and attendance will appear here.")}
      />
    );
  }

  const studentName = firstName(overview.student.name);
  const next = lessons.find((l) => l.status === "live") ?? lessons.find((l) => l.status === "scheduled");
  const totals = overview.totals!;
  // A great grade in the last three days earns a little celebration.
  const star = overview.recent_grades.find((g) => g.percent >= 90 && Date.now() - new Date(g.graded_at).getTime() < 3 * 86_400_000);
  // Courses with a lesson coming up first: that's where to pick up.
  const continueCourses = [...overview.courses].sort((a, b) => (a.next_lesson?.scheduled_at ?? "9999").localeCompare(b.next_lesson?.scheduled_at ?? "9999"));
  const categories = Object.entries(
    overview.courses.reduce<Record<string, number>>((acc, c) => ({ ...acc, [c.category ?? "General"]: (acc[c.category ?? "General"] ?? 0) + 1 }), {}),
  );
  const lessonOf = (done: number, total: number) => (total ? t("Lesson {done} of {total}").replace("{done}", String(done)).replace("{total}", String(total)) : t("No lessons yet"));

  return (
    <>
      <FadeIn>
        <HeroBanner
          eyebrow={isParent ? t("Hello {name} · {school}", { name: firstName(me.name), school: workspace.tenant.name }) : workspace.tenant.name}
          title={(isParent ? t("How {name} is doing") : t("Welcome back, {name}")).replace("{name}", studentName)}
          subtitle={isParent ? t("Lessons, grades and attendance, all in one place.") : t("Ready for your next lesson?")}
          meta={
            next && (
              <>
                {next.status === "live" ? <Badge tone="live">{t("Live now")}</Badge> : <Video className="h-4 w-4" />}
                <span className="font-semibold">{next.title}</span>
                {next.course && <span className="text-ink-muted">{next.course.title}</span>}
                {next.status === "scheduled" && (
                  <span className="rounded-full bg-surface text-brand-700 dark:text-brand-300 px-2.5 py-0.5 text-xs font-semibold">
                    <Countdown to={next.scheduled_at} />
                  </span>
                )}
              </>
            )
          }
          actions={
            <>
              {next && (
                <Link href={`/live/${next.id}`} className={bannerButtonClass()}>
                  <Video className="h-4 w-4" /> {next.status === "live" && !isParent ? t("Join now") : t("Open lesson")}
                </Link>
              )}
              <Link href="/calendar" className={bannerButtonClass("outline")}>
                <CalendarDays className="h-4 w-4" /> {t("Open calendar")}
              </Link>
            </>
          }
          art={<BannerArt />}
        />
      </FadeIn>

      {star && (
        <Celebration
          gradeId={star.id}
          message={isParent ? t("{name} scored {percent}% on {assessment}", { name: studentName, percent: Math.round(star.percent), assessment: star.assessment }) : t("Brilliant! {percent}% on {assessment}", { percent: Math.round(star.percent), assessment: star.assessment })}
        />
      )}

      {overview.alerts.length > 0 && (
        <FadeIn delay={0.05} className="mb-8">
          <Card className="border-warning/40 bg-warning/5">
            <div className="flex gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warning/15 text-warning">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold">{t("Worth a look")}</p>
                <ul className="mt-1 space-y-0.5 text-sm text-ink-muted">
                  {overview.alerts.map((a) => (
                    <li key={a.message}>{a.message}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </FadeIn>
      )}


      <Stagger className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StaggerItem>
          <StatCard
            label={t("Overall average")}
            value={totals.grade_average == null ? "—" : `${totals.grade_average}%`}
            icon={<GraduationCap className="h-5 w-5" />}
            meter={totals.grade_average}
            tone={totals.grade_average == null ? undefined : totals.grade_average >= 80 ? "success" : totals.grade_average >= 60 ? undefined : "danger"}
            href="/report-card"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label={t("Attendance")}
            value={totals.attendance_rate == null ? "—" : `${totals.attendance_rate}%`}
            icon={<CalendarCheck className="h-5 w-5" />}
            accent="accent"
            meter={totals.attendance_rate}
            tone={totals.attendance_rate == null ? undefined : totals.attendance_rate >= 90 ? "success" : totals.attendance_rate >= 75 ? "warning" : "danger"}
            href="/attendance"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard label={t("Courses")} value={totals.courses} icon={<BookOpen className="h-5 w-5" />} accent="amber" href="/courses" />
        </StaggerItem>
        <StaggerItem>
          <StatCard label={t("Upcoming live lessons")} value={totals.upcoming_lessons} icon={<Video className="h-5 w-5" />} accent="live" href="/calendar" />
        </StaggerItem>
      </Stagger>

      {card && (
        <FadeIn delay={0.08}>
          <StandingWidget card={card} child={isParent ? studentName : null} />
        </FadeIn>
      )}

      <div className="mb-10 grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="courses-heading" className="min-w-0">
          <SectionHeading title={<span id="courses-heading">{t("Continue learning")}</span>} href="/courses" linkLabel={t("See all")} />
          {overview.courses.length === 0 ? (
            <EmptyState icon={<BookOpen className="h-6 w-6" />} title={t("Not enrolled in any courses yet")} />
          ) : (
            <Stagger className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {continueCourses.map((c) => (
                <StaggerItem key={c.id}>
                  <Link
                    href={`/courses/${c.id}`}
                    className="group block overflow-hidden rounded-[1.25rem] border border-line bg-surface shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
                  >
                    <CourseCover seed={c.title} category={c.category} size="sm" className="h-20" />
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-brand-600 dark:text-brand-300">
                            {c.code}
                            {c.category && <span className="font-medium text-ink-muted"> · {t(asKey(c.category))}</span>}
                          </p>
                          <p className="truncate font-display text-lg font-bold text-heading group-hover:text-brand-600 dark:group-hover:text-brand-300">{c.title}</p>
                          <p className="text-sm text-ink-muted">{c.teacher ?? t("Teacher to be assigned")}</p>
                          {c.rating !== null && (
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
                              <Stars value={c.rating} /> {c.rating.toFixed(1)} ({c.reviews_count})
                            </p>
                          )}
                        </div>
                        <ProgressRing value={c.grade_average} label={t("Average")} />
                      </div>
                      <div className="mt-4 space-y-3">
                        <div>
                          <div className="mb-1 flex justify-between text-xs font-medium text-ink-muted">
                            <span>{t("Lessons")}</span>
                            <span className="tabular-nums">{lessonOf(c.lessons_done_count, c.lessons_count)}</span>
                          </div>
                          <ProgressBar value={c.lessons_done_count} max={Math.max(c.lessons_count, 1)} className="h-2" />
                        </div>
                        <div>
                          <div className="mb-1 flex justify-between text-xs font-medium text-ink-muted">
                            <span>{t("Attendance")}</span>
                            <span className="tabular-nums">{c.attendance_rate == null ? "—" : `${c.attendance_rate}%`}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                            <div
                              className={`h-full rounded-full ${c.attendance_rate == null ? "" : c.attendance_rate >= 90 ? "bg-success" : c.attendance_rate >= 75 ? "bg-warning" : "bg-danger"}`}
                              style={{ width: `${c.attendance_rate ?? 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      {c.grade_trend.length > 1 && (
                        <div className="mt-4">
                          <p className="mb-1 text-xs font-medium text-ink-muted">{t("Grade trend")}</p>
                          <Sparkline values={c.grade_trend} label={t("Grade trend in {course}", { course: c.title })} />
                        </div>
                      )}
                      {c.next_lesson && (
                        <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-300">
                          <Video className="h-3.5 w-3.5" /> {c.next_lesson.status === "live" ? t("Live now") : <Countdown to={c.next_lesson.scheduled_at} />} · {c.next_lesson.title}
                        </p>
                      )}
                    </div>
                  </Link>
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </section>

        <aside className="space-y-8">
          <section aria-labelledby="grades-heading">
            <SectionHeading title={<span id="grades-heading">{t("Latest grades")}</span>} />
            <Card className="p-2">
              {overview.recent_grades.length === 0 ? (
                <p className="p-3 text-sm text-ink-muted">{t("No grades posted yet.")}</p>
              ) : (
                <ul>
                  {overview.recent_grades.map((g) => (
                    <li key={g.id} className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-surface-2">
                      <span
                        className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl font-display text-sm font-bold ${g.percent >= 80 ? "bg-success/12 text-success" : g.percent >= 60 ? "bg-brand-500/12 text-brand-700 dark:text-brand-300" : "bg-danger/10 text-danger"}`}
                      >
                        {Math.round(g.percent)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{g.assessment}</span>
                        <span className="block truncate text-xs text-ink-muted">
                          {g.course} · {g.score}/{g.max_score}
                        </span>
                        {g.feedback && <span className="mt-0.5 block truncate text-xs italic text-ink-muted">“{g.feedback}”</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          <section aria-labelledby="deadlines-heading">
            <SectionHeading title={<span id="deadlines-heading">{t("Coming up")}</span>} href="/calendar" linkLabel={t("Calendar")} />
            {overview.deadlines.length === 0 ? (
              <Card className="text-sm text-ink-muted">{t("No deadlines right now.")}</Card>
            ) : (
              <Stagger className="space-y-2">
                {overview.deadlines.map((d, i) => (
                  <StaggerItem key={d.id}>
                    <div className={`flex items-center gap-3 rounded-2xl p-4 ${["bg-sky", "bg-peach", "bg-mint", "bg-blush"][i % 4]}`}>
                      <CalendarClock className="h-5 w-5 shrink-0 text-heading/70" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-heading">{d.title}</p>
                        <p className="text-xs text-ink-muted">
                          {t("Due")}{" "}<Countdown to={d.deadline_at} />
                        </p>
                      </div>
                      {d.priority !== "normal" && <Badge tone={d.priority === "urgent" ? "danger" : "warning"}>{t(asKey(d.priority))}</Badge>}
                    </div>
                  </StaggerItem>
                ))}
              </Stagger>
            )}
          </section>
        </aside>
      </div>

      {categories.length > 1 && (
        <section aria-labelledby="categories-heading">
          <SectionHeading title={<span id="categories-heading">{t("Browse by category")}</span>} />
          <Stagger className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map(([name, count]) => (
              <StaggerItem key={name}>
                <CategoryTile href={`/courses?category=${encodeURIComponent(name)}`} title={t(asKey(name))} iconKey={name} count={t("{count} courses", { count })} />
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}
    </>
  );
}
