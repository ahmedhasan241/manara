"use client";

import { useState } from "react";
import { Flame, Target } from "lucide-react";
import type { LearningStats } from "@educloud/api-client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger, buttonClass, cn, useFormat, useT } from "@educloud/ui";
import { setWeeklyGoal } from "@/app/site-actions";
import { useMutation } from "@/components/use-mutation";

const GOALS = [30, 60, 120, 180, 300];

/**
 * Streak, minutes this week against the learner's goal, and a day-by-day
 * strip for the current week. The goal is changed from a small menu.
 */
export function LearningGoal({ stats: initial }: { stats: LearningStats }) {
  const t = useT();
  const fmt = useFormat();
  const [stats, setStats] = useState(initial);
  const { run, pending } = useMutation();
  const minutes = Math.round(stats.week_seconds / 60);
  const percent = Math.min(100, Math.round((minutes / stats.weekly_goal_minutes) * 100));
  const peak = Math.max(...stats.week.map((d) => d.seconds), 1);
  const today = new Date().toISOString().slice(0, 10);

  function choose(goal: number) {
    if (goal === stats.weekly_goal_minutes) return;
    run(() => setWeeklyGoal(goal), {
      success: t("Weekly goal set to {minutes} minutes.", { minutes: goal }),
      onSuccess: (result) => result.ok && setStats(result.stats),
    });
  }

  return (
    <section aria-label={t("Your learning this week")} className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-4">
      <div className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface px-4 py-3 sm:min-w-44">
        <span className={cn("grid h-10 w-10 place-items-center rounded-lg", stats.streak ? "bg-warning/12 text-warning" : "bg-surface-3 text-ink-muted")}>
          <Flame className="h-5 w-5" />
        </span>
        <div>
          <p className="font-display text-xl font-semibold tabular-nums">{t("{count} days", { count: stats.streak })}</p>
          <p className="text-xs text-ink-muted">{stats.streak ? t("Learning streak") : t("Start a streak today")}</p>
        </div>
      </div>

      <div className="rounded-[var(--radius-card)] border border-line bg-surface px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm">
            <Target className="h-4 w-4 text-brand-600 dark:text-brand-300" />
            <span className="font-medium">{t("{done} of {goal} min this week", { done: fmt.number(minutes), goal: fmt.number(stats.weekly_goal_minutes) })}</span>
            {percent >= 100 && <span className="rounded-md bg-success/12 px-1.5 py-0.5 text-xs font-medium text-success">{t("Goal reached")}</span>}
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger className={buttonClass("ghost", "sm")} disabled={pending}>
              {t("Change goal")}
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>{t("Weekly goal")}</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={String(stats.weekly_goal_minutes)} onValueChange={(v) => choose(Number(v))}>
                {GOALS.map((g) => (
                  <DropdownMenuRadioItem key={g} value={String(g)}>
                    {t("{count} minutes", { count: g })}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={t("Weekly goal")}>
          <div className="h-full rounded-full bg-brand-600 transition-[width] duration-700 dark:bg-brand-400" style={{ width: `${percent}%` }} />
        </div>
        <ol className="mt-3 grid grid-cols-7 gap-1.5" aria-label={t("Minutes per day")}>
          {stats.week.map((d) => (
            <li key={d.day} className="flex flex-col items-center gap-1" title={t("{count} min", { count: Math.round(d.seconds / 60) })}>
              <span className="flex h-8 w-full items-end overflow-hidden rounded bg-surface-2">
                <span className={cn("w-full rounded", d.seconds ? "bg-brand-500/80 dark:bg-brand-400/80" : "")} style={{ height: `${Math.max(d.seconds ? 12 : 0, (d.seconds / peak) * 100)}%` }} />
              </span>
              <span className={cn("text-[10.5px]", d.day === today ? "font-semibold text-ink" : "text-ink-muted")}>{fmt.date(d.day + "T12:00:00", { weekday: "narrow" })}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
