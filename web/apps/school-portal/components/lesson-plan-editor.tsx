"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { BookOpen, CalendarClock, ExternalLink, Home, NotebookPen, Pencil, Save, ScrollText, Target } from "lucide-react";
import type { LessonPlan, LiveLesson } from "@educloud/api-client";
import { Badge, Button, Card, toast, useFormat, useT } from "@educloud/ui";
import { LessonPlanFields } from "@educloud/portal-kit/lesson-plan-fields";
import { planFromForm } from "@educloud/portal-kit/lesson-plan";
import { saveLessonPlan } from "@/app/academic-actions";

/**
 * The lesson plan on the staff lesson page: read it at a glance, edit it any
 * time — homework and a summary are often added after the lesson.
 */
export function LessonPlanEditor({ lesson }: { lesson: Pick<LiveLesson, "id" | "status"> & LessonPlan }) {
  const t = useT();
  const fmt = useFormat();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const ended = lesson.status === "ended";
  const empty = !lesson.unit && lesson.objectives.length === 0 && !lesson.homework && lesson.resources.length === 0 && !lesson.summary;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const plan = planFromForm(new FormData(event.currentTarget));
    start(async () => {
      const result = await saveLessonPlan(lesson.id, plan);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("Lesson plan saved."));
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <Card className="relative overflow-hidden p-5 shadow-[var(--shadow-soft)]">
      <div aria-hidden className="absolute -end-16 -top-16 h-40 w-40 rounded-full bg-brand-500/10 blur-2xl" />
      <div className="relative mb-4 flex flex-wrap items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl fill-brand text-white">
          <NotebookPen className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-bold">{t("Lesson plan")}</h2>
          <p className="text-sm text-ink-muted">{ended ? t("Add the homework and a short summary of what was covered.") : t("Students see the unit, objectives, homework and links.")}</p>
        </div>
        {!editing && (
          <Button variant={empty ? "primary" : "secondary"} size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" /> {empty ? t("Add a plan") : t("Edit plan")}
          </Button>
        )}
      </div>

      <AnimatePresence initial={false} mode="wait">
        {editing ? (
          <motion.form key="form" onSubmit={submit} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="relative space-y-4">
            <LessonPlanFields plan={lesson} showSummary withOffset idPrefix="edit-plan" />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={pending}>
                <Save className="h-4 w-4" /> {pending ? t("Saving…") : t("Save plan")}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                {t("Cancel")}
              </Button>
            </div>
          </motion.form>
        ) : empty ? (
          <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative rounded-xl bg-surface-2 px-4 py-5 text-center text-sm text-ink-muted">
            {t("No plan yet. Add the unit, objectives and homework so students know what to expect.")}
          </motion.p>
        ) : (
          <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative grid gap-4 md:grid-cols-2">
            {lesson.unit && (
              <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-peach px-3 py-1 text-sm font-semibold text-brand-700 md:col-span-2 dark:text-brand-300">
                <BookOpen className="h-4 w-4" /> {lesson.unit}
              </p>
            )}
            {lesson.objectives.length > 0 && (
              <div className="md:col-span-2">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-ink-muted">{t("Learning objectives")}</p>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {lesson.objectives.map((o, i) => (
                    <li key={i} className="flex gap-2 rounded-xl bg-surface-2 p-3 text-sm">
                      <Target className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" /> {o}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {lesson.homework && (
              <div className="rounded-xl border border-line p-4">
                <p className="mb-1 flex flex-wrap items-center gap-2 text-sm font-semibold">
                  <Home className="h-4 w-4 text-brand-500" /> {t("Homework")}
                  {lesson.homework_due_at && (
                    <Badge tone={new Date(lesson.homework_due_at) < new Date() ? "neutral" : "warning"}>
                      <CalendarClock className="h-3 w-3" /> {t("Due {date}", { date: fmt.dateTime(lesson.homework_due_at) })}
                    </Badge>
                  )}
                </p>
                <p className="whitespace-pre-line text-sm text-ink-muted">{lesson.homework}</p>
              </div>
            )}
            {lesson.resources.length > 0 && (
              <div className="rounded-xl border border-line p-4">
                <p className="mb-2 text-sm font-semibold">{t("Resources")}</p>
                <ul className="space-y-1.5">
                  {lesson.resources.map((r, i) => (
                    <li key={i}>
                      <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline dark:text-brand-300">
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{r.title}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {lesson.summary && (
              <div className="rounded-xl bg-mint/60 p-4 md:col-span-2">
                <p className="mb-1 flex items-center gap-2 text-sm font-semibold">
                  <ScrollText className="h-4 w-4 text-brand-500" /> {t("What was covered")}
                </p>
                <p className="whitespace-pre-line text-sm">{lesson.summary}</p>
              </div>
            )}
            {ended && !lesson.summary && (
              <p className="text-sm text-ink-muted md:col-span-2">{t("Tip: add a summary so students who missed the lesson can catch up.")}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
