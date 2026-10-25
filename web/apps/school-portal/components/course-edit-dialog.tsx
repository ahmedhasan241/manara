"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import type { Course } from "@educloud/api-client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, Field, Input, Textarea, bannerButtonClass, useT } from "@educloud/ui";
import { saveCourse } from "@/app/academic-actions";
import { ActionForm } from "./action-form";
import { CourseStructureFields, type LevelOption } from "./course-structure-fields";

/** "Edit course" in the course banner: details plus subject, level, class and credits. */
export function CourseEditDialog({ course, levels, university }: { course: Course; levels: LevelOption[]; university: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className={bannerButtonClass("outline")}>
          <Pencil className="h-4 w-4" /> {t("Edit course")}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:w-[min(40rem,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>{t("Edit course")}</DialogTitle>
          <DialogDescription>{t("Details, and where the course sits in your school.")}</DialogDescription>
        </DialogHeader>
        <ActionForm action={saveCourse.bind(null, course.id)} submit={t("Save course")} className="grid gap-4 space-y-0 sm:grid-cols-2" submitClassName="sm:col-span-2 sm:justify-self-start" onSuccess={() => setOpen(false)}>
          <Field label={t("Code")} htmlFor="edit-code">
            <Input id="edit-code" name="code" required defaultValue={course.code} />
          </Field>
          <Field label={t("Term")} htmlFor="edit-term">
            <Input id="edit-term" name="term" defaultValue={course.term ?? ""} placeholder={t("2026 Fall")} />
          </Field>
          <div className="sm:col-span-2">
            <Field label={t("Title")} htmlFor="edit-title">
              <Input id="edit-title" name="title" required defaultValue={course.title} />
            </Field>
          </div>
          <Field label={t("Category")} htmlFor="edit-category">
            <Input id="edit-category" name="category" defaultValue={course.category ?? ""} placeholder={t("Science")} />
          </Field>
          <CourseStructureFields levels={levels} university={university} defaults={course} idPrefix="edit" />
          <div className="sm:col-span-2">
            <Field label={t("Description")} htmlFor="edit-description">
              <Textarea id="edit-description" name="description" rows={3} defaultValue={course.description ?? ""} />
            </Field>
          </div>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
