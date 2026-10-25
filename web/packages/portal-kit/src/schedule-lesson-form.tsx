"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarPlus, ChevronDown, NotebookPen } from "lucide-react";
import { Button, Card, Field, Input, Select, Textarea, useStateToast, useT } from "@educloud/ui";
import { scheduleLesson, type FormState } from "./actions/lessons";
import { LessonPlanFields } from "./lesson-plan-fields";

/**
 * Teacher form to schedule a lesson. Times are entered in the teacher's own time
 * zone; the browser's offset is sent along so the API stores UTC.
 */
export function ScheduleLessonForm({ courses, defaultCourseId }: { courses: { id: string; title: string; code: string }[]; defaultCourseId?: string }) {
  const t = useT();
  const [state, action, pending] = useActionState<FormState, FormData>(scheduleLesson, {});
  const [open, setOpen] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const [offset, setOffset] = useState(0);
  useStateToast(state);

  useEffect(() => setOffset(new Date().getTimezoneOffset()), []);
  useEffect(() => {
    if (state.ok) {
      form.current?.reset();
      setOpen(false);
    }
  }, [state]);

  return (
    <div className="mb-8">
      <AnimatePresence initial={false} mode="wait">
        {!open ? (
          <motion.div key="button" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Button onClick={() => setOpen(true)}>
              <CalendarPlus className="h-4 w-4" /> {t("Schedule a live lesson")}
            </Button>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
            <Card className="relative overflow-hidden">
              <div aria-hidden className="absolute -end-16 -top-16 h-40 w-40 rounded-full bg-brand-500/10 blur-2xl" />
              <h2 className="mb-1 font-display text-lg font-bold">{t("Schedule a live lesson")}</h2>
              <p className="mb-5 text-sm text-ink-muted">{t("Students get a notification now, a reminder 15 minutes before, and an alert when you start.")}</p>
              <form ref={form} action={action} className="grid gap-4 sm:grid-cols-6">
                <input type="hidden" name="tz_offset" value={offset} />
                <div className="sm:col-span-3">
                  <Field label={t("Course")} htmlFor="course_id">
                    <Select id="course_id" name="course_id" defaultValue={defaultCourseId} required>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} — {c.title}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <div className="sm:col-span-3">
                  <Field label={t("Title")} htmlFor="lesson-title">
                    <Input id="lesson-title" name="title" required placeholder={t("e.g. Week 5 — Integrals")} />
                  </Field>
                </div>
                <div className="sm:col-span-3">
                  <Field label={t("Starts")} htmlFor="scheduled_at">
                    <Input id="scheduled_at" name="scheduled_at" type="datetime-local" required />
                  </Field>
                </div>
                <div className="sm:col-span-3">
                  <Field label={t("Duration")} htmlFor="duration_minutes">
                    <Select id="duration_minutes" name="duration_minutes" defaultValue="60">
                      {[30, 45, 60, 90, 120, 180].map((m) => (
                        <option key={m} value={m}>
                          {m < 60 ? t("{count} minutes", { count: m }) : t("{count} hours", { count: m / 60 })}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <div className="sm:col-span-6">
                  <Field label={t("What will you cover? (optional)")} htmlFor="lesson-description">
                    <Textarea id="lesson-description" name="description" rows={2} />
                  </Field>
                </div>
                <details className="group rounded-2xl border border-line p-4 open:border-brand-300/70 open:bg-brand-500/[0.03] sm:col-span-6">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                    <NotebookPen className="h-4 w-4 text-brand-500" />
                    <span className="flex-1">{t("Lesson plan (optional)")}</span>
                    <span className="hidden text-xs font-normal text-ink-muted sm:inline">{t("Unit, objectives, homework and links")}</span>
                    <ChevronDown className="h-4 w-4 text-ink-muted transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-4">
                    <LessonPlanFields idPrefix="schedule-plan" />
                  </div>
                </details>
                <label className="flex items-center gap-2 text-sm sm:col-span-4">
                  <input type="checkbox" name="auto_record" defaultChecked className="h-4 w-4 accent-brand-600" />
                  {t("Record automatically and add the recording to the course")}
                </label>
                <div className="flex gap-2 sm:col-span-2 sm:justify-end">
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                    {t("Cancel")}
                  </Button>
                  <Button type="submit" disabled={pending}>
                    {pending ? t("Scheduling…") : t("Schedule")}
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
