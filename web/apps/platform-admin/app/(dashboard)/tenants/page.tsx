import Link from "next/link";
import { serverClient } from "@educloud/api-client/server";
import { Building2 } from "lucide-react";
import { Badge, Card, ClearFilters, EmptyState, FilterBar, FilterSelect, PageHeader, Pagination, SearchField, asKey } from "@educloud/ui";
import { setTenantStatus } from "../../actions";
import { ToastButton } from "@/components/toast-button";
import { getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Subscribers") };
}

export default async function TenantsPage({ searchParams }: { searchParams: Promise<{ search?: string; status?: string; page?: string }> }) {
  const t = await getT();
  const { search, status, page } = await searchParams;
  const tenants = await (await serverClient()).platformTenants({ search, status, page: page ? Number(page) : undefined });

  return (
    <>
      <PageHeader
        eyebrow={t("Customers")}
        icon={<Building2 />}
        title={t("Schools & teachers")}
        description={t("{count} workspaces: individual teachers and lecturers, schools and universities.", { count: tenants.total })}
        toolbar={
          <FilterBar
            search={<SearchField placeholder={t("Search by name or address")} label={t("Search subscribers")} />}
            filters={
              <FilterSelect
                param="status"
                label={t("Status")}
                allLabel={t("Any status")}
                options={[
                  { value: "active", label: t("Active") },
                  { value: "suspended", label: t("Suspended") },
                ]}
              />
            }
            summary={(search || status) && <ClearFilters params={["search", "status"]} />}
          />
        }
      />

      {tenants.data.length === 0 ? (
        <EmptyState icon={<Building2 className="h-6 w-6" />} title={t("No subscribers found")} />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-line text-start text-ink-muted">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{t("Workspace")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("Type")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("Plan")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("Members")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("Status")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {tenants.data.map((tenant) => (
                <tr key={tenant.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/tenants/${tenant.id}`} className="font-semibold hover:text-brand-600">
                      {tenant.name}
                    </Link>
                    <p className="text-xs text-ink-muted">{tenant.slug}</p>
                  </td>
                  <td className="px-4 py-3 capitalize">{t(asKey(tenant.type))}</td>
                  <td className="px-4 py-3">
                    {tenant.subscription?.plan?.name ?? "—"}{" "}
                    {tenant.subscription && <Badge tone={tenant.subscription.status === "active" ? "success" : tenant.subscription.status === "trialing" ? "brand" : "warning"}>{t(asKey(tenant.subscription.status))}</Badge>}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{tenant.memberships_count}</td>
                  <td className="px-4 py-3">
                    <Badge tone={tenant.status === "active" ? "success" : "danger"}>{t(asKey(tenant.status))}</Badge>
                  </td>
                  <td className="px-4 py-3 text-end">
                    <ToastButton
                      size="sm"
                      variant={tenant.status === "active" ? "secondary" : "primary"}
                      action={setTenantStatus.bind(null, tenant.id, tenant.status === "active" ? "suspended" : "active")}
                      confirm={tenant.status === "active" ? { title: t("Suspend {name}?", { name: tenant.name }), description: t("Nobody in this workspace can sign in until you reactivate it."), confirmLabel: t("Suspend") } : undefined}
                    >
                      {tenant.status === "active" ? t("Suspend") : t("Reactivate")}
                    </ToastButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <Pagination page={tenants.current_page} pages={tenants.last_page} total={tenants.total} />
    </>
  );
}
