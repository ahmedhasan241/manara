import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Select, Textarea, asKey } from "@educloud/ui";
import { getContext } from "@educloud/portal-kit/session";
import { ToastForm } from "@educloud/portal-kit/toast-form";
import { createAnnouncement } from "../../actions";
import { getFormat, getI18n, getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Announcements") };
}

export default async function AnnouncementsPage() {
  const fmt = await getFormat();
  const { api, can } = await getContext();
  const { t } = await getI18n();
  const [announcements, courses] = await Promise.all([api.announcements(), can("announcements.write") ? api.courses() : null]);

  return (
    <>
      <PageHeader title={t("Announcements")} />

      {courses && (
        <Card className="mb-6">
          <h2 className="mb-3 font-semibold">{t("New announcement")}</h2>
          <ToastForm action={createAnnouncement} loading={t("Posting…")} resetOnSuccess className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Field label={t("Title")} htmlFor="title">
                <Input id="title" name="title" required />
              </Field>
            </div>
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
            <div className="sm:col-span-3">
              <Field label={t("Message")} htmlFor="body">
                <Textarea id="body" name="body" rows={4} required />
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
            <div className="sm:self-end">
              <Button type="submit">{t("Publish")}</Button>
            </div>
          </ToastForm>
        </Card>
      )}

      {announcements.data.length === 0 ? (
        <EmptyState title={t("No announcements yet")} />
      ) : (
        <ul className="space-y-3">
          {announcements.data.map((a) => (
            <li key={a.id}>
              <Card>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{a.title}</h2>
                  {a.priority !== "normal" && <Badge tone={a.priority === "urgent" ? "danger" : "warning"}>{t(asKey(a.priority))}</Badge>}
                  {a.course && <Badge tone="brand">{a.course.title}</Badge>}
                </div>
                <p className="mt-2 whitespace-pre-line text-sm">{a.body}</p>
                <p className="mt-3 text-xs text-ink-muted">
                  {a.author?.name} · {a.published_at && fmt.dateTime(a.published_at)}
                  {a.deadline_at && ` · ${t("Due {date}", { date: fmt.dateTime(a.deadline_at) })}`}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
