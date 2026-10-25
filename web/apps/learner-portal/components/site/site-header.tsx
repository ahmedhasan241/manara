"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";
import { Award, BookOpen, GraduationCap, Heart, LayoutDashboard, Loader2, LogOut, MapPin, Menu, Receipt, Search, Settings, ShoppingCart } from "lucide-react";
import {
  AppearanceMenu,
  Avatar,
  Dialog,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  LanguageMenu,
  Logo,
  Separator,
  SheetContent,
  asKey,
  buttonClass,
  cn,
  formatLocation,
  useLocale,
  useT,
} from "@educloud/ui";
import { AuthLink } from "./auth-dialog";
import { useSignOut } from "@/components/sign-out-button";

/** Everything here is for students, learners and their families. */
const NAV = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Courses" },
  { href: "/instructors", label: "Teachers" },
  { href: "/institutions", label: "Institutions" },
  { href: "/help", label: "Help" },
];

/**
 * The website header: logo, centred links, cart and either Login / Sign up or
 * the account menu. It stays pinned to the top; once the page scrolls it
 * eases into a compact floating glass bar with a reading-progress line.
 */
const iconButton = "grid h-10 w-10 place-items-center rounded-xl text-ink-muted transition hover:bg-surface-2 hover:text-ink";

export function SiteHeader({ user, cartCount, dashboardUrl }: { user: { name: string; email: string; country?: string | null; city?: string | null; area?: string | null } | null; cartCount: number; dashboardUrl: string | null }) {
  const t = useT();
  const locale = useLocale();
  const { signOut, pending: signingOut } = useSignOut();
  const place = user ? formatLocation(user, locale, { flag: true }) : "";
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 160, damping: 30 });
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    // Two thresholds so the bar doesn't flicker when resting near the top.
    const onScroll = () => setScrolled((was) => (was ? window.scrollY > 12 : window.scrollY > 48));
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Teacher profiles live under /instructor/…, so they light up "Teachers" too.
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href === "/instructors" ? "/instructor" : href));

  return (
    <header className={cn("sticky top-0 z-50 transition-[padding] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]", scrolled ? "px-2 pt-2 sm:px-4 sm:pt-3" : "px-0 pt-0")}>
      <div
        className={cn(
          "relative mx-auto flex items-center gap-3 border px-4 transition-[max-width,height,border-radius,background-color,border-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-6 lg:px-8",
          scrolled
            ? "h-14 max-w-6xl rounded-2xl border-line bg-surface/80 shadow-[var(--shadow-lift)] backdrop-blur-xl backdrop-saturate-150 lg:px-5"
            : "h-14 max-w-7xl rounded-none border-transparent bg-transparent sm:h-16",
        )}
      >
        {/* How far down the page you are, along the bottom edge of the floating bar. */}
        {scrolled && !reduce && (
          <motion.span aria-hidden className="pointer-events-none absolute inset-x-4 -bottom-px h-0.5 origin-left rounded-full bg-gradient-to-r from-brand-300 to-brand-600 rtl:origin-right rtl:bg-gradient-to-l" style={{ scaleX: progress }} />
        )}
        <Link href="/" aria-label={t("Manara home")} className="text-heading">
          <Logo />
        </Link>

        <nav aria-label={t("Main")} className="mx-auto hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn("relative rounded-full px-3.5 py-2 text-sm font-medium transition-colors", active(item.href) ? "text-brand-700 dark:text-brand-200" : "text-ink-muted hover:text-ink")}
            >
              {active(item.href) && <motion.span layoutId="site-nav" className="absolute inset-0 rounded-full bg-brand-50 dark:bg-brand-900/40" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <span className="relative">{t(asKey(item.label))}</span>
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-2 sm:gap-3 lg:ms-0">
          <div className="flex items-center gap-0.5 sm:gap-1">
            <Link href="/explore" className={iconButton} aria-label={t("Search courses")}>
              <Search className="h-[18px] w-[18px]" />
            </Link>
            {user && (
              <Link href="/wishlist" className={iconButton} aria-label={t("Wishlist")}>
                <Heart className="h-[18px] w-[18px]" />
              </Link>
            )}
            <Link href="/cart" className={cn(iconButton, "relative")} aria-label={t("Cart, {count} items", { count: cartCount })}>
              <ShoppingCart className="h-[18px] w-[18px]" />
              {cartCount > 0 && <span className="absolute end-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white ring-2 ring-surface">{cartCount}</span>}
            </Link>
            <div className="hidden items-center gap-1 sm:flex">
              <LanguageMenu />
              <AppearanceMenu />
            </div>
          </div>

          <span aria-hidden className="hidden h-7 w-px bg-line sm:block" />

          {user ? (
            <>
              <Link href="/my-learning" className="hidden rounded-xl px-3.5 py-2 text-sm font-medium text-ink hover:bg-surface-2 md:block">
                {t("My learning")}
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger aria-label={t("Account")} className="hidden h-10 w-10 place-items-center rounded-full ring-2 ring-transparent transition hover:ring-brand-500/40 data-[state=open]:ring-brand-500/60 sm:grid">
                  <Avatar name={user.name} size="sm" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-60">
                  <div className="px-2.5 py-2">
                    <p className="truncate text-sm font-semibold">{user.name}</p>
                    <p className="truncate text-xs text-ink-muted">{user.email}</p>
                    {place && (
                      <p className="mt-1 flex items-center gap-1 truncate text-xs text-ink-muted">
                        <MapPin className="h-3 w-3 shrink-0" aria-hidden /> <span className="truncate">{place}</span>
                      </p>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/my-learning"><BookOpen className="text-ink-muted" /> {t("My learning")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/wishlist"><Heart className="text-ink-muted" /> {t("Wishlist")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/my-learning?tab=certificates"><Award className="text-ink-muted" /> {t("Certificates")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/my-learning?tab=orders"><Receipt className="text-ink-muted" /> {t("Purchase history")}</Link>
                  </DropdownMenuItem>
                  {dashboardUrl && (
                    <DropdownMenuItem asChild>
                      <Link href={dashboardUrl}><LayoutDashboard className="text-ink-muted" /> {t("School dashboard")}</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href={dashboardUrl ? "/settings" : "/account"}><Settings className="text-ink-muted" /> {t("Profile & settings")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem tone="danger" disabled={signingOut} onSelect={signOut}>
                    {signingOut ? <Loader2 className="animate-spin" /> : <LogOut />} {t("Sign out")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <AuthLink mode="login" className={buttonClass("ghost")}>
                {t("Login")}
              </AuthLink>
              <AuthLink mode="register" className={buttonClass("primary")}>
                {t("Sign Up")}
              </AuthLink>
            </div>
          )}

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface-2 text-ink transition hover:border-ink-muted/40 lg:hidden" aria-label={t("Menu")}>
              <Menu className="h-5 w-5" />
            </DialogTrigger>
            <SheetContent className="lg:hidden" aria-describedby={undefined}>
              <DialogTitle className="sr-only">{t("Menu")}</DialogTitle>
              <Logo />
              <nav className="space-y-0.5" aria-label={t("Mobile")}>
                {NAV.map((item) => (
                  <Link key={item.href} href={item.href} className={cn("block rounded-lg px-3 py-2.5 text-sm font-medium", active(item.href) ? "bg-brand-600/10 text-brand-700 dark:text-brand-200" : "hover:bg-surface-2")}>
                    {t(asKey(item.label))}
                  </Link>
                ))}
                {user && (
                  <>
                    <Separator className="my-2" />
                    <Link href="/my-learning" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-surface-2">
                      <GraduationCap className="h-4 w-4" /> {t("My learning")}
                    </Link>
                    <Link href="/wishlist" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-surface-2">
                      <Heart className="h-4 w-4" /> {t("Wishlist")}
                    </Link>
                    {dashboardUrl && (
                      <Link href={dashboardUrl} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-surface-2">
                        <LayoutDashboard className="h-4 w-4" /> {t("School dashboard")}
                      </Link>
                    )}
                  </>
                )}
              </nav>
              <div className="flex items-center gap-2 sm:hidden">
                <LanguageMenu />
                <AppearanceMenu />
              </div>
              <div className="mt-auto space-y-2">
                {user ? (
                  <button type="button" onClick={signOut} disabled={signingOut} className={cn(buttonClass("secondary"), "w-full")}>
                    {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} {t("Sign out")}
                  </button>
                ) : (
                  <>
                    <AuthLink mode="register" className={cn(buttonClass("primary"), "w-full")}>
                      {t("Sign Up")}
                    </AuthLink>
                    <AuthLink mode="login" className={cn(buttonClass("secondary"), "w-full")}>
                      {t("Login")}
                    </AuthLink>
                  </>
                )}
              </div>
            </SheetContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}
