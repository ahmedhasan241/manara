import { serverClient } from "@educloud/api-client/server";
import Link from "next/link";
import { Building2, CreditCard, DollarSign, Globe2, ServerCrash, Users } from "lucide-react";
import { BannerArt, BarChart, Card, FadeIn, HeroBanner, SectionHeading, Sparkline, Stagger, StaggerItem, StatCard, bannerButtonClass } from "@educloud/ui";
import { getFormat, getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Overview") };
}

export default async function OverviewPage() {
  const fmt = await getFormat();
  const t = await getT();
  const stats = await (await serverClient()).platformStats();

  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().slice(0, 10);
  });
  const signups = days.map((d) => stats.signups_last_30_days[d] ?? 0);

  return (
    <>
      <FadeIn>
        <HeroBanner
          eyebrow={t("Manara HQ")}
          title={t("Platform overview")}
          subtitle={t("Subscribers, revenue and system health across every school, university and teacher.")}
          meta={
            <>
              <span className="font-display text-2xl font-bold">{fmt.money(stats.mrr_cents)}</span>
              <span className="text-ink-muted">{t("monthly recurring revenue · {count} active subscribers", { count: stats.tenants.active })}</span>
            </>
          }
          actions={
            <>
              <Link href="/tenants" className={bannerButtonClass()}>
                <Building2 className="h-4 w-4" /> {t("Schools & teachers")}
              </Link>
              <Link href="/subscriptions" className={bannerButtonClass("outline")}>
                <CreditCard className="h-4 w-4" /> {t("Subscriptions")}
              </Link>
              <Link href="/website" className={bannerButtonClass("outline")}>
                <Globe2 className="h-4 w-4" /> {t("Edit website")}
              </Link>
            </>
          }
          art={<BannerArt photo="classroom" />}
        />
      </FadeIn>

      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StaggerItem>
          <StatCard label={t("Monthly recurring revenue")} value={fmt.money(stats.mrr_cents)} icon={<DollarSign className="h-5 w-5" />} />
        </StaggerItem>
        <StaggerItem>
          <StatCard label={t("Active subscribers")} value={stats.tenants.active} hint={t("{count} total", { count: stats.tenants.total })} icon={<Building2 className="h-5 w-5" />} accent="accent" />
        </StaggerItem>
        <StaggerItem>
          <StatCard label={t("Members")} value={stats.users.members} hint={t("{count} signed in this week", { count: stats.users.active_last_7_days })} icon={<Users className="h-5 w-5" />} accent="amber" />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label={t("Failed jobs")}
            value={stats.system.failed_jobs}
            hint={t("{count} queued", { count: stats.system.queued_jobs })}
            tone={stats.system.failed_jobs > 0 ? "danger" : "success"}
            icon={<ServerCrash className="h-5 w-5" />}
            accent="live"
          />
        </StaggerItem>
      </Stagger>

      <SectionHeading title={t("Growth & usage")} className="mt-10" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold">{t("Sign-ups, last 30 days")}</h2>
          <p className="mb-4 text-sm text-ink-muted">{t("{count} new workspaces", { count: signups.reduce((a, b) => a + b, 0) })}</p>
          <Sparkline values={signups} label={t("New workspaces per day over the last 30 days")} />
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">{t("Subscriptions by status")}</h2>
          <BarChart label={t("Subscriptions by status")} data={Object.entries(stats.subscriptions).map(([label, value]) => ({ label, value }))} />
        </Card>
        <Card>
          <h2 className="mb-1 font-semibold">{t("Everyone on the platform")}</h2>
          <p className="mb-4 text-sm text-ink-muted">{t("{count} suspended accounts", { count: stats.users.suspended })}</p>
          <BarChart
            label={t("Users by role")}
            data={(["owner", "admin", "teacher", "student", "parent"] as const).map((role) => ({ label: role === "teacher" ? "teachers & doctors" : `${role}s`, value: stats.users.by_role[role] ?? 0 }))}
          />
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">{t("Subscribers by type")}</h2>
          <BarChart label={t("Subscribers by type")} data={Object.entries(stats.tenants.by_type).map(([label, value]) => ({ label, value }))} />
        </Card>
      </div>
    </>
  );
}
