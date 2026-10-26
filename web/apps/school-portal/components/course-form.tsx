"use client";

import { useState } from "react";
import type { Course } from "@educloud/api-client";
import { Button, Field, FormActions, FormSection, Input, Textarea, useT } from "@educloud/ui";
import { ToastForm } from "@educloud/portal-kit/toast-form";
import type { ActionResult } from "@educloud/ui";
import { CourseStructureFields, type LevelOption } from "./course-structure-fields";

/** "Calculus II" → "CALC-101": a starting code the teacher can change. */
function suggestCode(title: string) {
  const letters = title.normalize("NFKD").replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase();
  return letters ? `${letters}-101` : "";
}

/**
 * The course form, on its own page for creating (/courses/new) and editing
 * (/courses/[id]/edit): basics first, then where the course sits in the
 * school. A new course suggests its code from the title.
 */
export function CourseForm({
  action,
  course,
  levels,
  university,
  cancelHref,
  redirectTo,
}: {
  action: (form: FormData) => Promise<ActionResult<unknown> | void>;
  course?: Course;
  levels: LevelOption[];
  university: boolean;
  cancelHref: string;
  redirectTo?: string;
}) {
  const t = useT();
  const [title, setTitle] = useState(course?.title ?? "");
  const [code, setCode] = useState<string | null>(course?.code ?? null);
  const categories = [t("Mathematics"), t("Science"), t("Languages"), t("Computer science"), t("Design"), t("Business"), t("History"), t("Music")];

  return (
    <ToastForm action={action} loading={course ? t("Saving…") : t("Creating the course…")} redirectTo={redirectTo}>
      <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-soft)] sm:p-6">
        <FormSection title={t("Basics")} description={t("Start with the basics. Lessons, materials and exams come next.")}>
          <div className="sm:col-span-2">
            <Field label={t("Title")} htmlFor="course-title">
              <Input id="course-title" name="title" required autoFocus={!course} value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
          </div>
          <Field label={t("Code")} htmlFor="course-code">
            <Input id="course-code" name="code" required value={code ?? suggestCode(title)} onChange={(e) => setCode(e.target.value)} placeholder={t("MATH-101")} />
          </Field>
          <Field label={t("Term")} htmlFor="course-term">
            <Input id="course-term" name="term" defaultValue={course?.term ?? ""} placeholder={t("2026 Fall")} />
          </Field>
          <div className="sm:col-span-2">
            <Field label={t("Category")} htmlFor="course-category" hint={t("Groups courses by topic, e.g. Science or Languages.")}>
              <Input id="course-category" name="category" list="course-categories" defaultValue={course?.category ?? ""} placeholder={t("Science")} />
            </Field>
            <datalist id="course-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className="sm:col-span-2">
            <Field label={t("Description")} htmlFor="course-description">
              <Textarea id="course-description" name="description" rows={4} defaultValue={course?.description ?? ""} />
            </Field>
          </div>
        </FormSection>
        <FormSection title={university ? t("Years & sections") : t("Classes")} description={t("Details, and where the course sits in your school.")}>
          <CourseStructureFields levels={levels} university={university} defaults={course} idPrefix="course" />
        </FormSection>
      </div>
      <FormActions cancel={{ href: cancelHref, label: t("Cancel") }}>
        <Button type="submit">{course ? t("Save course") : t("Create course")}</Button>
      </FormActions>
    </ToastForm>
  );
}
