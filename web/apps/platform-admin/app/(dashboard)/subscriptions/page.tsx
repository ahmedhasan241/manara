import Link from "next/link";
import { CreditCard } from "lucide-react";
import { serverClient } from "@educloud/api-client/server";
import { Badge, Card, EmptyState, FilterChips, PageHeader, Pagination } from "@educloud/ui";
import { SubscriptionActions } from "@/components/subscription-actions";
import { subscriptionPrice, subscriptionSeats } from "@/lib/subscription-price";
import { getFormat, getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Subscriptions") };
}

const FILTERS = [
  { value: "", label: "All" },
  { value: "trialing", label: "Trials" },
  { value: "trial_ending", label: "Trial ends this week" },
  { value: "active", label: "Paying" },
  { value: "past_due", label: "Past due" },
  { value: "canceled", label: "Canceled" },
] as const;

const tone = { active: "success", trialing: "brand", past_due: "warning", canceled: "danger" } as const;

export default async function SubscriptionsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const fmt = await getFormat();
  const t = await getT();
  const { status, page } = await searchParams;
  const subs = await (await serverClient()).platformSubscriptions({ status, page: page ? Number(page) : undefined });

  return (
    <>
      <PageHeader
        eyebrow={t("Customers")}
        icon={<CreditCard />}
        title={t("Subscriptions")}
        description={t("Each workspace's current package. Extend trials, activate manual payments, or cancel.")}
        toolbar={
          <FilterChips
            param="status"
            label={t("Status")}
            options={FILTERS.map((f) => ({
              value: f.value || undefined,
              label: t(f.label),
              tone: f.value === "active" ? "success" : f.value === "past_due" || f.value === "trial_ending" ? "warning" : f.value === "canceled" ? "danger" : undefined,
            }))}
          />
        }
      />

      {subs.data.length === 0 ? (
        <EmptyState icon={<CreditCard className="h-6 w-6" />} title={t("No subscriptions match")} />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[52rem] text-sm">
            <thead className="border-b border-line text-ink-muted">
              <tr>
                <th className="px-5 py-3 text-start font-semibold">{t("Workspace")}</th>
                <th className="px-5 py-3 text-start font-semibold">{t("Package")}</th>
                <th className="px-5 py-3 text-start font-semibold">{t("Status")}</th>
                <th className="px-5 py-3 text-start font-semibold">{t("Renews / trial ends")}</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {subs.data.map((s) => {
                const date = s.status === "trialing" ? s.trial_ends_at : s.current_period_ends_at;
                const seats = subscriptionSeats(s, t);
                return (
                  <tr key={s.id} className="border-b border-line last:border-0 hover:bg-surface-2/60">
                    <td className="px-5 py-3">
                      <Link href={`/tenants/${s.tenant.id}`} className="font-semibold hover:text-brand-600">
                        {s.tenant.name}
                      </Link>
                      <span className="block text-xs capitalize text-ink-muted">{s.tenant.type === "teacher" ? "teacher / lecturer" : s.tenant.type}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-2">
                        {s.plan.name}
                        {s.video_addon && <Badge tone="brand">{t("Video")}</Badge>}
                      </span>
                      <span className="block text-xs tabular-nums text-ink-muted">{subscriptionPrice(s, fmt, t)}</span>
                      {seats && <span className="block text-xs text-ink-muted">{seats}</span>}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={tone[s.status]}>{s.status.replace("_", " ")}</Badge>
                    </td>
                    <td className="px-5 py-3 text-ink-muted">{date ? fmt.date(date) : "—"}</td>
                    <td className="px-5 py-3">
                      <SubscriptionActions subscription={s} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
      <Pagination page={subs.current_page} pages={subs.last_page} total={subs.total} />
    </>
  );
}
