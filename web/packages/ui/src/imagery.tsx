import type { ReactNode } from "react";
import { cn } from "./components";
import { Scene, type SceneName } from "./scenes";

/*
 * Pictures in the house style: Manara line drawings (gold on navy) of places
 * and things — a desk, a classroom, a campus, a laptop — in soft arch frames
 * with a dashed ring, or as tiles with a white label. No photos of people.
 * The names below are kept from the old photo set so every caller still works.
 */

export const PHOTOS = {
  student: "study",
  studentNotebook: "study",
  teacher: "teach",
  teacherPortrait: "teach",
  parentChild: "family",
  parentDaughter: "family",
  classroom: "class",
  kidsClass: "class",
  university: "campus",
  lectureHall: "campus",
  onlineLearning: "online",
  studyNotes: "study",
} as const satisfies Record<string, SceneName>;

export type PhotoName = keyof typeof PHOTOS;

/**
 * A scene in an arch, on a soft gold disc, inside a dashed gold ring, with
 * an optional little card floating at its side ("Outstanding instructors").
 */
export function ArchPhoto({ photo, alt, badge, className }: { photo: PhotoName; alt: string; badge?: { icon: ReactNode; title: ReactNode; body?: ReactNode }; className?: string }) {
  return (
    <div className={cn("relative mx-auto aspect-[4/5] w-full max-w-[26rem]", className)}>
      <div aria-hidden className="absolute -inset-4 rounded-t-full rounded-b-[3rem] border-2 border-dashed border-brand-300/80 dark:border-brand-700" />
      <div aria-hidden className="absolute inset-x-[6%] bottom-0 top-[14%] rounded-t-full rounded-b-[2.5rem] bg-brand-100 dark:bg-brand-900/40" />
      <div className="relative h-full w-full overflow-hidden rounded-t-full rounded-b-[2.5rem] shadow-[var(--shadow-lift)]">
        <Scene name={PHOTOS[photo]} title={alt || undefined} />
      </div>
      {badge && (
        <div className="animate-float absolute -end-3 bottom-[16%] flex w-36 flex-col items-center gap-1 rounded-2xl border border-line bg-surface px-3 py-3 text-center shadow-[var(--shadow-lift)] sm:-end-8">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/50 dark:text-brand-300">{badge.icon}</span>
          <span className="text-sm font-semibold text-brand-600 dark:text-brand-300">{badge.title}</span>
          {badge.body && <span className="text-xs text-ink-muted">{badge.body}</span>}
        </div>
      )}
    </div>
  );
}

/** A scene card with a dark wash and a white title at the bottom ("Top categories"). */
export function PhotoTile({ photo, title, subtitle, className, children }: { photo: PhotoName; title: ReactNode; subtitle?: ReactNode; className?: string; children?: ReactNode }) {
  return (
    <div className={cn("group relative isolate flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-2xl bg-surface-3 p-4 text-white shadow-[var(--shadow-soft)]", className)}>
      <div aria-hidden className="absolute inset-0 -z-10 transition-transform duration-700 ease-out group-hover:scale-105">
        <Scene name={PHOTOS[photo]} />
      </div>
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0f1b33]/90 via-[#0f1b33]/25 to-transparent" />
      <h3 className="text-lg font-semibold !text-white">{title}</h3>
      {subtitle && <p className="mt-0.5 text-sm text-white/80">{subtitle}</p>}
      {children}
    </div>
  );
}

/** A small gold heading eyebrow with the swoosh, used above section titles. */
export function Swoosh({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 120 12" preserveAspectRatio="none" className={cn("h-2.5 w-24 text-brand-500 rtl:-scale-x-100", className)}>
      <path d="M2 9 C 30 3, 70 2, 118 6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
