import type { ReactNode } from "react";
import { BookOpen, CalendarDays, Clock3, Layers, Users } from "lucide-react";
import type { Course, LiveLesson } from "@educloud/api-client";
import { CourseCover, FadeIn, HeroBanner, LessonList, ProgressBar, Stars, type LessonListItem } from "@educloud/ui";
import { getI18n } from "@educloud/ui/locale";


/**
 * The Campus lesson page frame: a teal banner with the course's title and
 * progress, the pastel lesson list on the side, and the page's tabs beside it.
 */
export async function CourseLayout({ course, lessons, children, actions }: { course: Course; lessons: LiveLesson[]; children: ReactNode; actions?: ReactNode }) {
  const { t, fmt } = await getI18n();
  const planned = lessons.filter((l) => l.status !== "canceled").sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const done = planned.filter((l) => l.status === "ended").length;
  const nextId = planned.find((l) => l.status === "live" || l.status === "scheduled")?.id;
  const rating = course.reviews_avg_rating == null ? null : Number(course.reviews_avg_rating);

  const items: LessonListItem[] = planned.map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    meta: fmt.date(lesson.scheduled_at, { month: "short", day: "numeric" }),
    href: `/live/${lesson.id}`,
    state: lesson.status === "ended" ? "done" : lesson.status === "live" ? "live" : lesson.id === nextId ? "next" : "upcoming",
    active: lesson.id === nextId,
  }));

  return (
    <>
      <FadeIn>
        <HeroBanner
          eyebrow={
            <>
              <BookOpen className="h-3.5 w-3.5" /> {[...new Set([course.code, course.subject, course.category].filter(Boolean))].join(" · ")}
            </>
          }
          title={course.title}
          subtitle={course.description ?? undefined}
          meta={
            <>
              {course.teacher && <span className="font-semibold">{course.teacher.name}</span>}
              {(course.academic_level || course.class_group) && (
                <span className="inline-flex items-center gap-1.5">
                  <Layers className="h-4 w-4" /> {[course.academic_level?.name, course.class_group?.name].filter(Boolean).join(" · ")}
                </span>
              )}
              {course.credit_hours != null && <span>{t("Credit hours: {count}", { count: course.credit_hours })}</span>}
              {course.term && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" /> {course.term}
                </span>
              )}
              {course.enrollments_count != null && (
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4" /> {t("{count} students", { count: course.enrollments_count })}
                </span>
              )}
              {rating !== null && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5">
                  <Stars value={rating} className="[&_.text-amber-300\/40]:text-white/40" /> {rating.toFixed(1)} ({course.reviews_count})
                </span>
              )}
            </>
          }
          actions={actions}
          art={<CourseCover seed={course.title} category={course.category} size="lg" className="h-40 w-60 rounded-3xl shadow-[var(--shadow-lift)] ring-4 ring-white/25" />}
        />
      </FadeIn>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[19rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[1.25rem] border border-line bg-surface p-4 shadow-[var(--shadow-soft)]">
            <div className="mb-4">
              <p className="flex items-center justify-between text-xs font-semibold text-ink-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5" /> {t("Course progress")}
                </span>
                <span className="tabular-nums">
                  {done}/{planned.length}
                </span>
              </p>
              <ProgressBar value={done} max={Math.max(planned.length, 1)} className="mt-2 h-2" />
            </div>
            <LessonList title={t("Lessons")} items={items} empty={t("No lessons scheduled yet.")} />
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </>
  );
}
