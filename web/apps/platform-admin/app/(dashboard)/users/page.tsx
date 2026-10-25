import Link from "next/link";
import { ShieldCheck, Users } from "lucide-react";
import { serverClient } from "@educloud/api-client/server";
import { Avatar, Badge, Button, Card, EmptyState, Input, PageHeader, Select, asKey, cn, formatLocation } from "@educloud/ui";
import { getFormat, getRequestLocale, getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("All users") };
}

const ROLES = [
  { value: "", label: "Everyone" },
  { value: "owner", label: "Owners" },
  { value: "admin", label: "Admins" },
  { value: "teacher", label: "Teachers & doctors" },
  { value: "student", label: "Students" },
  { value: "parent", label: "Parents" },
  { value: "platform", label: "Manara staff" },
] as const;

const roleTone = { owner: "brand", admin: "brand", teacher: "accent", student: "neutral", parent: "warning" } as const;

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ search?: string; role?: string; status?: string; page?: string }> }) {
  const fmt = await getFormat();
  const { locale } = await getRequestLocale();
  const t = await getT();
  const params = await searchParams;
  const users = await (await serverClient()).platformUsers({ search: params.search, role: params.role, status: params.status, page: params.page ? Number(params.page) : undefined });

  const href = (overrides: Record<string, string | undefined>) => {
    const q = new URLSearchParams(Object.entries({ ...params, page: undefined, ...overrides }).filter((e): e is [string, string] => !!e[1]));
    return `/users${q.size ? `?${q}` : ""}`;
  };

  return (
    <>
      <PageHeader eyebrow={t("Customers")} title={t("All users")} description={t("{count} people across every school, university and teacher workspace.", { count: users.total })} />

      <div className="mb-4 flex flex-wrap gap-2">
        {ROLES.map((r) => (
          <Link
            key={r.value}
            href={href({ role: r.value || undefined })}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition",
              (params.role ?? "") === r.value ? "bg-brand-600 text-white" : "bg-surface text-ink-muted ring-1 ring-line hover:text-ink",
            )}
          >
            {t(r.label)}
          </Link>
        ))}
      </div>

      <form className="mb-6 flex max-w-2xl flex-wrap gap-2" role="search">
        {params.role && <input type="hidden" name="role" value={params.role} />}
        <Input name="search" defaultValue={params.search} placeholder={t("Search name or email")} aria-label={t("Search users")} className="min-w-60 flex-1" />
        <Select name="status" defaultValue={params.status ?? ""} aria-label={t("Status")} className="w-40">
          <option value="">{t("Any status")}</option>
          <option value="active">{t("Active")}</option>
          <option value="suspended">{t("Suspended")}</option>
        </Select>
        <Button variant="secondary" type="submit">
          {t("Filter")}
        </Button>
      </form>

      {users.data.length === 0 ? (
        <EmptyState icon={<Users className="h-6 w-6" />} title={t("No users match")} />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="border-b border-line text-ink-muted">
              <tr>
                <th className="px-5 py-3 text-start font-semibold">{t("Person")}</th>
                <th className="px-5 py-3 text-start font-semibold">{t("Workspaces & roles")}</th>
                <th className="px-5 py-3 text-start font-semibold">{t("Last sign-in")}</th>
                <th className="px-5 py-3 text-start font-semibold">{t("Status")}</th>
              </tr>
            </thead>
            <tbody>
              {users.data.map((u) => (
                <tr key={u.id} className="border-b border-line transition last:border-0 hover:bg-surface-2/60">
                  <td className="px-5 py-3">
                    <Link href={`/users/${u.id}`} className="flex items-center gap-3">
                      <Avatar name={u.name} size="sm" />
                      <span>
                        <span className="block font-semibold hover:text-brand-600">{u.name}</span>
                        <span className="block text-xs text-ink-muted">{u.email}</span>
                        {formatLocation(u, locale) && <span className="block text-xs text-ink-muted">{formatLocation(u, locale, { flag: true })}</span>}
                      </span>
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.is_platform_admin && <Badge tone="brand">{t("Manara staff")}</Badge>}
                      {u.memberships.map((m, i) => (
                        <Badge key={i} tone={roleTone[m.role]}>
                          {t(asKey(m.role))} · {m.tenant?.name}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-ink-muted">{u.last_login_at ? fmt.date(u.last_login_at) : t("Never")}</td>
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-1.5">
                      {u.suspended_at ? <Badge tone="danger">{t("Suspended")}</Badge> : <Badge tone="success">{t("Active")}</Badge>}
                      {u.mfa_enabled && <ShieldCheck className="h-4 w-4 text-success" aria-label={t("Two-factor on")} />}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {users.last_page > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-2 text-sm" aria-label={t("Pages")}>
          {users.current_page > 1 && (
            <Link href={href({ page: String(users.current_page - 1) })} className="rounded-lg px-3 py-1.5 ring-1 ring-line hover:bg-surface">
              {t("Previous")}
            </Link>
          )}
          <span className="text-ink-muted">
            {t("Page {page} of {pages}", { page: users.current_page, pages: users.last_page })}
          </span>
          {users.current_page < users.last_page && (
            <Link href={href({ page: String(users.current_page + 1) })} className="rounded-lg px-3 py-1.5 ring-1 ring-line hover:bg-surface">
              {t("Next")}
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
