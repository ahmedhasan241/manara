import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, GraduationCap, HeartHandshake, School, Shield, Users } from "lucide-react";
import { ApiError } from "@educloud/api-client";
import { serverClient } from "@educloud/api-client/server";
import { Avatar, Badge, Button, Card, PageHeader, Stagger, StaggerItem, StatCard, asKey, cn } from "@educloud/ui";
import { ChangePlanForm } from "@/components/change-plan-form";
import { setTenantStatus } from "../../../actions";
import { ToastButton } from "@/components/toast-button";
import { getFormat, getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Workspace") };
}

const statusTone = { active: "success", trialing: "brand", past_due: "warning", canceled: "danger" } as const;

export default async function TenantPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ role?: string }> }) {
  const fmt = await getFormat();
  const t = await getT();
  const id = Number((await params).id);
  const { role } = await searchParams;
  const api = await serverClient();

  const [detail, members, plans] = await Promise.all([api.platformTenant(id), api.platformTenantMembers(id, { role }), api.platformPlans()]).catch((error) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });
  const { tenant, counts } = detail;
  const current = tenant.subscriptions.at(-1);
  const siteUrl = `${process.env.NEXT_PUBLIC_SCHOOL_SITE_URL ?? "http://localhost:3002"}/${tenant.slug}`;

  return (
    <>
      <Link href="/tenants" className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> {t("Schools & teachers")}
      </Link>
      <PageHeader
        eyebrow={tenant.type === "teacher" ? t("Teacher / lecturer") : tenant.type}
        title={tenant.name}
        description={`${tenant.slug} · ${t("created {date}", { date: fmt.date(tenant.created_at) })}`}
        actions={
          <>
            <a href={siteUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-ink-muted ring-1 ring-line hover:text-ink">
              {t("Public site")}{" "}<ExternalLink className="h-4 w-4" />
            </a>
            <ToastButton
              variant={tenant.status === "active" ? "danger" : "primary"}
              action={setTenantStatus.bind(null, tenant.id, tenant.status === "active" ? "suspended" : "active")}
              confirm={tenant.status === "active" ? { title: t("Suspend {name}?", { name: tenant.name }), description: t("Nobody in this workspace can sign in until you reactivate it."), confirmLabel: t("Suspend workspace") } : undefined}
            >
              {tenant.status === "active" ? t("Suspend workspace") : t("Reactivate workspace")}
            </ToastButton>
          </>
        }
      />

      {tenant.status !== "active" && <Card className="mb-6 border-danger/40 bg-danger/5 text-sm font-medium">{t("This workspace is suspended. Nobody in it can sign in to it.")}</Card>}

      <Stagger className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <StatCard label={t("Staff")} value={(counts.owner ?? 0) + (counts.admin ?? 0) + (counts.teacher ?? 0)} icon={<School className="h-5 w-5" />} />
        </StaggerItem>
        <StaggerItem>
          <StatCard label={t("Students")} value={counts.student ?? 0} icon={<GraduationCap className="h-5 w-5" />} accent="accent" />
        </StaggerItem>
        <StaggerItem>
          <StatCard label={t("Parents")} value={counts.parent ?? 0} icon={<HeartHandshake className="h-5 w-5" />} accent="amber" />
        </StaggerItem>
        <StaggerItem>
          <StatCard label={t("Package")} value={current?.plan.name ?? "—"} hint={current ? `${t(asKey(current.status))} · ${fmt.money(current.plan.price_monthly_cents, current.plan.currency)}/mo` : undefined} icon={<Shield className="h-5 w-5" />} accent="live" />
        </StaggerItem>
      </Stagger>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_24rem]">
        <Card className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
            <h2 className="flex items-center gap-2 font-display font-bold">
              <Users className="h-5 w-5 text-brand-500" /> {t("People")}
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {["", "owner", "admin", "teacher", "student", "parent"].map((r) => (
                <Link
                  key={r}
                  href={r ? `?role=${r}` : "?"}
                  className={cn("rounded-full px-3 py-1 text-xs font-semibold capitalize", (role ?? "") === r ? "bg-brand-600 text-white" : "bg-surface-2 text-ink-muted hover:text-ink")}
                >
                  {r || "all"}
                </Link>
              ))}
            </div>
          </div>
          <ul className="divide-y divide-line">
            {members.data.map((m) => (
              <li key={m.id}>
                <Link href={`/users/${m.user.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2/60">
                  <Avatar name={m.user.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{m.user.name}</span>
                    <span className="block truncate text-xs text-ink-muted">{m.user.email}</span>
                  </span>
                  {m.user.suspended_at && <Badge tone="danger">{t("suspended")}</Badge>}
                  <Badge tone="brand">{t(asKey(m.role))}</Badge>
                </Link>
              </li>
            ))}
            {members.data.length === 0 && <li className="p-5 text-sm text-ink-muted">{t("No people with this role.")}</li>}
          </ul>
          {members.total > members.data.length && <p className="border-t border-line p-4 text-center text-xs text-ink-muted">{t("Showing {shown} of {total}", { shown: members.data.length, total: members.total })}</p>}
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 font-display font-bold">{t("Change package")}</h2>
            <ChangePlanForm tenantId={tenant.id} plans={plans} currentPlanId={current?.plan.id} />
          </Card>
          <Card>
            <h2 className="mb-4 font-display font-bold">{t("Subscription history")}</h2>
            <ol className="space-y-3">
              {[...tenant.subscriptions].reverse().map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    <span className="block font-semibold">{s.plan.name}</span>
                    <span className="text-xs text-ink-muted">{fmt.date(s.created_at)}</span>
                  </span>
                  <Badge tone={statusTone[s.status]}>{t(asKey(s.status))}</Badge>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
