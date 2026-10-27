import { Package, Video } from "lucide-react";
import { ApiError, type Billing, type SeatUsage } from "@educloud/api-client";
import { Badge, Card, EmptyState, PageHeader } from "@educloud/ui";
import { getContext } from "@educloud/portal-kit/session";
import { getFormat, getT } from "@educloud/ui/locale";
import { BillingForm } from "@/components/billing-form";
import { Meter, type MeterTone } from "@/components/meter";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Package & billing") };
}

/**
 * The workspace's package: plan, status, price, seats used and video meetings,
 * and the form owners and admins use to change it.
 */
export default async function BillingPage() {
  const t = await getT();
  const fmt = await getFormat();
  const { api, can } = await getContext();
  const header = <PageHeader icon={<Package />} title={t("Package & billing")} description={t("Your plan, seats and add-ons, priced in your country's currency.")} />;

  if (!can("tenant.manage")) {
    return (
      <>
        {header}
        <EmptyState icon={<Package className="h-6 w-6" />} title={t("Only owners and admins can manage the package")} description={t("Ask your workspace owner or an admin to add seats or video meetings.")} />
      </>
    );
  }

  let billing: Billing;
  try {
    billing = await api.billing();
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      return (
        <>
          {header}
          <EmptyState icon={<Package className="h-6 w-6" />} title={t("This workspace has no package yet.")} description={error.message} />
        </>
      );
    }
    throw error;
  }

  const { subscription, plan, seats } = billing;
  const status = { trialing: t("Trial"), active: t("Active"), past_due: t("Past due"), canceled: t("Canceled") }[subscription.status];
  const statusTone = subscription.status === "active" ? "success" : subscription.status === "trialing" ? "brand" : subscription.status === "past_due" ? "warning" : "neutral";
  const currency = subscription.currency ?? plan.currency;
  const price =
    subscription.amount_cents == null
      ? "—"
      : subscription.interval === "yearly"
        ? t("{price} billed yearly", { price: fmt.exactMoney(subscription.amount_cents, currency) })
        : t("{price}/mo", { price: fmt.exactMoney(subscription.amount_cents, currency) });

  const usage = (label: string, { used, limit }: SeatUsage) => {
    const share = limit ? (used / limit) * 100 : limit === 0 ? 100 : 0;
    const tone: MeterTone = limit == null ? "brand" : share >= 100 ? "danger" : share >= 85 ? "warning" : "brand";
    const display = limit == null ? t("{used} · Unlimited", { used: fmt.number(used) }) : t("{used} of {limit}", { used: fmt.number(used), limit: fmt.number(limit) });
    return <Meter label={label} value={limit == null ? 0 : share} display={display} tone={tone} />;
  };

  return (
    <>
      {header}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="space-y-4">
          <Card className="p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">{t("Plan")}</p>
                <h2 className="font-display text-xl font-bold">{plan.name}</h2>
              </div>
              <Badge tone={statusTone}>{status}</Badge>
            </div>
            {subscription.status === "trialing" && subscription.trial_ends_at && <p className="mt-2 text-sm text-ink-muted">{t("Trial ends {date}", { date: fmt.date(subscription.trial_ends_at, { day: "numeric", month: "long", year: "numeric" }) })}</p>}
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-ink-muted">{t("Billing")}</dt>
                <dd className="font-medium">{subscription.interval === "yearly" ? t("Yearly") : t("Monthly")}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">{t("Current price")}</dt>
                <dd className="font-medium">{price}</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-4 sm:p-6">
            <h2 className="mb-4 font-semibold">{t("Seats")}</h2>
            <div className="space-y-4">
              {usage(t("Students"), seats.students)}
              {usage(t("Staff"), seats.staff)}
            </div>
          </Card>

          <Card className="flex items-center justify-between gap-3 p-4 sm:p-6">
            <span className="flex items-center gap-2 font-semibold">
              <Video className="h-5 w-5 text-brand-600 dark:text-brand-300" /> {t("Video meetings")}
            </span>
            {billing.video_meetings ? <Badge tone="success">{subscription.status === "trialing" && !subscription.video_addon && plan.video_addon_cents != null ? t("Included in your trial") : t("On")}</Badge> : <Badge>{t("Off")}</Badge>}
          </Card>
        </div>

        <BillingForm billing={billing} />
      </div>
    </>
  );
}
