"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFormStatus } from "react-dom";
import { motion } from "motion/react";
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  Building2,
  ChevronRight,
  ClipboardCheck,
  Compass,
  CreditCard,
  GraduationCap,
  Presentation,
  School,
  Trophy,
  Gauge,
  Globe2,
  LayoutDashboard,
  Library,
  LogOut,
  Megaphone,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  MessageCircle,
  MoreHorizontal,
  Package,
  Search,
  Settings,
  Sparkles,
  Star,
  Store,
  TicketPercent,
  Users,
  Video,
  X,
  type LucideIcon,
} from "lucide-react";
import { Avatar, Logo, cn } from "./components";
import { CommandPalette, OPEN_COMMAND_PALETTE, type CommandItem } from "./command-palette";
import { LanguageMenu, NotificationsMenu, UserMenu, type HeaderNotification } from "./header";
import { AppearanceMenu } from "./theme";
import { Dialog, DialogTitle, SheetContent } from "./primitives";
import type { Locale } from "./i18n";
import { useT } from "./i18n-provider";
import { LiveDot, MotionProvider, RevealOnMount } from "./motion";
import { asKey } from "./translate";

/** Icons are referenced by name so server layouts can describe the menu. */
const ICONS = {
  dashboard: LayoutDashboard,
  courses: BookOpen,
  live: Video,
  messages: MessageCircle,
  announcements: Megaphone,
  notifications: Bell,
  analytics: BarChart3,
  people: Users,
  settings: Settings,
  overview: Gauge,
  tenants: Building2,
  plans: CreditCard,
  website: Globe2,
  design: Sparkles,
  calendar: CalendarDays,
  reviews: Star,
  coupons: TicketPercent,
  teaching: Presentation,
  classes: School,
  rankings: Trophy,
  attendance: ClipboardCheck,
  report: GraduationCap,
  package: Package,
  store: Store,
  explore: Compass,
  library: Library,
} satisfies Record<string, LucideIcon>;

export type ShellIcon = keyof typeof ICONS;

export interface ShellNavItem {
  href: string;
  label: string;
  icon: ShellIcon;
  badge?: number | "live";
}

export interface ShellNavGroup {
  label?: string;
  items: ShellNavItem[];
}

const COLLAPSE_KEY = "educloud-sidebar-collapsed";

/**
 * The application frame.
 *
 * Desktop: collapsible sidebar + a glass top bar (breadcrumb, ⌘K search, language,
 * appearance, notifications, account). Phones: compact top bar, slide-in drawer and
 * an app-style bottom tab bar. All directions mirror for right-to-left languages.
 */
