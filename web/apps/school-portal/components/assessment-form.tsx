"use client";

import { Button, Field, FormActions, FormSection, Input, Select, asKey, useT, type ActionResult } from "@educloud/ui";
import { ToastForm } from "@educloud/portal-kit/toast-form";

const TYPES = ["assignment", "quiz", "exam", "project", "participation"] as const;

/**
 * Adding an assessment to a course, on its own page. Saving returns to the
 * course's Grades tab, where it can be graded or turned into an online exam.
 */
export function AssessmentForm({ action, backHref }: { action: (form: FormData) => Promise<ActionResult<unknown> | void>; backHref: string }) {
  const t = useT();

  return (
    <ToastForm action={action} loading={t("Saving…")} redirectTo={backHref}>
      <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-soft)] sm:p-6">
        <FormSection title={t("Assessment")} description={t("Assignments, quizzes and exams for the gradebook.")}>
          <div className="sm:col-span-2">
            <Field label={t("Title")} htmlFor="assessment-title">
              <Input id="assessment-title" name="title" required autoFocus />
            </Field>
          </div>
          <Field label={t("Type")} htmlFor="assessment-type">
            <Select id="assessment-type" name="type" defaultValue="assignment">
              {TYPES.map((v) => (
                <option key={v} value={v}>
                  {t(asKey(v))}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("Max score")} htmlFor="assessment-max">
            <Input id="assessment-max" name="max_score" type="number" min={1} defaultValue={100} />
          </Field>
          <Field label={t("Due")} htmlFor="assessment-due">
            <Input id="assessment-due" name="due_at" type="datetime-local" />
          </Field>
          <label className="flex items-center gap-2 self-end pb-2.5 text-sm">
            <input type="checkbox" name="publish" defaultChecked className="h-4 w-4 accent-[var(--brand-500)]" /> {t("Visible to students now")}
          </label>
        </FormSection>
      </div>
      <FormActions cancel={{ href: backHref, label: t("Cancel") }}>
        <Button type="submit">{t("Add an assessment")}</Button>
      </FormActions>
    </ToastForm>
  );
}
