import { BookMarked, CalendarClock, CheckCircle2, ExternalLink, Link2, NotebookPen, Sparkles, Target } from "lucide-react";
import type { LessonPlan } from "@educloud/api-client";
import { Badge, Card, cn } from "@educloud/ui";
import { getI18n } from "@educloud/ui/locale";

export const hasPlan = (plan: LessonPlan) => !!(plan.unit || plan.objectives?.length || plan.homework || plan.resources?.length || plan.summary);

/** Whether homework is overdue (lesson plan due dates are optional). */
const isPast = (value: string | null) => !!value && new Date(value).getTime() < Date.now();

/**
 * The teacher's plan for a lesson, as students and parents see it: the unit,
 * what they'll learn, homework with its due date, links, and afterwards the
 * teacher's summary of what was covered.
 */
export async function LessonPlanCard({ plan, ended, isParent }: { plan: LessonPlan; ended: boolean; isParent: boolean }) {
  const { t, fmt } = await getI18n();
  if (!hasPlan(plan)) return null;
  const objectives = plan.objectives ?? [];
  const resources = plan.resources ?? [];

  return (
    <section aria-labelledby="lesson-plan-heading" className="mt-8">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 id="lesson-plan-heading" className="flex items-center gap-2 font-display text-lg font-bold">
          <NotebookPen className="h-5 w-5 text-brand-500" /> {t("Lesson plan")}
        </h2>
        {plan.unit && (
          <Badge tone="brand">
            <BookMarked className="h-3 w-3" /> {plan.unit}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {ended && plan.summary && (
          <Card className="border-success/30 bg-success/5 lg:col-span-2">
            <h3 className="mb-2 flex items-center gap-2 font-display font-bold">
              <Sparkles className="h-4.5 w-4.5 text-success" /> {t("What we covered")}
            </h3>
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{plan.summary}</p>
          </Card>
        )}

        {objectives.length > 0 && (
          <Card>
            <h3 className="mb-3 flex items-center gap-2 font-display font-bold">
              <Target className="h-4.5 w-4.5 text-brand-500" /> {ended ? t("What this lesson was about") : isParent ? t("What your child will learn") : t("What you'll learn")}
            </h3>
            <ul className="space-y-2">
              {objectives.map((objective, i) => (
                <li key={i} className="flex gap-2.5 text-sm">
                  <CheckCircle2 className={cn("mt-0.5 h-4 w-4 shrink-0", ended ? "text-success" : "text-brand-400")} />
                  <span>{objective}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {plan.homework && (
          <Card className="bg-peach/60 dark:bg-surface">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-display font-bold">
                <NotebookPen className="h-4.5 w-4.5 text-brand-500" /> {t("Homework")}
              </h3>
              {plan.homework_due_at && (
                <Badge tone={isPast(plan.homework_due_at) ? "neutral" : "warning"}>
                  <CalendarClock className="h-3 w-3" /> {t("Due {date}", { date: fmt.dateTime(plan.homework_due_at) })}
                </Badge>
              )}
            </div>
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{plan.homework}</p>
          </Card>
        )}

        {resources.length > 0 && (
          <Card className={cn(!plan.homework && objectives.length === 0 && "lg:col-span-2")}>
            <h3 className="mb-3 flex items-center gap-2 font-display font-bold">
              <Link2 className="h-4.5 w-4.5 text-brand-500" /> {t("Resources")}
            </h3>
            <ul className="space-y-1.5">
              {resources.map((r) => (
                <li key={r.url}>
                  <a href={r.url} target="_blank" rel="noreferrer noopener" className="group flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-500/8 dark:text-brand-300">
                    <ExternalLink className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 truncate group-hover:underline">{r.title || r.url}</span>
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </section>
  );
}

/** A compact plan peek under a lesson card: unit, first objectives, homework due date. */
export async function LessonPlanPeek({ plan, ended }: { plan: LessonPlan; ended: boolean }) {
  const { t, fmt } = await getI18n();
  if (!hasPlan(plan)) return null;
  const objectives = plan.objectives ?? [];
  const resources = plan.resources ?? [];

  return (
    <div className="-mt-3 space-y-2 rounded-b-[var(--radius-card)] border border-t-0 border-line bg-surface-2 px-5 pb-4 pt-6 text-sm">
      {plan.unit && (
        <p className="flex items-center gap-1.5 text-xs font-bold text-brand-700 dark:text-brand-300">
          <BookMarked className="h-3.5 w-3.5" /> {plan.unit}
        </p>
      )}
      {ended && plan.summary ? (
        <p className="line-clamp-2 text-ink-muted">
          <span className="font-semibold text-ink">{t("What we covered")}: </span>
          {plan.summary}
        </p>
      ) : (
        objectives.length > 0 && (
          <ul className="space-y-1">
            {objectives.slice(0, 3).map((o, i) => (
              <li key={i} className="flex gap-2 text-ink-muted">
                <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-400" />
                <span className="line-clamp-1">{o}</span>
              </li>
            ))}
            {objectives.length > 3 && <li className="ps-5.5 text-xs text-ink-muted">{t("+{count} more", { count: objectives.length - 3 })}</li>}
          </ul>
        )
      )}
      {(plan.homework || resources.length > 0) && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {plan.homework && (
            <span className="inline-flex items-center gap-1 font-semibold text-warning">
              <NotebookPen className="h-3.5 w-3.5" /> {plan.homework_due_at ? t("Homework due {date}", { date: fmt.date(plan.homework_due_at, { month: "short", day: "numeric" }) }) : t("Homework set")}
            </span>
          )}
          {resources.length > 0 && (
            <span className="inline-flex items-center gap-1 text-ink-muted">
              <Link2 className="h-3.5 w-3.5" /> {t("{count} resources", { count: resources.length })}
            </span>
          )}
        </p>
      )}
    </div>
  );
}
