import Link from "next/link";
import { ArrowRight, BookOpen, Building2, Star, Users } from "lucide-react";
import { type CatalogInstructorSummary } from "@educloud/api-client";
import { asKey, cn } from "@educloud/ui";
import { getI18n } from "@educloud/ui/locale";
import { ORG_LABELS } from "@/lib/viewer";

/** "Dr. Sara Mansour" → "SM": initials without titles. */
function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((part) => !/^(mr|mrs|ms|miss|mx|dr|prof|sir)\.?$/i.test(part))
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** An instructor's initials in a gold circle inside a dashed ring. */
export function InstructorAvatar({ name, size = "md", className }: { name: string; size?: "md" | "lg"; className?: string }) {
  const box = size === "lg" ? "h-36 w-36 text-4xl" : "h-20 w-20 text-xl";
  return (
    <span className={cn("relative grid shrink-0 place-items-center rounded-full", box, className)}>
      <span aria-hidden className="absolute -inset-2 rounded-full border-2 border-dashed border-brand-300 dark:border-brand-700" />
      <span className="grid h-full w-full place-items-center rounded-full bg-brand-600 font-display font-bold text-white shadow-[var(--shadow-glow)]">{initials(name)}</span>
    </span>
  );
}

/** A directory card: avatar, name, headline, where they teach, subjects and numbers. */
export async function InstructorCard({ instructor }: { instructor: CatalogInstructorSummary }) {
  const { t, fmt } = await getI18n();
  return (
    <Link href={`/instructor/${instructor.id}`} className="lift press group flex h-full flex-col rounded-[1.5rem] border border-line bg-surface p-6 text-center">
      <InstructorAvatar name={instructor.name} className="mx-auto" />
      <h3 className="mt-5 font-display text-lg font-semibold group-hover:text-brand-700 dark:group-hover:text-brand-300">{instructor.name}</h3>
      {instructor.headline && <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{instructor.headline}</p>}
      {instructor.organization && (
        <p className="mt-2 text-xs leading-relaxed text-ink-muted">
          <Building2 className="me-1 inline h-3.5 w-3.5 align-[-2px]" />
          {instructor.organization.name} · {t(ORG_LABELS[instructor.organization.type])}
        </p>
      )}
      {instructor.categories.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          {instructor.categories.slice(0, 3).map((c) => (
            <span key={c} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
              {t(asKey(c))}
            </span>
          ))}
        </div>
      )}
      <div className="mt-auto pt-5">
        <div className="grid grid-cols-3 gap-2 border-t border-line pt-4 text-xs text-ink-muted">
          <span className="flex flex-col items-center gap-1">
            <BookOpen className="h-4 w-4 text-brand-500" /> {t("{count} courses", { count: instructor.courses })}
          </span>
          <span className="flex flex-col items-center gap-1">
            <Users className="h-4 w-4 text-brand-500" /> {t("{count} learners", { count: instructor.students })}
          </span>
          <span className="flex flex-col items-center gap-1">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {instructor.rating !== null ? fmt.number(instructor.rating, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : t("New")}
          </span>
        </div>
      </div>
      <span className="mt-4 inline-flex items-center justify-center gap-1 text-sm font-semibold text-brand-600 dark:text-brand-300">
        {t("View profile")} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
      </span>
    </Link>
  );
}
