import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { ApiError } from "@educloud/api-client";
import { serverClient } from "@educloud/api-client/server";
import { Avatar, Badge, Card, PageHeader, asKey } from "@educloud/ui";
import { UserControls } from "@/components/user-controls";
import { getFormat, getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("User") };
}

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const fmt = await getFormat();
  const t = await getT();
  const { id } = await params;
  const user = await (await serverClient()).platformUser(Number(id)).catch((error) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });

  return (
    <>
      <PageHeader
        back={{ href: "/users", label: t("All users") }}
        icon={<Avatar name={user.name} size="md" className="!h-11 !w-11" />}
        title={user.name}
        description={user.email}
        meta={
          <>
            {user.suspended_at ? <Badge tone="danger">{t("Suspended")}</Badge> : <Badge tone="success">{t("Active")}</Badge>}
            {user.mfa_enabled ? (
              <Badge tone="success">
                <ShieldCheck className="h-3 w-3" /> {t("2FA on")}
              </Badge>
            ) : (
              <Badge>
                <ShieldOff className="h-3 w-3" /> {t("2FA off")}
              </Badge>
            )}
          </>
        }
      />

      {user.suspended_at && (
        <Card className="mb-6 border-danger/40 bg-danger/5 text-sm">
          {t("Suspended on")}{" "}{fmt.dateTime(user.suspended_at)}
          {user.suspension_reason && ` — ${user.suspension_reason}`}
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 font-display font-bold">{t("Workspaces")}</h2>
            {user.memberships.length === 0 ? (
              <p className="text-sm text-ink-muted">{t("Not a member of any workspace.")}</p>
            ) : (
              <ul className="space-y-2">
                {user.memberships.map((m, i) => (
                  <li key={i} className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3">
                    {m.tenant ? (
                      <Link href={`/tenants/${m.tenant.id}`} className="font-semibold hover:text-brand-600">
                        {m.tenant.name}
                      </Link>
                    ) : (
                      <span>{t("Deleted workspace")}</span>
                    )}
                    <Badge tone="brand">{t(asKey(m.role))}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {(user.children.length > 0 || user.guardians.length > 0) && (
            <Card>
              <h2 className="mb-4 font-display font-bold">{t("Family links")}</h2>
              {user.children.length > 0 && (
                <>
                  <p className="mb-2 text-sm font-semibold text-ink-muted">{t("Parent or guardian of")}</p>
                  <ul className="mb-4 flex flex-wrap gap-2">
                    {user.children.map((c) => (
                      <li key={c.id}>
                        <Link href={`/users/${c.id}`} className="inline-flex items-center gap-2 rounded-full bg-surface-2 py-1 pe-3 ps-1 text-sm font-semibold hover:bg-surface-3">
                          <Avatar name={c.name} size="sm" className="h-7 w-7" /> {c.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {user.guardians.length > 0 && (
                <>
                  <p className="mb-2 text-sm font-semibold text-ink-muted">{t("Followed by")}</p>
                  <ul className="flex flex-wrap gap-2">
                    {user.guardians.map((g) => (
                      <li key={g.id}>
                        <Link href={`/users/${g.id}`} className="inline-flex items-center gap-2 rounded-full bg-surface-2 py-1 pe-3 ps-1 text-sm font-semibold hover:bg-surface-3">
                          <Avatar name={g.name} size="sm" className="h-7 w-7" /> {g.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>
          )}

          <Card>
            <h2 className="mb-4 font-display font-bold">{t("Recent activity")}</h2>
            {user.activity.length === 0 ? (
              <p className="text-sm text-ink-muted">{t("No activity yet.")}</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {user.activity.map((a) => (
                  <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2">
                    <span className="font-mono text-xs">{a.action}</span>
                    <span className="text-ink-muted">
                      {a.ip_address} · {fmt.dateTime(a.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <h2 className="mb-4 font-display font-bold">{t("Account")}</h2>
            <dl className="mb-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted">{t("Joined")}</dt>
                <dd>{fmt.date(user.created_at)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">{t("Last sign-in")}</dt>
                <dd>{user.last_login_at ? fmt.dateTime(user.last_login_at) : t("Never")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">{t("Signed-in devices")}</dt>
                <dd>{user.devices}</dd>
              </div>
            </dl>
            {!user.is_platform_admin && <UserControls userId={user.id} suspended={!!user.suspended_at} mfaEnabled={user.mfa_enabled} />}
          </Card>
        </aside>
      </div>
    </>
  );
}
