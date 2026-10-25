import { Card, EmptyState, PageHeader, cn } from "@educloud/ui";
import { getContext } from "@educloud/portal-kit/session";
import { ToastButton } from "@educloud/portal-kit/toast-button";
import { markAllRead } from "../../actions";
import { getFormat, getI18n, getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Notifications") };
}

export default async function NotificationsPage() {
  const fmt = await getFormat();
  const { api } = await getContext();
  const { t } = await getI18n();
  const { data, unread_count } = await api.notifications();

  return (
    <>
      <PageHeader
        title={t("Notifications")}
        description={t("{count} unread", { count: unread_count })}
        actions={
          unread_count > 0 && (
            <ToastButton action={markAllRead} size="sm">
              {t("Mark all as read")}
            </ToastButton>
          )
        }
      />
      {data.length === 0 ? (
        <EmptyState title={t("You're all caught up")} />
      ) : (
        <ul className="space-y-2">
          {data.map((n) => (
            <li key={n.id}>
              <Card className={cn("p-4", !n.read_at && "border-brand-500/50")}>
                <p className={cn("text-sm", !n.read_at && "font-semibold")}>{n.data.title}</p>
                <p className="text-sm text-ink-muted">{n.data.body}</p>
                <p className="mt-1 text-xs text-ink-muted">{fmt.dateTime(n.created_at)}</p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
