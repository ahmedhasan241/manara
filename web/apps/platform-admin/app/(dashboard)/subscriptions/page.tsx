import Link from "next/link";
import { CreditCard } from "lucide-react";
import { serverClient } from "@educloud/api-client/server";
import { Badge, Card, EmptyState, PageHeader, cn } from "@educloud/ui";
import { SubscriptionActions } from "@/components/subscription-actions";
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
      <PageHeader eyebrow={t("Customers")} title={t("Subscriptions")} description={t("Each workspace's current package. Extend trials, activate manual payments, or cancel.")} />

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value ? `?status=${f.value}` : "?"}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition",
              (status ?? "") === f.value ? "bg-brand-600 text-white" : "bg-surface text-ink-muted ring-1 ring-line hover:text-ink",
            )}
          >
            {t(f.label)}
          </Link>
        ))}
      </div>

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
                return (
                  <tr key={s.id} className="border-b border-line last:border-0 hover:bg-surface-2/60">
                    <td className="px-5 py-3">
                      <Link href={`/tenants/${s.tenant.id}`} className="font-semibold hover:text-brand-600">
                        {s.tenant.name}
                      </Link>
                      <span className="block text-xs capitalize text-ink-muted">{s.tenant.type === "teacher" ? "teacher / lecturer" : s.tenant.type}</span>
                    </td>
                    <td className="px-5 py-3">
                      {s.plan.name}
                      <span className="block text-xs text-ink-muted">
                        {s.interval === "yearly" ? `${fmt.money(s.plan.price_yearly_cents, s.plan.currency)}/yr` : `${fmt.money(s.plan.price_monthly_cents, s.plan.currency)}/mo`}
                      </span>
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
    </>
  );
}
