import { notFound } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { Button, Field, FormActions, FormSection, PageHeader, Select, Textarea } from "@educloud/ui";
import { getContext } from "@educloud/portal-kit/session";
import { ToastForm } from "@educloud/portal-kit/toast-form";
import { getT } from "@educloud/ui/locale";
import { importPeopleFromPage } from "../actions";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Add a whole class") };
}

/** Pasting a class from a spreadsheet, optionally enrolling everyone in a course. */
export default async function ImportPeoplePage() {
  const t = await getT();
  const { api, can } = await getContext();
  if (!can("members.manage")) notFound();
  const courses = await api.courses({});

  return (
    <>
      <PageHeader back={{ href: "/people", label: t("People") }} icon={<GraduationCap />} title={t("Add a whole class")} description={t("They'll get an email to set their password.")} />
      <ToastForm action={importPeopleFromPage} loading={t("Saving…")} redirectTo="/people">
        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-soft)] sm:p-6">
          <FormSection title={t("People to add")} description={t("Paste from a spreadsheet: one person per line, “Name, email” (and optionally a student number).")}>
            <div className="sm:col-span-2">
              <Textarea name="people" rows={10} required autoFocus placeholder={t("Sara Ali, sara@school.edu, S-104\nOmar Nasser, omar@school.edu")} aria-label={t("People to add")} className="font-mono text-xs" />
            </div>
          </FormSection>
          <FormSection title={t("Add as")}>
            <Field label={t("Add as")} htmlFor="b-role">
              <Select id="b-role" name="role" defaultValue="student">
                <option value="student">{t("Students")}</option>
                <option value="teacher">{t("Teachers")}</option>
              </Select>
            </Field>
            <Field label={t("Enroll in")} htmlFor="b-course">
              <Select id="b-course" name="course_id" defaultValue="">
                <option value="">{t("No course")}</option>
                {courses.data.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </Select>
            </Field>
          </FormSection>
        </div>
        <FormActions cancel={{ href: "/people", label: t("Cancel") }}>
          <Button type="submit">{t("Import")}</Button>
        </FormActions>
      </ToastForm>
    </>
  );
}
