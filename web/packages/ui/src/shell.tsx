"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  Building2,
  ChevronRight,
  ChevronsLeft,
  ClipboardCheck,
  CreditCard,
  GraduationCap,
  Presentation,
  School,
  Trophy,
  Gauge,
  Globe2,
  LayoutDashboard,
  Megaphone,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Search,
  Settings,
  Sparkles,
  Star,
  TicketPercent,
  Users,
  Video,
  X,
  type LucideIcon,
} from "lucide-react";
import { Logo, cn } from "./components";
import { CommandPalette, OPEN_COMMAND_PALETTE, type CommandItem } from "./command-palette";
import { LanguageMenu, NotificationsMenu, UserMenu, type HeaderNotification } from "./header";
import { AppearanceMenu } from "./theme";
import { Dialog, DialogTitle, SheetContent } from "./primitives";
import type { Locale } from "./i18n";
import { useT } from "./i18n-provider";
import { LiveDot, MotionProvider } from "./motion";
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
          <SidebarBody nav={nav} workspace={workspace} footer={footer} collapsed={collapsed} onToggle={toggle} isActive={isActive} />
        </motion.aside>

        {/* Phone drawer */}
        <Dialog open={drawer} onOpenChange={setDrawer}>
          <SheetContent side="start" className="w-[min(18.5rem,85vw)] gap-0 border-0 p-0 lg:hidden [&>button:last-child]:hidden" aria-describedby={undefined}>
            <DialogTitle className="sr-only">{t("Menu")}</DialogTitle>
            <SidebarBody nav={nav} workspace={workspace} footer={footer} collapsed={false} isActive={isActive} onClose={() => setDrawer(false)} />
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
          <main className="mx-auto w-full max-w-7xl px-3.5 pb-24 pt-5 sm:px-6 sm:pt-8 lg:px-8 lg:pb-12 lg:pt-10">{children}</main>
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

/** Pastel tiles cycled through the menu, like the lesson list in the Campus design. */
const TINTS = ["bg-sky text-brand-700 dark:text-brand-300", "bg-peach text-brand-700 dark:text-brand-300", "bg-mint text-brand-700 dark:text-brand-300", "bg-blush text-brand-700 dark:text-brand-300", "bg-lilac text-brand-700 dark:text-brand-300"];

function SidebarBody({
  nav,
  workspace,
  footer,
  collapsed,
  isActive,
  onToggle,
  onClose,
}: {
  nav: ShellNavGroup[];
  workspace: { name: string; subtitle?: string };
  footer?: ReactNode;
  collapsed: boolean;
  isActive: (href: string) => boolean;
  onToggle?: () => void;
  onClose?: () => void;
}) {
  const t = useT();
  let index = 0;

  return (
    <div className="relative flex h-full flex-col border-e border-line bg-surface text-ink">
      <div className="relative flex h-16 items-center justify-between px-5">
        <Link href="/" aria-label={t("Home")} className="text-heading">
          <Logo mark={collapsed} />
        </Link>
        {onClose && (
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl text-ink-muted hover:bg-surface-3 hover:text-ink" aria-label={t("Close")}>
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Workspace card in the brand banner style */}
      <div className={cn("fill-brand relative mx-4 mb-5 overflow-hidden rounded-2xl p-3 text-white shadow-[var(--shadow-soft)]", collapsed && "mx-3 p-2")}>
        <div aria-hidden className="absolute -end-6 -top-8 h-20 w-20 rounded-full border-[10px] border-white/15" />
        <div className="relative flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/20 font-bold backdrop-blur">{workspace.name.charAt(0)}</span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{workspace.name}</p>
              {workspace.subtitle && <p className="truncate text-xs capitalize text-white/80">{workspace.subtitle}</p>}
            </div>
          )}
        </div>
      </div>

      <nav aria-label={t("Main")} className="relative flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        {nav.map((group, gi) => (
          <div key={gi}>
            {group.label && !collapsed && <p className="mb-2 px-3 text-xs font-bold uppercase tracking-[0.08em] text-heading">{group.label}</p>}
            <ul className="space-y-1.5">
              {group.items.map((item) => {
                const Icon = ICONS[item.icon];
                const active = isActive(item.href);
                const tint = TINTS[index++ % TINTS.length];
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex h-11 items-center gap-3 rounded-xl px-2 text-sm font-medium transition-colors",
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
                      <span className={cn("relative grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-transform group-hover:scale-110", active ? "bg-white/20 text-white" : tint)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      {!collapsed && <span className="relative flex-1 truncate">{item.label}</span>}
                      {item.badge === "live" ? (
                        <span className={cn("relative", collapsed && "absolute end-2 top-2")}>
                          <LiveDot />
                        </span>
                      ) : item.badge ? (
                        <span className={cn("relative grid min-w-5 place-items-center rounded-full bg-live-500 px-1.5 text-[11px] font-bold text-white", collapsed && "absolute end-1.5 top-1.5 min-w-4 px-1 text-[10px]")}>
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

      <div className="relative border-t border-line p-3">
        {footer && !collapsed && <div className="mb-2 flex items-center justify-end px-2">{footer}</div>}
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-xl text-xs font-medium text-ink-muted hover:bg-surface-2 hover:text-ink"
            aria-label={t("Collapse")}
          >
            <ChevronsLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180 rtl:rotate-0", !collapsed && "rtl:rotate-180")} />
            {!collapsed && t("Collapse")}
          </button>
        )}
      </div>
    </div>
  );
}
