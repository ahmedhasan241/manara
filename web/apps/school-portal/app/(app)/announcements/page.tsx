import Link from "next/link";
import { Megaphone, Plus } from "lucide-react";
import { Badge, Card, ClearFilters, EmptyState, FilterBar, FilterChips, PageHeader, SearchField, buttonClass } from "@educloud/ui";
import { getContext } from "@educloud/portal-kit/session";
import { getFormat, getI18n, getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Announcements") };
}

const PRIORITIES = ["normal", "important", "urgent"] as const;

export default async function AnnouncementsPage({ searchParams }: { searchParams: Promise<{ search?: string; priority?: string }> }) {
  const fmt = await getFormat();
  const { api, can } = await getContext();
  const { t } = await getI18n();
  const { search, priority } = await searchParams;
  const announcements = await api.announcements();
  // The API has no search or priority filter, so the list is narrowed here.
  const query = search?.trim().toLowerCase();
  const matching = announcements.data.filter((a) => !query || `${a.title} ${a.body}`.toLowerCase().includes(query));
  const shown = matching.filter((a) => !priority || a.priority === priority);

  return (
    <>
      <PageHeader
        icon={<Megaphone />}
        title={t("Announcements")}
        description={t("From the school and your teachers.")}
        actions={
          can("announcements.write") && (
            <Link href="/announcements/new" className={buttonClass("primary")}>
              <Plus className="h-4 w-4" /> {t("New announcement")}
            </Link>
          )
        }
        toolbar={
          <FilterBar
            search={<SearchField placeholder={t("Search announcements")} />}
            chips={
              <FilterChips
                param="priority"
                label={t("Priority")}
                options={[
                  { label: t("All"), count: matching.length },
                  ...PRIORITIES.map((p) => ({ value: p, label: { normal: t("Normal"), important: t("Important"), urgent: t("Urgent") }[p], count: matching.filter((a) => a.priority === p).length, tone: p === "urgent" ? ("danger" as const) : p === "important" ? ("warning" as const) : undefined })),
                ]}
              />
            }
            summary={(search || priority) && <ClearFilters params={["search", "priority"]} />}
          />
        }
      />

      {shown.length === 0 ? (
        <EmptyState icon={<Megaphone className="h-6 w-6" />} title={search || priority ? t("No announcements match") : t("No announcements yet")} />
      ) : (
        <ul className="space-y-3">
          {shown.map((a) => (
            <li key={a.id}>
              <Card>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{a.title}</h2>
                  {a.priority !== "normal" && <Badge tone={a.priority === "urgent" ? "danger" : "warning"}>{a.priority === "urgent" ? t("Urgent") : t("Important")}</Badge>}
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
