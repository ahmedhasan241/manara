import { AppShell, type CommandItem, type ShellNavGroup } from "@educloud/ui";
import { requireAudience } from "@educloud/portal-kit/session";
import { LiveNotifications } from "@educloud/portal-kit/live-notifications";
import { LiveNowBanner } from "@educloud/portal-kit/live-now-banner";
import { OfflineSync } from "@/components/offline-sync";
import { SignOutButton } from "@/components/sign-out-button";
import { getI18n, getT } from "@educloud/ui/locale";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Students and parents have their own portal.
  const { api, me, workspace, can, isStaff } = await requireAudience("staff");
  const { t, locale } = await getI18n();
  const [notifications, lessons, courses] = await Promise.all([
    api.notifications().catch(() => ({ data: [], unread_count: 0 })),
    api.upcomingLessons().catch(() => []),
    api.courses({}).catch(() => ({ data: [] })),
  ]);
  const liveNow = lessons.filter((l) => l.status === "live");
  const canTeach = can("courses.manage");
  const canStructure = canTeach || can("members.manage");
  const canResults = canTeach || can("reports.view") || can("members.manage");
  const university = workspace.tenant.type === "university";

  const nav: ShellNavGroup[] = [
    {
      label: t("Teach"),
      items: [
        { href: "/", label: t("Dashboard"), icon: "dashboard" },
        ...(canTeach ? [{ href: "/teaching", label: t("My teaching"), icon: "teaching" as const }] : []),
        { href: "/courses", label: t("Courses"), icon: "courses" },
        { href: "/live", label: t("Live lessons"), icon: "live", badge: liveNow.length ? "live" : undefined },
        { href: "/calendar", label: t("Calendar"), icon: "calendar" },
        { href: "/messages", label: t("Messages"), icon: "messages" },
      ],
    },
    ...(canStructure || canResults
      ? [
          {
            label: t("Academics"),
            items: [
              ...(canStructure ? [{ href: "/classes", label: university ? t("Years & sections") : t("Classes"), icon: "classes" as const }] : []),
              ...(canResults ? [{ href: "/rankings", label: t("Rankings"), icon: "rankings" as const }] : []),
              ...(canResults ? [{ href: "/attendance", label: t("Attendance"), icon: "attendance" as const }] : []),
            ],
          },
        ]
      : []),
    {
      label: t("Stay informed"),
      items: [
        { href: "/announcements", label: t("Announcements"), icon: "announcements" },
        { href: "/notifications", label: t("Notifications"), icon: "notifications", badge: notifications.unread_count || undefined },
      ],
    },
    {
      label: t("Workspace"),
      items: [
        ...(can("reports.view") ? [{ href: "/analytics", label: t("Analytics"), icon: "analytics" as const }] : []),
        { href: "/reviews", label: t("Reviews"), icon: "reviews" },
        ...(can("courses.manage") ? [{ href: "/sales", label: t("Online sales"), icon: "plans" as const }] : []),
        ...(can("courses.manage") ? [{ href: "/coupons", label: t("Discount codes"), icon: "coupons" as const }] : []),
        ...(can("members.manage") ? [{ href: "/people", label: t("People"), icon: "people" as const }] : []),
        { href: "/settings", label: t("Settings"), icon: "settings" },
      ],
    },
  ];

  const commands: CommandItem[] = [
    ...(can("courses.manage")
      ? [
          { id: "schedule", label: t("Schedule a live lesson"), href: "/live", group: "actions" as const, keywords: "zoom lecture meeting" },
          { id: "course", label: t("Create a course"), href: "/courses?new=1", group: "actions" as const },
        ]
      : []),
    ...(can("announcements.write") ? [{ id: "announce", label: t("Post an announcement"), href: "/announcements", group: "actions" as const }] : []),
    { id: "message", label: t("Send a message"), href: "/messages", group: "actions" },
    ...(canTeach ? [{ id: "teaching", label: t("My teaching"), href: "/teaching", group: "actions" as const, keywords: "today plan homework marking at risk" }] : []),
    ...(can("members.manage") ? [{ id: "classes", label: university ? t("Add a year or section") : t("Add a level or class"), href: "/classes", group: "actions" as const, keywords: "grade level class section year structure" }] : []),
    ...(canResults
      ? [
          { id: "rankings", label: t("See rankings"), href: "/rankings", group: "actions" as const, keywords: "top students leaderboard gpa average" },
          { id: "attendance", label: t("Check attendance"), href: "/attendance?status=flagged", group: "actions" as const, keywords: "absences warning limit late" },
        ]
      : []),
    ...courses.data.map((c) => ({ id: `course-${c.id}`, label: c.title, hint: c.code, href: `/courses/${c.id}`, group: "courses" as const, keywords: c.code })),
  ];

  const signOut = <SignOutButton />;

  return (
    <AppShell
      nav={nav}
      locale={locale}
      workspace={{ name: workspace.tenant.name, subtitle: workspace.tenant.type }}
      user={{ name: me.name, role: workspace.role, email: me.email }}
      notifications={{
        items: notifications.data.map((n) => ({ id: n.id, title: n.data.title, body: n.data.body, created_at: n.created_at, read: !!n.read_at })),
        unread: notifications.unread_count,
        href: "/notifications",
      }}
      commands={commands}
      signOut={signOut}
      bottomNav={["/", "/courses", "/live", "/messages"]}
      footer={<SignOutButton variant="icon" />}
      banner={<LiveNowBanner userId={me.id} initial={liveNow} />}
    >
      {isStaff && <OfflineSync offlineMessage={t("You're offline. Changes are saved on this device and will sync automatically.")} />}
      {children}
      <LiveNotifications userId={me.id} />
    </AppShell>
  );
}
