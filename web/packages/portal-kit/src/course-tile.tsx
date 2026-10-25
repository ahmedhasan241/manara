import Link from "next/link";
import { BookOpen } from "lucide-react";
import type { Course } from "@educloud/api-client";
import { CourseCard, EmptyState, Stagger, StaggerItem, TINTS, asKey, categoryIcon, cn, tintFor } from "@educloud/ui";
import { getT } from "@educloud/ui/locale";

/** Stable per-course colour so students recognise their courses at a glance. */
export function courseHue(id: string) {
  return [...id].reduce((h, c) => (h * 29 + c.charCodeAt(0)) % 360, 3);
}

export async function CourseTile({ course }: { course: Course }) {
  const t = await getT();
  const rating = course.reviews_avg_rating == null ? null : Number(course.reviews_avg_rating);
  const total = course.lessons_count ?? 0;

  return (
    <CourseCard
      href={`/courses/${course.id}`}
      title={course.title}
      code={course.code}
      category={course.category}
      description={course.description}
      teacher={course.teacher?.name ?? null}
      students={course.enrollments_count}
      rating={course.reviews_count ? { value: rating, count: course.reviews_count } : undefined}
      lessons={total ? { done: course.lessons_done_count ?? 0, total, label: t("{done}/{total} lessons", { done: course.lessons_done_count ?? 0, total }) } : undefined}
      badge={<span className="rounded-lg bg-black/25 px-2 py-0.5 text-xs font-bold text-white backdrop-blur">{course.code}</span>}
      footer={
        course.subject || course.academic_level || course.class_group ? (
          <span className="flex flex-wrap gap-1.5">
            {course.subject && course.subject !== course.category && <span className="rounded-md bg-brand-500/12 px-2 py-0.5 text-xs font-medium text-brand-700 dark:text-brand-200">{course.subject}</span>}
            {course.academic_level && <span className="rounded-md bg-surface-3 px-2 py-0.5 text-xs font-medium text-ink-muted">{course.academic_level.name}</span>}
            {course.class_group && <span className="rounded-md bg-surface-3 px-2 py-0.5 text-xs font-medium text-ink-muted">{course.class_group.name}</span>}
          </span>
        ) : undefined
      }
    />
  );
}

/**
 * Course grid with category pills ("All", "Science", ...) like the Campus
 * course page. Filtering is by link, so it works without JavaScript.
 */
export async function CourseCatalog({ courses, category, emptyTitle, emptyDescription, query = {} }: {
  courses: Course[];
  category?: string;
  emptyTitle: string;
  emptyDescription?: string;
  /** Other search params to keep in the pill links. */
  query?: Record<string, string | undefined>;
}) {
  const t = await getT();
  const categories = [...new Set(courses.map((c) => c.category).filter((c): c is string => !!c))].sort();
  const shown = category ? courses.filter((c) => c.category === category) : courses;
  const href = (value?: string) => {
    const params = new URLSearchParams(Object.entries({ ...query, category: value }).filter((e): e is [string, string] => !!e[1]));
    return `?${params}`;
  };

  return (
    <>
      {categories.length > 1 && (
        <nav aria-label={t("Categories")} className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-1">
          <Link
            href={href()}
            aria-current={!category ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition",
              !category ? "fill-brand border-transparent text-white shadow-[var(--shadow-soft)]" : "border-line bg-surface text-ink-muted hover:text-ink",
            )}
          >
            <BookOpen className="h-4 w-4" /> {t("All")}
            <span className={cn("rounded-full px-1.5 text-xs", !category ? "bg-white/20" : "bg-surface-3")}>{courses.length}</span>
          </Link>
          {categories.map((name) => {
            const Icon = categoryIcon(name);
            const active = category === name;
            return (
              <Link
                key={name}
                href={href(name)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition",
                  active ? "fill-brand border-transparent text-white shadow-[var(--shadow-soft)]" : "border-line bg-surface text-ink-muted hover:text-ink",
                )}
              >
                <span className={cn("grid h-6 w-6 place-items-center rounded-full", active ? "bg-white/20" : TINTS[tintFor(name)])}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                {t(asKey(name))}
              </Link>
            );
          })}
        </nav>
      )}
      {shown.length === 0 ? (
        <EmptyState icon={<BookOpen className="h-6 w-6" />} title={emptyTitle} description={emptyDescription} />
      ) : (
        <Stagger className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((c) => (
            <StaggerItem key={c.id}>
              <CourseTile course={c} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </>
  );
}
