import { Bell } from "lucide-react";
import { Card, EmptyState, PageHeader, Stagger, StaggerItem, cn } from "@educloud/ui";
import { requireAudience } from "@educloud/portal-kit/session";
import { MarkAllReadButton } from "@/components/mark-all-read-button";
import { getFormat, getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Notifications") };
}

export default async function NotificationsPage() {
  const fmt = await getFormat();
  const t = await getT();
  const { api } = await requireAudience("learner", "/staff-account");
  const { data, unread_count } = await api.notifications();

  return (
    <>
      <PageHeader
        title={t("Notifications")}
        description={t("{count} unread", { count: unread_count })}
        actions={
          unread_count > 0 && <MarkAllReadButton />
        }
      />
      {data.length === 0 ? (
        <EmptyState icon={<Bell className="h-6 w-6" />} title={t("You're all caught up")} />
      ) : (
        <Stagger as="ul" className="space-y-2">
          {data.map((n) => (
            <StaggerItem as="li" key={n.id}>
              <Card className={cn("p-4", !n.read_at && "border-brand-300/70")}>
                <p className={cn("text-sm", !n.read_at && "font-semibold")}>{n.data.title}</p>
                <p className="text-sm text-ink-muted">{n.data.body}</p>
                <p className="mt-1 text-xs text-ink-muted">{fmt.dateTime(n.created_at)}</p>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </>
  );
}
