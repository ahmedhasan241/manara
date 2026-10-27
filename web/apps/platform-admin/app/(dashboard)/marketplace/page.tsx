import { BookOpen, DollarSign, ExternalLink, Pause, Play, ShoppingBag, Store, Users } from "lucide-react";
import { serverClient } from "@educloud/api-client/server";
import { Badge, Card, CourseCover, PageHeader, SectionHeading, Stagger, StaggerItem, Stars, StatCard, asKey, buttonClass } from "@educloud/ui";
import { setCourseStatus } from "../../actions";
import { ToastButton } from "@/components/toast-button";
import { getFormat, getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Course marketplace") };
}

const LEARNER_URL = process.env.NEXT_PUBLIC_LEARNER_PORTAL_URL ?? "http://localhost:3004";

/** Every published course across all teachers, schools and universities, with sales. */
export default async function MarketplacePage() {
  const fmt = await getFormat();
  const t = await getT();
  const report = await (await serverClient()).platformMarketplace();

  return (
    <>
      <PageHeader
        eyebrow={t("Online courses")}
        icon={<Store />}
        title={t("Course marketplace")}
        description={t("Courses published by teachers, doctors, schools and universities, and what learners buy.")}
        meta={
          <>
            <span className="font-display text-lg font-bold">{fmt.money(report.platform_revenue_cents)}</span>
            <span className="text-ink-muted">{t("platform revenue (on average {percent}% of sales)", { percent: report.platform_fee_percent })}</span>
          </>
        }
        actions={
          <a href={`${LEARNER_URL}/explore`} target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
            <ExternalLink className="h-4 w-4" /> {t("Explore courses")}
          </a>
        }
      />

      <Stagger className="mb-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <StatCard label={t("Gross sales")} value={fmt.money(report.gross_cents)} icon={<DollarSign className="h-5 w-5" />} />
        </StaggerItem>
        <StaggerItem>
          <StatCard label={t("Paid orders")} value={report.orders} icon={<ShoppingBag className="h-5 w-5" />} accent="accent" />
        </StaggerItem>
        <StaggerItem>
          <StatCard label={t("Learners")} value={report.learners} icon={<Users className="h-5 w-5" />} accent="amber" />
        </StaggerItem>
        <StaggerItem>
          <StatCard label={t("Published courses")} value={report.published} icon={<BookOpen className="h-5 w-5" />} accent="live" />
        </StaggerItem>
      </Stagger>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section>
          <SectionHeading title={t("Courses")} description={t("Pause a course to hide it from the website without deleting anything.")} />
          <Card className="overflow-hidden p-0">
            <ul className="divide-y divide-line">
              {report.courses.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                  <CourseCover seed={c.title} category={c.category} size="sm" className="h-12 w-16 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <a href={`${LEARNER_URL}/course/${c.slug}`} target="_blank" rel="noreferrer" className="block truncate text-sm font-semibold hover:underline">
                      {c.title}
                    </a>
                    <p className="truncate text-xs text-ink-muted">
                      {c.instructor?.name ?? "—"} · {c.organization?.name} · {t("{count} learners", { count: c.students_count })}
                    </p>
                    {c.rating !== null && <Stars value={c.rating} className="mt-0.5" />}
                  </div>
                  <span className="hidden text-sm font-semibold sm:block">{c.price_cents ? fmt.money(c.price_cents, c.currency) : t("Free")}</span>
                  <Badge tone={c.status === "published" ? "success" : c.status === "suspended" ? "danger" : "warning"}>{t(asKey(c.status))}</Badge>
                  {c.status !== "draft" && (
                    <ToastButton
                      unstyled
                      className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-surface-3 hover:text-ink disabled:opacity-50"
                      action={setCourseStatus.bind(null, c.id, c.status === "suspended" ? "published" : "suspended")}
                      label={c.status === "suspended" ? t("Restore {title}", { title: c.title }) : t("Pause {title}", { title: c.title })}
                      confirm={c.status === "suspended" ? undefined : { title: t("Pause “{title}”?", { title: c.title }), description: t("It is hidden from the website until you restore it."), confirmLabel: t("Pause") }}
                    >
                      {c.status === "suspended" ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    </ToastButton>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </section>

        <section>
          <SectionHeading title={t("Recent orders")} />
          <Card className="p-2">
            {report.recent_orders.length === 0 ? (
              <p className="p-3 text-sm text-ink-muted">{t("No orders yet.")}</p>
            ) : (
              <ul>
                {report.recent_orders.map((o) => (
                  <li key={o.id} className="rounded-xl p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{o.user?.name ?? t("Deleted user")}</span>
                      <span className="text-sm font-bold">{fmt.money(o.total_cents, o.currency)}</span>
                    </div>
                    <p className="truncate text-xs text-ink-muted">{o.items.map((i) => i.title).join(", ")}</p>
                    <div className="mt-1 flex items-center justify-between text-xs text-ink-muted">
                      <span className="font-mono">{o.number}</span>
                      <Badge tone={o.status === "paid" ? "success" : o.status === "pending" ? "warning" : "neutral"}>{t(asKey(o.status))}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      </div>
    </>
  );
}
