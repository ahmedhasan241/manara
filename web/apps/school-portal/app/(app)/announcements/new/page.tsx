import { notFound } from "next/navigation";
import { Megaphone } from "lucide-react";
import { Button, Field, FormActions, FormSection, Input, PageHeader, Select, Textarea } from "@educloud/ui";
import { getContext } from "@educloud/portal-kit/session";
import { ToastForm } from "@educloud/portal-kit/toast-form";
import { createAnnouncement } from "@/app/actions";
import { getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("New announcement") };
}

/** Posting an announcement to the whole school or one course; back to the list once it's out. */
export default async function NewAnnouncementPage() {
  const t = await getT();
  const { api, can } = await getContext();
  if (!can("announcements.write")) notFound();
  const courses = await api.courses();

  return (
    <>
      <PageHeader back={{ href: "/announcements", label: t("Announcements") }} icon={<Megaphone />} title={t("New announcement")} />
      <ToastForm action={createAnnouncement} loading={t("Posting…")} redirectTo="/announcements">
        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-soft)] sm:p-6">
          <FormSection title={t("Message")}>
            <div className="sm:col-span-2">
              <Field label={t("Title")} htmlFor="title">
                <Input id="title" name="title" required autoFocus />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label={t("Message")} htmlFor="body">
                <Textarea id="body" name="body" rows={6} required />
              </Field>
            </div>
          </FormSection>
          <FormSection title={t("Audience")}>
            <div className="sm:col-span-2">
              <Field label={t("Audience")} htmlFor="course_id">
                <Select id="course_id" name="course_id" defaultValue="">
                  <option value="">{t("Everyone in the school")}</option>
                  {courses.data.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label={t("Priority")} htmlFor="priority" hint={t("Urgent also sends an email.")}>
              <Select id="priority" name="priority" defaultValue="normal">
                <option value="normal">{t("Normal")}</option>
                <option value="important">{t("Important")}</option>
                <option value="urgent">{t("Urgent")}</option>
              </Select>
            </Field>
            <Field label={t("Deadline (optional)")} htmlFor="deadline_at">
              <Input id="deadline_at" name="deadline_at" type="datetime-local" />
            </Field>
          </FormSection>
        </div>
        <FormActions cancel={{ href: "/announcements", label: t("Cancel") }}>
          <Button type="submit">{t("Publish")}</Button>
        </FormActions>
      </ToastForm>
    </>
  );
}
