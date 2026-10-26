import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { ApiError } from "@educloud/api-client";
import { hasSession, serverClient } from "@educloud/api-client/server";
import { Alert, AppShell, type CommandItem } from "@educloud/ui";
import { getRequestLocale, getT } from "@educloud/ui/locale";
import { logout } from "../actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const t = await getT();
  if (!(await hasSession())) redirect("/login");

  let me;
  try {
    me = await (await serverClient()).me();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/login?expired=1");
    throw error;
  }
  if (!me.is_platform_admin) redirect("/login");
  const { locale } = await getRequestLocale();

  const commands: CommandItem[] = [
    { id: "suspended", label: t("Suspended users"), href: "/users?status=suspended", group: "actions" },
    { id: "trials", label: t("Trials ending this week"), href: "/subscriptions?status=trial_ending", group: "actions" },
    { id: "past-due", label: t("Past-due subscriptions"), href: "/subscriptions?status=past_due", group: "actions" },
    { id: "new-plan", label: t("Create a package"), href: "/plans/new", group: "actions" },
    { id: "edit-hero", label: t("Edit the website headline"), href: "/website", group: "actions", keywords: "marketing cms hero" },
    { id: "parents", label: t("All parents"), href: "/users?role=parent", group: "actions" },
    { id: "teachers", label: t("All teachers & doctors"), href: "/users?role=teacher", group: "actions" },
  ];

  return (
    <AppShell
      locale={locale}
      nav={[
        { label: t("Platform"), items: [{ href: "/", label: t("Overview"), icon: "overview" }] },
        {
          label: t("Customers"),
          items: [
            { href: "/tenants", label: t("Schools & teachers"), icon: "tenants" },
            { href: "/users", label: t("All users"), icon: "people" },
            { href: "/subscriptions", label: t("Subscriptions"), icon: "plans" },
          ],
        },
        {
          label: t("Product"),
          items: [
            { href: "/plans", label: t("Packages"), icon: "package" },
            { href: "/marketplace", label: t("Course marketplace"), icon: "store" },
            { href: "/website", label: t("Website"), icon: "website" },
            { href: "/design", label: t("Design system"), icon: "design" },
          ],
        },
      ]}
      signOutAction={logout}
      workspace={{ name: t("Manara HQ"), subtitle: t("Platform admin") }}
      user={{ name: me.name, role: t("Staff"), email: me.email }}
      commands={commands}
      settingsHref="/account"
      bottomNav={["/", "/tenants", "/users", "/subscriptions"]}
      signOut={
        <form action={logout}>
          <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-danger hover:bg-danger/10">
            <LogOut className="h-4 w-4" /> {t("Sign out")}
          </button>
        </form>
      }
    >
      {!me.mfa_enabled && (
        <div className="mb-6">
          <Alert tone="warning">{t("Staff accounts must turn on two-factor authentication before the admin API will respond.")}</Alert>
        </div>
      )}
      {children}
    </AppShell>
  );
}
