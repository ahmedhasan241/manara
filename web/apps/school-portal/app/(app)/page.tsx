import Link from "next/link";
import { AlertTriangle, ArrowRight, BookOpen, CalendarCheck, CalendarClock, CalendarDays, CalendarPlus, Inbox, Megaphone, Presentation, Rocket, Users, Video } from "lucide-react";
import { Badge, BannerArt, Card, Carousel, ContinueCard, Countdown, EmptyState, FadeIn, HeroBanner, SectionHeading, Stagger, StaggerItem, StatCard, asKey, bannerButtonClass, buttonClass, firstName } from "@educloud/ui";
import { getContext } from "@educloud/portal-kit/session";
import { CourseTile } from "@educloud/portal-kit/course-tile";
import { formatLessonTime } from "@educloud/portal-kit/lesson-card";
import { getFormat, getI18n, getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Dashboard") };
}

export default async function DashboardPage() {
  const fmt = await getFormat();
  const { api, me, workspace, isStaff, can } = await getContext();
  const { t } = await getI18n();
  const [courses, announcements, lessons, teaching] = await Promise.all([
    api.courses(),
    api.announcements(),
    api.upcomingLessons().catch(() => []),
    can("courses.manage") ? api.teachingOverview().catch(() => null) : Promise.resolve(null),
  ]);

  const deadlines = announcements.data
    .filter((a) => a.deadline_at && new Date(a.deadline_at) > new Date())
    .sort((a, b) => a.deadline_at!.localeCompare(b.deadline_at!))
    .slice(0, 5);
  const enrollments = courses.data.reduce((sum, c) => sum + (c.enrollments_count ?? 0), 0);
  const next = lessons.find((l) => l.status === "live") ?? lessons.find((l) => l.status === "scheduled");
  const thisWeek = lessons.filter((l) => new Date(l.scheduled_at).getTime() - Date.now() < 7 * 86_400_000).length;

  return (
    <>
      <FadeIn>
        <HeroBanner
          eyebrow={`${fmt.date(new Date(), { weekday: "long", month: "long", day: "numeric" })} · ${workspace.tenant.name}`}
          title={`${t("Welcome back")}, ${firstName(me.name)}`}
          subtitle={next ? (next.status === "live" ? t("Your class is live right now.") : t("Here is what is coming up next in your classroom.")) : t("Plan a live lesson, post an update or check in on your courses.")}
          meta={
            next && (
              <>
                {next.status === "live" ? <Badge tone="live">{t("Live now")}</Badge> : <Video className="h-4 w-4" />}
                <span className="font-semibold">{next.title}</span>
                <span className="inline-flex items-center gap-1.5 text-ink-muted">
                  <CalendarClock className="h-4 w-4" /> {formatLessonTime(next, fmt)}
                </span>
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
                  <Video className="h-4 w-4" /> {next.status === "live" ? t("Open lesson room") : t("Lesson details")}
                </Link>
              )}
              {can("courses.manage") && (
                <Link href="/live" className={bannerButtonClass(next ? "outline" : "solid")}>
                  <CalendarPlus className="h-4 w-4" /> {t("Schedule a live lesson")}
                </Link>
              )}
              <Link href="/calendar" className={bannerButtonClass("outline")}>
                <CalendarDays className="h-4 w-4" /> {t("Open calendar")}
              </Link>
            </>
          }
          art={<BannerArt photo="teacherPortrait" />}
        />
      </FadeIn>

      {teaching && (
        <FadeIn delay={0.05} className="mb-10">
          <Link href="/teaching" className="group flex flex-col gap-4 rounded-[1.25rem] border border-line bg-surface p-4 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] sm:flex-row sm:items-center sm:p-5">
            <span className="flex items-center gap-3 sm:flex-1">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl fill-brand text-white">
                <Presentation className="h-6 w-6" />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-lg font-bold text-heading">{t("My teaching")}</span>
                <span className="block text-sm text-ink-muted">{t("Today's plan, marking, attendance and students who need support.")}</span>
              </span>
            </span>
            <span className="flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 font-medium">
                <Video className="h-4 w-4 text-brand-500" /> {t("Lessons today: {count}", { count: teaching.today.length })}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 font-medium">
                <Inbox className="h-4 w-4 text-brand-500" /> {t("Exams to mark: {count}", { count: teaching.to_review.reduce((sum, r) => sum + r.count, 0) })}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 font-medium">
                <CalendarCheck className="h-4 w-4 text-brand-500" /> {t("Attendance to take: {count}", { count: teaching.needs_attendance.length })}
              </span>
              {teaching.at_risk.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-danger/10 px-3 py-1 font-medium text-danger">
                  <AlertTriangle className="h-4 w-4" /> {t("Students at risk: {count}", { count: teaching.at_risk.length })}
                </span>
              )}
              <ArrowRight className="ms-1 hidden h-5 w-5 text-brand-600 transition-transform group-hover:translate-x-0.5 sm:block rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
            </span>
          </Link>
        </FadeIn>
      )}

      {courses.data.length > 0 && (
        <section aria-labelledby="progress-heading" className="mb-10">
          <Carousel
            label={t("Teaching progress")}
            heading={<SectionHeading title={<span id="progress-heading">{t("Teaching progress")}</span>} description={t("Lessons held so far in each course.")} href="/courses" linkLabel={t("See all")} />}
          >
            {courses.data.map((c) => (
              <ContinueCard
                key={c.id}
                href={`/courses/${c.id}`}
                title={c.title}
                category={c.category}
                teacher={c.teacher?.name}
                done={c.lessons_done_count ?? 0}
                total={c.lessons_count ?? 0}
                progressLabel={c.lessons_count ? t("Lesson {done} of {total}").replace("{done}", String(c.lessons_done_count ?? 0)).replace("{total}", String(c.lessons_count)) : t("No lessons yet")}
              />
            ))}
          </Carousel>
        </section>
      )}

      {isStaff && courses.total === 0 && can("courses.manage") && (
        <FadeIn delay={0.1} className="mb-8">
          <Card className="relative overflow-hidden border-brand-300/60">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-600 text-white">
                <Rocket className="h-6 w-6" />
              </span>
              <div>
                <h2 className="font-display text-lg font-bold">{t("Get started in three steps")}</h2>
                <ol className="mt-2 list-decimal space-y-1 ps-5 text-sm text-ink-muted">
                  <li>{t("Create your first course.")}</li>
                  <li>{t("Invite your students and enroll them.")}</li>
                  <li>{t("Schedule a live lesson — it's recorded and added to the course for you.")}</li>
                </ol>
                <Link href="/courses?new=1" className={`${buttonClass("primary", "sm")} mt-4`}>
                  {t("Create a course")}
                </Link>
              </div>
            </div>
          </Card>
        </FadeIn>
      )}

      <Stagger className="mb-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <StatCard label={isStaff ? t("Courses") : t("My courses")} value={courses.total} icon={<BookOpen className="h-5 w-5" />} />
        </StaggerItem>
        <StaggerItem>
          <StatCard label={t("Live lessons this week")} value={thisWeek} icon={<Video className="h-5 w-5" />} accent="live" />
        </StaggerItem>
        <StaggerItem>
          {isStaff ? (
            <StatCard label={t("Enrollments")} value={enrollments} icon={<Users className="h-5 w-5" />} accent="accent" />
          ) : (
            <StatCard label={t("Upcoming deadlines")} value={deadlines.length} icon={<CalendarClock className="h-5 w-5" />} accent="accent" />
          )}
        </StaggerItem>
        <StaggerItem>
          <StatCard label={t("Announcements")} value={announcements.total} icon={<Megaphone className="h-5 w-5" />} accent="amber" />
        </StaggerItem>
      </Stagger>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_22rem]">
        <section aria-labelledby="courses-heading">
          <SectionHeading title={<span id="courses-heading">{isStaff ? t("Courses") : t("My courses")}</span>} href="/courses" linkLabel={t("See all")} />
          {courses.data.length === 0 ? (
            <EmptyState icon={<BookOpen className="h-6 w-6" />} title={t("No courses yet")} />
          ) : (
            <Stagger className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
              {courses.data.slice(0, 6).map((c) => (
                <StaggerItem key={c.id}>
                  <CourseTile course={c} />
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </section>

        <aside className="space-y-6">
          <section aria-labelledby="lessons-heading">
            <SectionHeading title={<span id="lessons-heading">{t("Upcoming lessons")}</span>} href="/calendar" linkLabel={t("Calendar")} />
            <Card className="p-2">
              {lessons.length === 0 ? (
                <p className="p-3 text-sm text-ink-muted">{t("No live lessons scheduled.")}</p>
              ) : (
                <ul>
                  {lessons.slice(0, 5).map((l) => (
                    <li key={l.id}>
                      <Link href={`/live/${l.id}`} className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-surface-3/70">
                        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white ${l.status === "live" ? "bg-live-500" : "banner-brand"}`}>
                          <Video className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{l.title}</span>
                          <span className="block text-xs text-ink-muted">{l.status === "live" ? t("Live now") : <Countdown to={l.scheduled_at} />}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          <section aria-labelledby="deadlines-heading">
            <SectionHeading title={<span id="deadlines-heading">{t("Upcoming deadlines")}</span>} />
            {deadlines.length === 0 ? (
              <Card className="text-sm text-ink-muted">{t("Nothing due. Enjoy the calm.")}</Card>
            ) : (
              <Stagger className="space-y-2">
                {deadlines.map((a) => (
                  <StaggerItem key={a.id}>
                    <Card className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold">{a.title}</p>
                        {a.priority !== "normal" && <Badge tone={a.priority === "urgent" ? "danger" : "warning"}>{t(asKey(a.priority))}</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-ink-muted">
                        {t("Due")}{" "}<Countdown to={a.deadline_at!} />
                      </p>
                    </Card>
                  </StaggerItem>
                ))}
              </Stagger>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
