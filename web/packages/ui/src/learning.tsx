"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, GraduationCap, Lock, PlayCircle, Star, Users } from "lucide-react";
import { Avatar, cn } from "./components";
import { PHOTOS, type PhotoName } from "./imagery";
import { Scene, sceneFor } from "./scenes";
import { TINTS, TINT_ORDER, categoryIcon, hash, tintFor, type Tint } from "./learning-utils";
import { useT } from "./i18n-provider";
import { asKey } from "./translate";

/*
 * Learning building blocks: illustrated course covers, progress bars, the
 * page banner, course and category cards, ratings and
 * the pastel lesson list. Client components (they translate their own text);
 * helpers that server code calls live in learning-utils.ts.
 */

/**
 * Course artwork: a Manara line drawing for the subject (maths, science,
 * medicine, code…) under a soft navy wash, with the category's icon in a
 * small gold badge. Stable per course.
 */
export function CourseCover({
  seed,
  category,
  className,
  children,
  size = "md",
}: {
  seed: string;
  category?: string | null;
  className?: string;
  children?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const Icon = categoryIcon(category ?? seed);
  const badge = { sm: "h-7 w-7 [&_svg]:h-3.5 [&_svg]:w-3.5", md: "h-9 w-9 [&_svg]:h-4.5 [&_svg]:w-4.5", lg: "h-12 w-12 [&_svg]:h-6 [&_svg]:w-6" }[size];

  return (
    <div className={cn("relative isolate overflow-hidden bg-surface-3", className)}>
      <div aria-hidden className="absolute inset-0 -z-10 transition-transform duration-700 ease-out group-hover:scale-105">
        <Scene name={sceneFor(category, seed)} />
      </div>
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0f1b33]/45 via-transparent to-transparent" />
      <span aria-hidden className={cn("pointer-events-none absolute bottom-3 start-3 grid place-items-center rounded-xl bg-brand-600 text-white shadow-[var(--shadow-soft)]", badge)}>
        <Icon strokeWidth={2} />
      </span>
      {children}
    </div>
  );
}

export function ProgressBar({ value, max = 100, className, label }: { value: number; max?: number; className?: string; label?: string }) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-brand-500/12", className)}
    >
      <div className="h-full rounded-full bg-brand-500 transition-[width] duration-700" style={{ width: `${percent}%` }} />
    </div>
  );
}

/**
 * The page banner: a soft peach band with a greeting or page title, a short
 * line, actions and optional artwork. Buttons inside use `bannerButtonClass`.
 */
