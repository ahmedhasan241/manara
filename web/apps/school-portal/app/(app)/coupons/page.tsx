import Link from "next/link";
import { Plus, TicketPercent } from "lucide-react";
import { Badge, Card, ClearFilters, EmptyState, FilterBar, FilterChips, PageHeader, SearchField, buttonClass } from "@educloud/ui";
import { getContext } from "@educloud/portal-kit/session";
import { getFormat, getT } from "@educloud/ui/locale";
import { CouponRowActions } from "@/components/coupon-tools";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Discount codes") };
}

type State = "active" | "paused" | "expired" | "used";

/** Discount codes for the workspace's online courses. */
export default async function CouponsPage({ searchParams }: { searchParams: Promise<{ search?: string; status?: string }> }) {
  const t = await getT();
  const fmt = await getFormat();
  const { api } = await getContext();
  const { search, status } = await searchParams;
  const coupons = await api.coupons();
  const state = (c: (typeof coupons)[number]): State =>
    !c.is_active ? "paused" : c.expires_at && new Date(c.expires_at) < new Date() ? "expired" : c.max_uses !== null && c.uses_count >= c.max_uses ? "used" : "active";
  const badges: Record<State, { tone: "neutral" | "warning" | "success"; label: string }> = {
    active: { tone: "success", label: t("Active") },
    paused: { tone: "neutral", label: t("Paused") },
    expired: { tone: "warning", label: t("Expired") },
    used: { tone: "warning", label: t("Used up") },
  };
  const query = search?.trim().toLowerCase();
  const matching = coupons.filter((c) => !query || c.code.toLowerCase().includes(query) || c.course?.title.toLowerCase().includes(query));
  const shown = matching.filter((c) => !status || state(c) === status);

  return (
    <>
      <PageHeader
        icon={<TicketPercent />}
        title={t("Discount codes")}
        description={t("Give learners a percentage off your online courses: for a launch, a class, or a partner.")}
        actions={
          <Link href="/coupons/new" className={buttonClass("primary")}>
            <Plus className="h-4 w-4" /> {t("New code")}
          </Link>
        }
        toolbar={
          coupons.length > 0 && (
            <FilterBar
              search={<SearchField placeholder={t("Search codes")} />}
              chips={
                <FilterChips
                  param="status"
                  label={t("Status")}
                  options={[
                    { label: t("All"), count: matching.length },
                    ...(["active", "paused", "expired", "used"] as const).map((s) => ({
                      value: s,
                      label: badges[s].label,
                      count: matching.filter((c) => state(c) === s).length,
                      tone: s === "active" ? ("success" as const) : s === "paused" ? undefined : ("warning" as const),
                    })),
                  ]}
                />
              }
              summary={(search || status) && <ClearFilters params={["search", "status"]} />}
            />
          )
        }
      />

      {shown.length === 0 ? (
        coupons.length === 0 ? (
          <EmptyState
            icon={<TicketPercent className="h-5 w-5" />}
            title={t("No codes yet")}
            description={t("Create one and share it in class, by email or on social media.")}
            action={
              <Link href="/coupons/new" className={buttonClass("primary")}>
                <Plus className="h-4 w-4" /> {t("New code")}
              </Link>
            }
          />
        ) : (
          <EmptyState icon={<TicketPercent className="h-5 w-5" />} title={t("No codes match")} />
        )
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {shown.map((c) => {
            const s = badges[state(c)];
            return (
              <li key={c.id}>
                <Card className="flex h-full flex-wrap items-center gap-x-4 gap-y-2">
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
    </>
  );
}