export function AppShell({
  nav,
  workspace,
  user,
  footer,
  banner,
  children,
  locale = "en",
  notifications,
  commands = [],
  settingsHref = "/settings",
  signOut,
  signOutAction,
  bottomNav,
}: {
  nav: ShellNavGroup[];
  workspace: { name: string; subtitle?: string };
  user: { name: string; role: string; email?: string };
  footer?: ReactNode;
  banner?: ReactNode;
  children: ReactNode;
  locale?: Locale;
  notifications?: { items: HeaderNotification[]; unread: number; href: string };
  commands?: CommandItem[];
  settingsHref?: string;
  /** Sign-out control shown in the account menu (usually a server-action form). */
  signOut?: ReactNode;
  /** The app's sign-out server action, for the button in the sidebar footer. */
  signOutAction?: () => Promise<void>;
  /** Hrefs for the phone tab bar (max 4); defaults to the first four nav items. */
  bottomNav?: string[];
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const pathname = usePathname();
  const t = useT();

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {}
  }, []);
  useEffect(() => setDrawer(false), [pathname]);

  function toggle() {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {}
      return !c;
    });
  }

  const allItems = useMemo(() => nav.flatMap((g) => g.items.map((item) => ({ ...item, group: g.label }))), [nav]);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));
  const current = [...allItems].sort((a, b) => b.href.length - a.href.length).find((i) => isActive(i.href));
  const tabs = (bottomNav ? bottomNav.map((h) => allItems.find((i) => i.href === h)).filter((i): i is (typeof allItems)[number] => !!i) : allItems).slice(0, 4);
  const paletteItems: CommandItem[] = [...allItems.map((i) => ({ id: `nav-${i.href}`, label: i.label, href: i.href, group: "pages" as const, hint: i.group })), ...commands];

  return (
    <MotionProvider>
      <div className="app-canvas min-h-dvh">
        {/* Desktop sidebar */}
        <motion.aside
          animate={{ width: collapsed ? 84 : 272 }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
          className="fixed inset-y-0 start-0 z-40 hidden overflow-hidden lg:block"
        >
          <SidebarBody nav={nav} workspace={workspace} user={user} footer={footer} signOutAction={signOutAction} settingsHref={settingsHref} collapsed={collapsed} onToggle={toggle} isActive={isActive} />
        </motion.aside>

        {/* Phone drawer */}
        <Dialog open={drawer} onOpenChange={setDrawer}>
          <SheetContent side="start" className="w-[min(18.5rem,85vw)] gap-0 border-0 p-0 lg:hidden [&>button:last-child]:hidden" aria-describedby={undefined}>
            <DialogTitle className="sr-only">{t("Menu")}</DialogTitle>
            <SidebarBody nav={nav} workspace={workspace} user={user} footer={footer} signOutAction={signOutAction} settingsHref={settingsHref} collapsed={false} isActive={isActive} onClose={() => setDrawer(false)} />
          </SheetContent>
        </Dialog>

        <motion.div animate={{ paddingInlineStart: collapsed ? 84 : 272 }} transition={{ type: "spring", stiffness: 260, damping: 30 }} className="max-lg:!ps-0">
          {/* Top bar */}
          <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8">
              {/* Start: menu + brand on small screens, breadcrumb on desktop */}
              <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setDrawer(true)}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-surface-2 text-ink-muted transition hover:border-ink-muted/40 hover:text-ink lg:hidden"
                  aria-label={t("Menu")}
                >
                  <Menu className="h-5 w-5" />
                </button>
                <Link href="/" className="shrink-0 lg:hidden" aria-label={t("Home")}>
                  <span className="sm:hidden">
                    <Logo mark />
                  </span>
                  <span className="hidden sm:inline">
                    <Logo />
                  </span>
                </Link>

                <nav aria-label={t("Breadcrumb")} className="hidden min-w-0 items-center gap-2 text-sm lg:flex">
                  <span className="truncate text-ink-muted">{workspace.name}</span>
                  {current && (
                    <>
                      <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted/60 rtl:rotate-180" />
                      <span className="truncate font-semibold">{current.label}</span>
                    </>
                  )}
                </nav>
              </div>

              <div className="flex-1" />

              {/* End: search, tools, account */}
              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE))}
                  className="group flex h-10 w-10 items-center justify-center gap-2.5 rounded-xl border border-line bg-surface-2 text-sm text-ink-muted transition hover:border-ink-muted/40 hover:text-ink md:w-56 md:justify-start md:px-3.5 xl:w-72"
                  aria-label={t("Search or jump to…")}
                >
                  <Search className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                  <span className="hidden flex-1 truncate text-start md:inline">{t("Search or jump to…")}</span>
                  <kbd className="hidden rounded-md border border-line bg-surface px-1.5 py-0.5 text-[11px] font-semibold leading-none md:inline">⌘K</kbd>
                </button>

                <div className="flex items-center gap-0.5 sm:gap-1">
                  <LanguageMenu />
                  <div className="hidden sm:block">
                    <AppearanceMenu />
                  </div>
                  {notifications && <NotificationsMenu {...notifications} />}
                </div>

                <span aria-hidden className="hidden h-7 w-px bg-line sm:block" />
                <UserMenu name={user.name} role={t(asKey(user.role))} email={user.email} settingsHref={settingsHref} signOut={signOut} />
              </div>
            </div>
          </header>

          {banner}
          <main data-app-main className="mx-auto w-full max-w-7xl px-3.5 pb-24 pt-5 sm:px-6 sm:pt-7 lg:px-8 lg:pb-12 lg:pt-8">
            <RevealOnMount>{children}</RevealOnMount>
          </main>
        </motion.div>

        {/* Phone tab bar */}
        <nav data-bottom-bar aria-label={t("Primary")} className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
          <ul className="mx-auto grid max-w-lg grid-cols-5">
            {tabs.map((item) => {
              const Icon = ICONS[item.icon];
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link href={item.href} aria-current={active ? "page" : undefined} className="relative flex h-14 flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium">
                    {active && <motion.span layoutId="tab-active" className="absolute inset-x-4 top-0 h-0.5 rounded-b-full bg-brand-600" />}
                    <span className={cn("relative grid h-7 w-11 place-items-center rounded-full transition", active ? "bg-brand-600/12 text-brand-700 dark:text-brand-300" : "text-ink-muted")}>
                      <Icon className="h-[18px] w-[18px]" />
                      {item.badge === "live" && <LiveDot className="absolute end-1.5 top-0.5 scale-75" />}
                      {typeof item.badge === "number" && item.badge > 0 && (
                        <span className="absolute -top-1 end-1 grid h-4 min-w-4 place-items-center rounded-full bg-live-500 px-1 text-[10px] text-white">{item.badge > 9 ? "9+" : item.badge}</span>
                      )}
                    </span>
                    <span className={cn("max-w-full truncate px-1", active ? "text-ink" : "text-ink-muted")}>{item.label}</span>
                  </Link>
                </li>
              );
            })}
            <li>
              <button type="button" onClick={() => setDrawer(true)} className="flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium text-ink-muted">
                <span className="grid h-7 w-11 place-items-center rounded-full">
                  <MoreHorizontal className="h-[18px] w-[18px]" />
                </span>
                {t("More")}
              </button>
            </li>
          </ul>
        </nav>

        <CommandPalette items={paletteItems} />
      </div>
    </MotionProvider>
  );
}

