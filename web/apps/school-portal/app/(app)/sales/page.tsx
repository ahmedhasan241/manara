import Link from "next/link";
import { DollarSign, Globe2, Receipt, ShoppingBag, Users, Wallet } from "lucide-react";
import { Badge, Card, Character, EmptyState, FadeIn, HeroBanner, SectionHeading, Stagger, StaggerItem, StatCard, asKey } from "@educloud/ui";
import { getContext } from "@educloud/portal-kit/session";
import { getFormat, getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Online sales") };
}

/** What the workspace's online courses earn. */
export default async function SalesPage() {
  const fmt = await getFormat();
  const t = await getT();
  const { api } = await getContext();
  const sales = await api.sales();
  const money = (cents: number) => fmt.money(cents, sales.currency);

  return (
    <>
      <FadeIn>
        <HeroBanner
          eyebrow={
            <>
              <Globe2 className="h-3.5 w-3.5" /> {t("Online courses")}
            </>
          }
          title={t("Sales & earnings")}
          subtitle={t("What learners buy on the Manara website. You keep {percent}% of every sale.", { percent: 100 - sales.platform_fee_percent })}
          meta={
            <>
              <span className="font-display text-2xl font-bold">{money(sales.earnings_cents)}</span>
              <span className="text-ink-muted">{t("your earnings so far")}</span>
            </>
          }
          art={
            <div className="w-40">
              <Character variant="laptop" tone={4} hair={3} hairStyle="bun" backdrop="none" />
            </div>
          }
        />
      </FadeIn>

      <Stagger className="mb-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <StatCard label={t("Gross sales")} value={money(sales.revenue_cents)} icon={<DollarSign className="h-5 w-5" />} />
        </StaggerItem>
        <StaggerItem>
          <StatCard label={t("Your earnings")} value={money(sales.earnings_cents)} hint={t("After the {percent}% platform fee", { percent: sales.platform_fee_percent })} icon={<Wallet className="h-5 w-5" />} accent="accent" />
        </StaggerItem>
        <StaggerItem>
          <StatCard label={t("Courses sold")} value={sales.sales} icon={<ShoppingBag className="h-5 w-5" />} accent="amber" />
        </StaggerItem>
        <StaggerItem>
          <StatCard label={t("Online learners")} value={sales.learners} icon={<Users className="h-5 w-5" />} accent="live" />
        </StaggerItem>
      </Stagger>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section>
          <SectionHeading title={t("Your online courses")} description={t("Turn any course into an online course from its “Online course” tab.")} />
          {sales.courses.length === 0 ? (
            <EmptyState icon={<Globe2 className="h-6 w-6" />} title={t("No online courses yet")} description={t("Open a course, choose the Online course tab, add lectures and publish.")} />
          ) : (
            <Card className="overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-xs uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th className="px-4 py-3 text-start">{t("Course")}</th>
                    <th className="px-4 py-3 text-end">{t("Price")}</th>
                    <th className="hidden px-4 py-3 text-end sm:table-cell">{t("Learners")}</th>
                    <th className="px-4 py-3 text-end">{t("Revenue")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {sales.courses.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-3">
                        <Link href={`/courses/${c.id}?tab=online`} className="font-semibold hover:underline">
                          {c.title}
                        </Link>
                        <Badge className="ms-2" tone={c.status === "published" ? "success" : c.status === "suspended" ? "danger" : "warning"}>
                          {t(asKey(c.status))}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-end">{c.price_cents ? money(c.price_cents) : t("Free")}</td>
                      <td className="hidden px-4 py-3 text-end sm:table-cell">{c.learners}</td>
                      <td className="px-4 py-3 text-end font-semibold">{money(c.revenue_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </section>

        <section>
          <SectionHeading title={t("Recent sales")} />
          <Card className="p-2">
            {sales.recent.length === 0 ? (
              <p className="p-3 text-sm text-ink-muted">{t("No sales yet.")}</p>
            ) : (
              <ul>
                {sales.recent.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 rounded-xl p-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint text-brand-700 dark:text-brand-300">
                      <Receipt className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{s.course}</span>
                      <span className="text-xs text-ink-muted">{fmt.date(s.paid_at)}</span>
                    </span>
                    <span className="text-sm font-bold text-success">+{money(s.price_cents)}</span>
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
