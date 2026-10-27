import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, ExternalLink, GraduationCap, HeartHandshake, School, Shield, Users } from "lucide-react";
import { ApiError } from "@educloud/api-client";
import { serverClient } from "@educloud/api-client/server";
import { Avatar, Badge, Card, FilterChips, PageHeader, Stagger, StaggerItem, StatCard, asKey, buttonClass } from "@educloud/ui";
import { ChangePlanForm } from "@/components/change-plan-form";
import { setTenantStatus } from "../../../actions";
import { ToastButton } from "@/components/toast-button";
import { subscriptionPrice, subscriptionSeats } from "@/lib/subscription-price";
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
      <PageHeader
        back={{ href: "/tenants", label: t("Schools & teachers") }}
        icon={<Building2 />}
        title={tenant.name}
        description={`${tenant.slug} · ${t("created {date}", { date: fmt.date(tenant.created_at) })}`}
        meta={
          <>
            <Badge tone="brand">{tenant.type === "teacher" ? t("Teacher / lecturer") : t(asKey(tenant.type))}</Badge>
            <Badge tone={tenant.status === "active" ? "success" : "danger"}>{t(asKey(tenant.status))}</Badge>
            {current && <Badge tone={statusTone[current.status]}>{`${current.plan.name} · ${t(asKey(current.status))}`}</Badge>}
          </>
        }
        actions={
          <>
            <a href={siteUrl} target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
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
          <StatCard label={t("Package")} value={current?.plan.name ?? "—"} hint={current ? [t(asKey(current.status)), subscriptionPrice(current, fmt, t), subscriptionSeats(current, t), current.video_addon ? t("Video") : ""].filter(Boolean).join(" · ") : undefined} icon={<Shield className="h-5 w-5" />} accent="live" />
        </StaggerItem>
      </Stagger>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_24rem]">
        <Card className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
            <h2 className="flex items-center gap-2 font-display font-bold">
              <Users className="h-5 w-5 text-brand-500" /> {t("People")}
            </h2>
            <FilterChips
              param="role"
              label={t("Role")}
              options={[
                { label: t("Everyone") },
                { value: "owner", label: t("Owners") },
                { value: "admin", label: t("Admins") },
                { value: "teacher", label: t("Teachers & doctors") },
                { value: "student", label: t("Students") },
                { value: "parent", label: t("Parents") },
              ]}
            />
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
            <ChangePlanForm key={current?.id} tenantId={tenant.id} plans={plans} current={current} />
          </Card>
          <Card>
            <h2 className="mb-4 font-display font-bold">{t("Subscription history")}</h2>
            <ol className="space-y-3">
              {[...tenant.subscriptions].reverse().map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0">
                    <span className="block font-semibold">{s.plan.name}</span>
                    <span className="block text-xs tabular-nums text-ink-muted">
                      {[fmt.date(s.created_at), subscriptionPrice(s, fmt, t), subscriptionSeats(s, t)].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    {s.video_addon && <Badge tone="brand">{t("Video")}</Badge>}
                    <Badge tone={statusTone[s.status]}>{t(asKey(s.status))}</Badge>
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
