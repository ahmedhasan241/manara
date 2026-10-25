import { TicketPercent } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader } from "@educloud/ui";
import { getContext } from "@educloud/portal-kit/session";
import { getFormat, getT } from "@educloud/ui/locale";
import { CouponForm, CouponRowActions } from "@/components/coupon-tools";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Discount codes") };
}

/** Discount codes for the workspace's online courses. */
export default async function CouponsPage() {
  const t = await getT();
  const fmt = await getFormat();
  const { api } = await getContext();
  const [coupons, courses] = await Promise.all([api.coupons(), api.courses({ page: 1 })]);
  const status = (c: (typeof coupons)[number]) =>
    !c.is_active ? { tone: "neutral" as const, label: t("Paused") } : c.expires_at && new Date(c.expires_at) < new Date() ? { tone: "warning" as const, label: t("Expired") } : c.max_uses !== null && c.uses_count >= c.max_uses ? { tone: "warning" as const, label: t("Used up") } : { tone: "success" as const, label: t("Active") };

  return (
    <>
      <PageHeader title={t("Discount codes")} description={t("Give learners a percentage off your online courses: for a launch, a class, or a partner.")} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <Card className="h-fit">
          <h2 className="mb-4 font-display font-semibold">{t("New code")}</h2>
          <CouponForm courses={courses.data.map((c) => ({ id: c.id, title: c.title }))} />
        </Card>

        {coupons.length === 0 ? (
          <EmptyState icon={<TicketPercent className="h-5 w-5" />} title={t("No codes yet")} description={t("Create one and share it in class, by email or on social media.")} />
        ) : (
          <ul className="space-y-3">
            {coupons.map((c) => {
              const s = status(c);
              return (
                <li key={c.id}>
                  <Card className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-600/10 font-display text-sm font-semibold text-brand-700 dark:text-brand-300">{c.percent_off}%</span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2">
                        <span className="font-mono font-semibold" dir="ltr">{c.code}</span>
                        <Badge tone={s.tone}>{s.label}</Badge>
                      </p>
                      <p className="truncate text-xs text-ink-muted">
                        {c.course ? c.course.title : t("All online courses")} · {c.max_uses ? t("{used} of {max} used", { used: c.uses_count, max: c.max_uses }) : t("{count} uses", { count: c.uses_count })}
                        {c.expires_at && <> · {t("Ends {date}", { date: fmt.date(c.expires_at) })}</>}
                      </p>
                    </div>
                    <CouponRowActions id={c.id} code={c.code} active={c.is_active} />
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