export function HeroBanner({
  eyebrow,
  title,
  subtitle,
  meta,
  actions,
  art,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  art?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("band-peach animate-rise-in relative isolate mb-8 overflow-hidden rounded-[1.75rem] border border-brand-100 p-6 text-ink sm:p-8 dark:border-line", className)}>
      <div aria-hidden className="absolute -end-20 -top-24 -z-10 h-72 w-72 rounded-full border-2 border-dashed border-brand-200 dark:border-brand-900" />
      <div className="flex flex-col gap-6 md:flex-row md:items-center">
        <div className="min-w-0 flex-1">
          {eyebrow && <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-brand-700 shadow-[var(--shadow-soft)] dark:text-brand-300">{eyebrow}</p>}
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl lg:text-[2.1rem] lg:leading-tight">{title}</h1>
          {subtitle && <p className="mt-2 max-w-2xl text-base text-ink-muted">{subtitle}</p>}
          {meta && <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink">{meta}</div>}
          {actions && <div className="mt-6 flex flex-wrap gap-3">{actions}</div>}
        </div>
        {art && <div className="hidden shrink-0 animate-rise-in [animation-delay:0.55s] md:block">{art}</div>}
      </div>
    </section>
  );
}

/** Banner artwork: a small scene in the arch frame (the study desk unless another is given). */
export function BannerArt({ photo = "studentNotebook" }: { photo?: PhotoName }) {
  return (
    <div aria-hidden className="relative h-44 w-40">
      <div className="absolute -inset-2 rounded-t-full rounded-b-3xl border-2 border-dashed border-brand-300/80 dark:border-brand-700" />
      <div className="relative h-full w-full overflow-hidden rounded-t-full rounded-b-3xl shadow-[var(--shadow-lift)]">
        <Scene name={PHOTOS[photo]} />
      </div>
      <span className="absolute -start-4 bottom-3 grid h-11 w-11 place-items-center rounded-2xl bg-brand-600 text-white shadow-[var(--shadow-lift)]">
        <GraduationCap className="h-6 w-6" />
      </span>
    </div>
  );
}

export function SectionHeading({ title, description, href, linkLabel = "See all", actions, className }: {
  title: ReactNode;
  description?: ReactNode;
  href?: string;
  linkLabel?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("reveal mb-4 flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="font-display text-lg font-bold tracking-tight sm:text-xl">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {actions}
        {href && (
          <Link href={href} className="group inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-300">
            {linkLabel}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * "Continue learning" card: cover, title, teacher and lesson progress.
 */
export function ContinueCard({
  href,
  title,
  category,
  teacher,
  done,
  total,
  progressLabel,
  className,
}: {
  href: string;
  title: string;
  category?: string | null;
  teacher?: string | null;
  done: number;
  total: number;
  /** e.g. "Lesson 5 of 7"; defaults to English. */
  progressLabel?: string;
  className?: string;
}) {
  const t = useT();
  return (
    <Link
      href={href}
      className={cn(
        "group block rounded-[1.25rem] border border-line bg-surface p-3 shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]",
        className,
      )}
    >
      <CourseCover seed={title} category={category} className="h-36 rounded-2xl">
        <span className="absolute bottom-3 end-3 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-brand-600 opacity-0 shadow-[var(--shadow-soft)] transition-all duration-300 group-hover:opacity-100">
          <PlayCircle className="h-6 w-6" />
        </span>
      </CourseCover>
      <div className="px-1 pb-1 pt-3">
        <p className="line-clamp-1 font-semibold text-heading">{title}</p>
        {teacher && (
          <p className="mt-2 flex items-center gap-2 text-xs text-ink-muted">
            <Avatar name={teacher} size="sm" className="!h-6 !w-6 !text-[10px]" />
            <span className="truncate">{teacher}</span>
          </p>
        )}
        <ProgressBar value={done} max={Math.max(total, 1)} className="mt-3" label={progressLabel} />
        <p className="mt-1.5 text-end text-xs text-ink-muted">{progressLabel ?? (total ? t("Lesson {done} of {total}", { done, total }) : t("No lessons yet"))}</p>
      </div>
    </Link>
  );
}

/**
 * Course card: cover with category chip, title, description, teacher and stats.
 */
export function CourseCard({
  href,
  title,
  code,
  category,
  description,
  teacher,
  lessons,
  rating,
  students,
  badge,
  footer,
  className,
}: {
  href: string;
  title: string;
  code?: string;
  category?: string | null;
  description?: string | null;
  teacher?: string | null;
  lessons?: { done: number; total: number; label?: string };
  rating?: { value: number | null; count: number };
  students?: number;
  badge?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const t = useT();
  return (
    <div className={cn("lift group relative flex flex-col rounded-[1.25rem] border border-line bg-surface p-3", className)}>
      <CourseCover seed={title} category={category} className="h-40 rounded-2xl">
        {badge && <div className="absolute start-3 top-3">{badge}</div>}
      </CourseCover>
      <div className="flex flex-1 flex-col px-1 pb-1 pt-3">
        <div className="flex items-center justify-between gap-2 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1.5 truncate">
            <span className={cn("grid h-5 w-5 place-items-center rounded-md", TINTS[tintFor(category ?? title)])}>
              {(() => {
                const Icon = categoryIcon(category ?? title);
                return <Icon className="h-3 w-3" />;
              })()}
            </span>
            {category ? t(asKey(category)) : code}
          </span>
          {lessons && (
            <span className="inline-flex shrink-0 items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" /> {lessons.label ?? t("{count} lessons", { count: lessons.total })}
            </span>
          )}
        </div>
        <Link href={href} className="mt-2 line-clamp-2 font-semibold leading-snug text-heading after:absolute after:inset-0 after:rounded-[1.25rem]">
          {title}
        </Link>
        {description && <p className="mt-1.5 line-clamp-2 text-sm text-ink-muted">{description}</p>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          {teacher ? (
            <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
              <Avatar name={teacher} size="sm" />
              <span className="truncate">{teacher}</span>
            </span>
          ) : (
            <span />
          )}
          <span className="flex shrink-0 items-center gap-3 text-xs text-ink-muted">
            {rating && rating.value !== null && (
              <span className="inline-flex items-center gap-1 font-semibold text-ink">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {rating.value.toFixed(1)}
                <span className="font-normal text-ink-muted">({rating.count})</span>
              </span>
            )}
            {students !== undefined && (
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> {students}
              </span>
            )}
          </span>
        </div>
        {lessons && lessons.total > 0 && <ProgressBar value={lessons.done} max={lessons.total} className="mt-3" />}
        {footer && <div className="relative mt-3">{footer}</div>}
      </div>
    </div>
  );
}

/** "Choose from top categories" tile: pastel icon square, name and count. */
export function CategoryTile({ href, title, iconKey, description, count, tint, active }: {
  href: string;
  title: string;
  /** Untranslated category name, for picking the icon (defaults to the title). */
  iconKey?: string;
  description?: string;
  count?: ReactNode;
  tint?: Tint;
  active?: boolean;
}) {
  const Icon = categoryIcon(iconKey ?? title);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "lift group flex flex-col items-center rounded-[1.25rem] border bg-surface px-4 py-6 text-center",
        active ? "border-brand-400 ring-4 ring-brand-500/10" : "border-line",
      )}
    >
      <span className={cn("grid h-14 w-14 place-items-center rounded-2xl transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110", TINTS[tint ?? tintFor(title)])}>
        <Icon className="h-7 w-7" />
      </span>
      <span className="mt-4 font-semibold text-heading">{title}</span>
      {description && <span className="mt-1 line-clamp-2 text-xs text-ink-muted">{description}</span>}
      {count !== undefined && <span className="mt-2 text-xs font-semibold text-brand-600 dark:text-brand-300">{count}</span>}
    </Link>
  );
}

export function Stars({ value, className, size = "sm" }: { value: number; className?: string; size?: "sm" | "md" }) {
  const t = useT();
  const box = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} role="img" aria-label={t("{rating} out of 5", { rating: value.toFixed(1) })}>
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = Math.max(0, Math.min(1, value - n + 1));
        return (
          <span key={n} className={cn("relative", box)}>
            <Star className={cn("absolute inset-0 text-amber-300/40", box)} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className={cn("fill-amber-400 text-amber-400", box)} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** The ratings card: big average, stars and a bar per star level. */
export function RatingSummary({ average, count, breakdown, labels }: {
  average: number | null;
  count: number;
  breakdown: Record<string, number>;
  labels?: { outOf?: string; reviews?: string; none?: string };
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
      <div className="shrink-0 rounded-2xl bg-brand-500/8 px-6 py-5 text-center">
        <p className="font-display text-4xl font-bold text-heading">{average !== null ? average.toFixed(1) : "–"}</p>
        <Stars value={average ?? 0} size="md" className="mt-1" />
        <p className="mt-1 text-xs text-ink-muted">{count ? `${count} ${labels?.reviews ?? "reviews"}` : (labels?.none ?? t("No reviews yet"))}</p>
      </div>
      <ul className="flex-1 space-y-2">
        {[5, 4, 3, 2, 1].map((stars) => {
          const n = breakdown[String(stars)] ?? 0;
          return (
            <li key={stars} className="flex items-center gap-3 text-sm">
              <span className="inline-flex w-12 shrink-0 items-center gap-1 font-medium">
                {stars} <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              </span>
              <ProgressBar value={n} max={Math.max(count, 1)} className="h-2" />
              <span className="w-8 shrink-0 text-end text-xs tabular-nums text-ink-muted">{n}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export interface LessonListItem {
  id: string;
  title: string;
  meta?: string;
  href?: string;
  /** done: ticked; live: pulsing; locked: not yet available. */
  state?: "done" | "live" | "next" | "upcoming" | "locked";
  active?: boolean;
}

/**
 * The pastel lesson list from the Campus lesson page: each row a tinted pill,
 * the active one solid teal.
 */
export function LessonList({ title, items, empty }: { title?: ReactNode; items: LessonListItem[]; empty?: ReactNode }) {
  const t = useT();
  return (
    <div>
      {title && <p className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-heading">{title}</p>}
      {items.length === 0 ? (
        <p className="rounded-xl bg-surface-2 px-3 py-4 text-center text-sm text-ink-muted">{empty ?? t("Nothing here yet.")}</p>
      ) : (
        <ol className="space-y-2">
          {items.map((item, i) => {
            const tint = TINTS[TINT_ORDER[i % TINT_ORDER.length]!];
            const Icon = item.state === "done" ? CheckCircle2 : item.state === "locked" ? Lock : PlayCircle;
            const body = (
              <>
                <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg", item.active ? "bg-white/20" : "bg-white/70 dark:bg-white/10")}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{item.title}</span>
                </span>
                {item.state === "live" ? (
                  <span className="rounded-full bg-live-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">{t("Live")}</span>
                ) : (
                  item.meta && <span className={cn("shrink-0 text-xs", item.active ? "text-white/85" : "opacity-75")}>{item.meta}</span>
                )}
              </>
            );
            const className = cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 transition",
              item.active ? "fill-brand text-white shadow-[var(--shadow-soft)]" : cn(tint, item.href && "hover:brightness-[0.97] hover:-translate-y-px"),
            );
            return (
              <li key={item.id}>
                {item.href ? (
                  <Link href={item.href} className={className} aria-current={item.active ? "true" : undefined}>
                    {body}
                  </Link>
                ) : (
                  <div className={className}>{body}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
