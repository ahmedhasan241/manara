import { notFound } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Button, Field, FormActions, FormSection, Input, PageHeader, Select } from "@educloud/ui";
import { getContext } from "@educloud/portal-kit/session";
import { ToastForm } from "@educloud/portal-kit/toast-form";
import { getT } from "@educloud/ui/locale";
import { addPersonFromPage } from "../actions";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Add one person") };
}

/** Adding one student, teacher or admin; they get an email to set their password. */
export default async function NewPersonPage() {
  const t = await getT();
  const { can } = await getContext();
  if (!can("members.manage")) notFound();

  return (
    <>
      <PageHeader back={{ href: "/people", label: t("People") }} icon={<UserPlus />} title={t("Add one person")} description={t("They'll get an email to set their password.")} />
      <ToastForm action={addPersonFromPage} loading={t("Saving…")} redirectTo="/people">
        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-soft)] sm:p-6">
          <FormSection title={t("Person")}>
            <Field label={t("Full name")} htmlFor="p-name">
              <Input id="p-name" name="name" required autoFocus />
            </Field>
            <Field label={t("Email")} htmlFor="p-email">
              <Input id="p-email" name="email" type="email" required />
            </Field>
          </FormSection>
          <FormSection title={t("Role")}>
            <Field label={t("Role")} htmlFor="p-role">
              <Select id="p-role" name="role" defaultValue="student">
                <option value="student">{t("Student")}</option>
                <option value="teacher">{t("Teacher / lecturer")}</option>
                <option value="admin">{t("Admin")}</option>
              </Select>
            </Field>
            <Field label={t("Student no.")} htmlFor="p-number">
              <Input id="p-number" name="student_number" placeholder={t("Optional")} />
            </Field>
          </FormSection>
        </div>
        <FormActions cancel={{ href: "/people", label: t("Cancel") }}>
          <Button type="submit">{t("Add person")}</Button>
        </FormActions>
      </ToastForm>
    </>
  );
}
