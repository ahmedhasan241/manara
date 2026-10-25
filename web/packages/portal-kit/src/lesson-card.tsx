import Link from "next/link";
import { CalendarClock, Clock, Film, User, Users } from "lucide-react";
import type { LiveLesson } from "@educloud/api-client";
import { Badge, Countdown, type Formatters, LiveDot, asKey, cn } from "@educloud/ui";
import { LessonActions } from "./lesson-actions";
import { getFormat, getT } from "@educloud/ui/locale";

const statusTone = { scheduled: "brand", live: "live", ended: "neutral", canceled: "danger" } as const;

/** "Tue, Oct 28 · 4:30 PM" in the visitor's language. */
export function formatLessonTime(lesson: LiveLesson, fmt: Formatters) {
  return `${fmt.date(lesson.scheduled_at, { weekday: "short", month: "short", day: "numeric" })} · ${fmt.time(lesson.scheduled_at)}`;
}

/**
 * A lesson as a card: a date tile, status, countdown, and the right action for
 * the viewer (join, or start/end for the host).
 */
export async function LessonCard({ lesson, canHost, showCourse = true }: { lesson: LiveLesson; canHost: boolean; showCourse?: boolean }) {
  const fmt = await getFormat();
  const t = await getT();
  const start = new Date(lesson.scheduled_at);
  const live = lesson.status === "live";

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[var(--radius-card)] border bg-surface p-5 shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]",
        live ? "border-live-500/60 ring-4 ring-live-500/10" : "border-line hover:border-brand-300/70 dark:hover:border-brand-700",
      )}
    >
      {live && <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-live-500 bg-[length:200%_100%] animate-shimmer" />}
      <div className="flex gap-4">
        <div
          className={cn(
            "flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl text-white shadow-[var(--shadow-soft)]",
            live ? "bg-live-500" : lesson.status === "scheduled" ? "bg-brand-600" : "bg-ink-muted",
          )}
        >
          <span className="text-[11px] font-semibold uppercase opacity-90">{fmt.date(lesson.scheduled_at, { month: "short" })}</span>
          <span className="font-display text-2xl font-bold leading-none">{start.getDate()}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {live ? (
              <Badge tone="live">{t("Live")}</Badge>
            ) : (
              <Badge tone={statusTone[lesson.status]}>{t(asKey(lesson.status))}</Badge>
            )}
            {showCourse && lesson.course && <span className="truncate text-xs font-semibold text-brand-600 dark:text-brand-300">{lesson.course.code}</span>}
            {lesson.status === "scheduled" && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted">
                <Clock className="h-3.5 w-3.5" /> <Countdown to={lesson.scheduled_at} />
              </span>
            )}
          </div>
          <Link href={`/live/${lesson.id}`} className="mt-1.5 block font-display text-lg font-bold leading-snug hover:text-brand-600 dark:hover:text-brand-300">
            {lesson.title}
          </Link>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5" /> {formatLessonTime(lesson, fmt)} · {t("{count} min", { count: lesson.duration_minutes })}
            </span>
            {lesson.host && (
              <span className="inline-flex items-center gap-1">
                <User className="h-3.5 w-3.5" /> {lesson.host.name}
              </span>
            )}
            {lesson.attendees_count != null && lesson.status !== "scheduled" && (
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> {t("{count} joined", { count: lesson.attendees_count })}
              </span>
            )}
            {!!lesson.recordings_count && (
              <span className="inline-flex items-center gap-1 text-accent-600 dark:text-accent-400">
                <Film className="h-3.5 w-3.5" /> {t("{count} recordings", { count: lesson.recordings_count })}
              </span>
            )}
            {live && (
              <span className="inline-flex items-center gap-1.5 font-semibold text-live-600">
                <LiveDot /> {t("Happening now")}
              </span>
            )}
          </div>
        </div>
      </div>

      {(lesson.status === "scheduled" || live) && <LessonActions lesson={lesson} canHost={canHost} size="sm" className="mt-4" />}
    </div>
  );
}
