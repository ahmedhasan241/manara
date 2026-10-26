import { Megaphone } from "lucide-react";
import { Badge, Card, Countdown, EmptyState, PageHeader, Stagger, StaggerItem, asKey } from "@educloud/ui";
import { requireAudience } from "@educloud/portal-kit/session";
import { getFormat, getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Announcements") };
}

export default async function AnnouncementsPage() {
  const fmt = await getFormat();
  const t = await getT();
  const { api } = await requireAudience("learner", "/staff-account");
  const announcements = await api.announcements();

  return (
    <>
      <PageHeader icon={<Megaphone />} eyebrow={t("News")} title={t("Announcements")} description={t("From the school and your teachers.")} />
      {announcements.data.length === 0 ? (
        <EmptyState icon={<Megaphone className="h-6 w-6" />} title={t("No announcements yet")} />
      ) : (
        <Stagger as="ul" className="space-y-3">
          {announcements.data.map((a) => (
            <StaggerItem as="li" key={a.id}>
              <Card className={a.priority === "urgent" ? "border-danger/50" : undefined}>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-lg font-bold">{a.title}</h2>
                  {a.priority !== "normal" && <Badge tone={a.priority === "urgent" ? "danger" : "warning"}>{t(asKey(a.priority))}</Badge>}
                  {a.course && <Badge tone="brand">{a.course.title}</Badge>}
                </div>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{a.body}</p>
                <p className="mt-3 text-xs text-ink-muted">
                  {a.author?.name} · {a.published_at && fmt.date(a.published_at)}
                  {a.deadline_at && (
                    <>
                      {" · due "}
                      <Countdown to={a.deadline_at} />
                    </>
                  )}
                </p>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </>
  );
}
