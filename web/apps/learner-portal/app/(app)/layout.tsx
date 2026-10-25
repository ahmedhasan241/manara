import { MapPin } from "lucide-react";
import { AppShell, formatLocation, type CommandItem, type ShellNavGroup } from "@educloud/ui";
import { requireAudience } from "@educloud/portal-kit/session";
import { LiveNotifications } from "@educloud/portal-kit/live-notifications";
import { LiveNowBanner } from "@educloud/portal-kit/live-now-banner";
import { ChildSwitcher } from "@/components/child-switcher";
import { SignOutButton } from "@/components/sign-out-button";
import { getI18n, getT } from "@educloud/ui/locale";

export default async function LearnerLayout({ children }: { children: React.ReactNode }) {
  // Teachers and administrators have their own portal.
  const { api, me, workspace } = await requireAudience("learner", "/staff-account");
  const { t, locale } = await getI18n();
  const isParent = workspace.role === "parent";
  const [notifications, lessons, kids, courses] = await Promise.all([
    api.notifications().catch(() => ({ data: [], unread_count: 0 })),
    api.upcomingLessons().catch(() => []),
    isParent ? api.learnerChildren() : Promise.resolve([]),
    api.courses({}).catch(() => ({ data: [] })),
  ]);
  const liveNow = lessons.filter((l) => l.status === "live");

  const nav: ShellNavGroup[] = [
    {
      label: isParent ? t("My children") : t("My studies"),
      items: [
        { href: "/dashboard", label: isParent ? t("Overview") : t("My progress"), icon: "dashboard" },
        { href: "/courses", label: t("Courses"), icon: "courses" },
        { href: "/live", label: t("Live lessons"), icon: "live", badge: liveNow.length ? "live" : undefined },
        { href: "/report-card", label: isParent ? t("Report card") : t("My grades"), icon: "report" },
        { href: "/attendance", label: t("Attendance"), icon: "attendance" },
        { href: "/rankings", label: t("Honor roll"), icon: "rankings" },
        { href: "/calendar", label: t("Calendar"), icon: "calendar" },
      ],
    },
    {
      label: t("Stay in touch"),
      items: [
        { href: "/messages", label: isParent ? t("Message teachers") : t("Messages"), icon: "messages" },
        { href: "/announcements", label: t("Announcements"), icon: "announcements" },
        { href: "/notifications", label: t("Notifications"), icon: "notifications", badge: notifications.unread_count || undefined },
      ],
    },
    {
      label: t("Learn online"),
      items: [
        { href: "/my-learning", label: t("My learning"), icon: "courses" },
        { href: "/explore", label: t("Explore courses"), icon: "website" },
      ],
    },
    { label: t("Account"), items: [{ href: "/settings", label: t("Settings"), icon: "settings" }] },
  ];

  const commands: CommandItem[] = [
    { id: "join", label: t("Join a live lesson"), href: "/live", group: "actions", keywords: "zoom lecture class" },
    { id: "message", label: t("Message a teacher"), href: "/messages", group: "actions" },
    { id: "report-card", label: isParent ? t("Open report card") : t("See my grades"), href: "/report-card", group: "actions", keywords: "grades marks gpa average results report card" },
    { id: "attendance", label: isParent ? t("Check attendance") : t("Check my attendance"), href: "/attendance", group: "actions", keywords: "absences late absent attendance" },
    { id: "rankings", label: t("See the honor roll"), href: "/rankings", group: "actions", keywords: "rank ranking top students honor roll leaderboard" },
    ...courses.data.map((c) => ({ id: `course-${c.id}`, label: c.title, hint: c.code, href: `/courses/${c.id}`, group: "courses" as const, keywords: c.code })),
  ];

  // Where they live, under their name in the account menu, then Sign out.
  const place = formatLocation(me, locale, { flag: true });
  const signOut = (
    <>
      {place && (
        <p className="flex items-center gap-1.5 px-2.5 pb-1.5 pt-1 text-xs text-ink-muted">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden /> <span className="truncate">{place}</span>
        </p>
      )}
      <SignOutButton className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-danger hover:bg-danger/10" />
    </>
  );

  return (
    <AppShell
      nav={nav}
      locale={locale}
      workspace={{ name: workspace.tenant.name, subtitle: isParent ? t("Family portal") : t("Student portal") }}
      user={{ name: me.name, role: workspace.role, email: me.email }}
      notifications={{
        items: notifications.data.map((n) => ({ id: n.id, title: n.data.title, body: n.data.body, created_at: n.created_at, read: !!n.read_at })),
        unread: notifications.unread_count,
        href: "/notifications",
      }}
      commands={commands}
      signOut={signOut}
      bottomNav={["/dashboard", "/courses", "/live", "/messages"]}
      banner={
        <>
          <LiveNowBanner userId={me.id} initial={liveNow} />
          {kids.length > 1 && <ChildSwitcher kids={kids} />}
        </>
      }
    >
      {children}
      <LiveNotifications userId={me.id} />
    </AppShell>
  );
}