/**
 * The sidebar: logo with the collapse toggle, the workspace, the grouped
 * navigation (scrolls on its own, with soft edges), and the
 * signed-in person at the bottom with settings and sign-out.
 */
function SidebarBody({
  nav,
  workspace,
  user,
  footer,
  signOutAction,
  settingsHref,
  collapsed,
  isActive,
  onToggle,
  onClose,
}: {
  nav: ShellNavGroup[];
  workspace: { name: string; subtitle?: string };
  user: { name: string; role: string; email?: string };
  footer?: ReactNode;
  signOutAction?: () => Promise<void>;
  settingsHref: string;
  collapsed: boolean;
  isActive: (href: string) => boolean;
  onToggle?: () => void;
  onClose?: () => void;
}) {
  const t = useT();
  const scroller = useRef<HTMLElement>(null);
  const [edges, setEdges] = useState({ top: false, bottom: false });

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const update = () => setEdges({ top: el.scrollTop > 4, bottom: el.scrollTop + el.clientHeight < el.scrollHeight - 4 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [collapsed]);

  return (
    <div className="flex h-full flex-col border-e border-line bg-surface text-ink">
      {/* Logo and collapse / close */}
      <div className={cn("flex h-16 shrink-0 items-center gap-2 px-4", collapsed ? "justify-center px-2" : "justify-between")}>
        {!collapsed && (
          <Link href="/" aria-label={t("Home")} className="text-heading">
            <Logo />
          </Link>
        )}
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-ink-muted transition hover:bg-surface-2 hover:text-ink"
            aria-label={collapsed ? t("Menu") : t("Collapse")}
            title={collapsed ? t("Menu") : t("Collapse")}
          >
            {collapsed ? <PanelLeftOpen className="h-5 w-5 rtl:-scale-x-100" /> : <PanelLeftClose className="h-5 w-5 rtl:-scale-x-100" />}
          </button>
        )}
        {onClose && (
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl text-ink-muted hover:bg-surface-3 hover:text-ink" aria-label={t("Close")}>
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Workspace */}
      <div className={cn("shrink-0 px-3 pb-3", collapsed && "px-2")}>
        <div className={cn("flex items-center gap-3 rounded-2xl border border-line bg-surface-2 p-2.5", collapsed && "justify-center border-0 bg-transparent p-0")} title={collapsed ? workspace.name : undefined}>
          <span className="banner-brand grid h-9 w-9 shrink-0 place-items-center rounded-xl font-bold text-brand-200">{workspace.name.charAt(0)}</span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-heading">{workspace.name}</p>
              {workspace.subtitle && <p className="truncate text-xs capitalize text-ink-muted">{workspace.subtitle}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="relative min-h-0 flex-1">
        <span aria-hidden className={cn("pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-gradient-to-b from-surface to-transparent transition-opacity", edges.top ? "opacity-100" : "opacity-0")} />
        <nav ref={scroller} aria-label={t("Main")} className="h-full space-y-4 overflow-y-auto px-3 pb-4 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {nav.map((group, gi) => (
            <div key={gi}>
              {group.label &&
                (collapsed ? (
                  gi > 0 && <span aria-hidden className="mx-auto mb-2 block h-px w-8 bg-line" />
                ) : (
                  <p className="mb-1 px-3 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">{group.label}</p>
                ))}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = ICONS[item.icon];
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                          active ? "text-white" : "text-ink-muted hover:bg-surface-2 hover:text-ink",
                          collapsed && "justify-center px-0",
                        )}
                      >
                        {active && (
                          <motion.span
                            layoutId={onClose ? "nav-active-drawer" : "nav-active"}
                            className="fill-brand absolute inset-0 rounded-xl shadow-[var(--shadow-soft)]"
                            transition={{ type: "spring", stiffness: 380, damping: 32 }}
                          />
                        )}
                        <Icon className={cn("relative h-[18px] w-[18px] shrink-0 transition-transform group-hover:scale-110", !active && "text-ink-muted group-hover:text-brand-600 dark:group-hover:text-brand-300")} />
                        {!collapsed && <span className="relative flex-1 truncate">{item.label}</span>}
                        {item.badge === "live" ? (
                          <span className={cn("relative", collapsed && "absolute end-2 top-2")}>
                            <LiveDot />
                          </span>
                        ) : item.badge ? (
                          <span className={cn("relative grid min-w-5 place-items-center rounded-full bg-live-500 px-1.5 text-[11px] font-bold text-white", collapsed && "absolute end-1.5 top-1 min-w-4 px-1 text-[10px]")}>
                            {item.badge > 99 ? "99+" : item.badge}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <span aria-hidden className={cn("pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-surface to-transparent transition-opacity", edges.bottom ? "opacity-100" : "opacity-0")} />
      </div>

      {/* The signed-in person, settings and sign-out */}
      <div className={cn("shrink-0 border-t border-line p-3", collapsed && "px-2")}>
        <div className={cn("flex items-center gap-2.5 rounded-2xl p-1.5", collapsed ? "flex-col" : "bg-surface-2")}>
          <Link href={settingsHref} onClick={onClose} title={collapsed ? `${user.name} · ${t(asKey(user.role))}` : undefined} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl transition hover:opacity-85">
            <Avatar name={user.name} size="sm" />
            {!collapsed && (
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-heading">{user.name}</span>
                <span className="block truncate text-xs capitalize text-ink-muted">{t(asKey(user.role))}</span>
              </span>
            )}
          </Link>
          {!collapsed && (
            <Link href={settingsHref} onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-ink-muted transition hover:bg-surface-3 hover:text-ink" aria-label={t("Settings")} title={t("Settings")}>
              <Settings className="h-4 w-4" />
            </Link>
          )}
          {footer}
          {signOutAction && (
            <form action={signOutAction}>
              <SignOutSubmit />
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/** The sidebar's sign-out button; spins while signing out. */
function SignOutSubmit() {
  const t = useT();
  const { pending } = useFormStatus();
  const label = pending ? t("Signing out…") : t("Sign out");
  return (
    <button type="submit" disabled={pending} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-ink-muted transition hover:bg-danger/10 hover:text-danger disabled:opacity-60" aria-label={label} title={label}>
      {pending ? <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" /> : <LogOut className="h-4 w-4 rtl:-scale-x-100" />}
    </button>
  );
}
