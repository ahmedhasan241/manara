import Link from "next/link";
import { BookOpen, Building2, Clock3, GraduationCap, Users } from "lucide-react";
import { type CatalogCourse, type CatalogOrganization } from "@educloud/api-client";
import { Character, CourseCard, TINTS, cn, tintFor } from "@educloud/ui";
import { LEVEL_LABELS, ORG_LABELS, formatDuration } from "@/lib/viewer";
import { getI18n, getT } from "@educloud/ui/locale";

/** A marketplace course card: cover, category, length, instructor, rating and price. */
export async function MarketCourseCard({ course, className }: { course: CatalogCourse; className?: string }) {
  const { t, fmt } = await getI18n();
  return (
    <CourseCard
      className={cn("h-full", className)}
      href={`/course/${course.slug}`}
      title={course.title}
      category={course.category}
      description={course.subtitle}
      teacher={course.instructor?.name ?? course.organization?.name ?? null}
      rating={course.reviews_count ? { value: course.rating, count: course.reviews_count } : undefined}
      students={course.students_count}
      lessons={{ done: 0, total: 0, label: formatDuration(course.duration_seconds, t) }}
      badge={<span className="rounded-lg bg-black/25 px-2 py-0.5 text-xs font-bold text-white backdrop-blur">{t(LEVEL_LABELS[course.level])}</span>}
      footer={
        <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
          <span className="flex min-w-0 items-center gap-1.5 truncate text-xs text-ink-muted">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{course.organization?.name}</span>
          </span>
          <span className={cn("shrink-0 font-display text-lg font-bold", course.price_cents === 0 ? "text-success" : "text-brand-600 dark:text-brand-300")}>{course.price_cents === 0 ? t("Free") : fmt.money(course.price_cents, course.currency)}</span>
        </div>
      }
    />
  );
}

const ORG_ICON = { school: BookOpen, university: GraduationCap, teacher: Users } as const;

export async function OrganizationCard({ org }: { org: CatalogOrganization }) {
  const t = await getT();
  const Icon = ORG_ICON[org.type];
  return (
    <Link
      href={`/explore?organization=${org.slug}`}
      className="group flex items-center gap-4 rounded-[1.25rem] border border-line bg-surface p-4 shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
    >
      <span className={cn("grid h-14 w-14 shrink-0 place-items-center rounded-2xl transition-transform group-hover:rotate-6", TINTS[tintFor(org.name)])}>
        <Icon className="h-7 w-7" />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-semibold text-heading">{org.name}</span>
        <span className="block text-xs text-ink-muted">
          {t(ORG_LABELS[org.type])} · {t("{count} courses", { count: org.courses })}
        </span>
      </span>
    </Link>
  );
}

/** Small "x lectures · 3h 20m" line. */
export async function CourseLength({ course }: { course: Pick<CatalogCourse, "lectures_count" | "duration_seconds"> }) {
  const t = await getT();
  return (
    <span className="inline-flex items-center gap-1.5">
      <Clock3 className="h-4 w-4" /> {t("{count} lectures", { count: course.lectures_count })} · {formatDuration(course.duration_seconds, t)}
    </span>
  );
}

export { Character };
