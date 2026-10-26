import { BookOpen } from "lucide-react";
import type { Course } from "@educloud/api-client";
import { CourseCard, EmptyState, FilterChips, Stagger, StaggerItem, asKey, categoryIcon } from "@educloud/ui";
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

/** "All · Science · Languages…" pills with counts; nothing when there's one category. */
export async function CourseCategoryChips({ courses, className }: { courses: Course[]; className?: string }) {
  const t = await getT();
  const categories = [...new Set(courses.map((c) => c.category).filter((c): c is string => !!c))].sort();
  if (categories.length < 2) return null;
  return (
    <FilterChips
      param="category"
      label={t("Category")}
      className={className}
      options={[
        { label: t("All"), count: courses.length, icon: <BookOpen /> },
        ...categories.map((name) => {
          const Icon = categoryIcon(name);
          return { value: name, label: t(asKey(name)), count: courses.filter((c) => c.category === name).length, icon: <Icon /> };
        }),
      ]}
    />
  );
}

/**
 * Course grid with category pills ("All", "Science", ...) like the Campus
 * course page. Filtering is by link, so it works without JavaScript.
 */
export async function CourseCatalog({ courses, category, emptyTitle, emptyDescription, chips = true }: {
  courses: Course[];
  category?: string;
  emptyTitle: string;
  emptyDescription?: string;
  /** False when the page shows CourseCategoryChips in its header instead. */
  chips?: boolean;
}) {
  const shown = category ? courses.filter((c) => c.category === category) : courses;

  return (
    <>
      {chips && <CourseCategoryChips courses={courses} className="mb-6" />}
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
