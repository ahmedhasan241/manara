"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, GraduationCap, HeartHandshake, Menu } from "lucide-react";
import {
  AppearanceMenu,
  Dialog,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  LanguageMenu,
  Logo,
  Separator,
  SheetContent,
  ThemeToggle,
  buttonClass,
  cn,
  useHideOnScroll,
  useT,
} from "@educloud/ui";

const LINKS = [
  { href: "/#who", label: "Who it's for" },
  { href: "/#features", label: "Features" },
  { href: "/pricing", label: "Packages" },
  { href: "/#faq", label: "FAQ" },
  { href: "/security", label: "Security" },
] as const;

/**
 * Website header: a bar that gains a border on scroll, language / appearance /
 * sign-in menus, and a side sheet on phones.
 */
export function SiteHeader({ portals }: { portals: { staff: string; learner: string } }) {
  const t = useT();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => setOpen(false), [pathname]);

  const hidden = useHideOnScroll() && !open;

  const signIn = [
    { href: `${portals.staff}/login`, icon: GraduationCap, title: t("Teachers & schools"), body: t("Staff portal") },
    { href: `${portals.learner}/login`, icon: HeartHandshake, title: t("Students & parents"), body: t("Courses, learning & family portal") },
  ];

  return (
    <header className={cn("sticky top-0 z-40 border-b transition-[translate,background-color,border-color] duration-300", hidden && "-translate-y-full", scrolled ? "border-line bg-surface/90 backdrop-blur-xl" : "border-transparent")}>
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6" aria-label={t("Main")}>
        <Link href="/" aria-label={t("Manara home")}>
          <Logo />
        </Link>

        <div className="hidden items-center gap-0.5 text-sm font-medium text-ink-muted lg:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-lg px-3 py-2 transition hover:bg-surface-3/70 hover:text-ink">
              {t(l.label)}
            </Link>
          ))}
          <a href={`${portals.learner}/explore`} className="rounded-lg px-3 py-2 text-brand-700 transition hover:bg-brand-600/10 dark:text-brand-200">
            {t("Online courses")}
          </a>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-1 sm:flex">
            <LanguageMenu />
            <AppearanceMenu />
          </div>
          <span aria-hidden className="hidden h-7 w-px bg-line md:block" />
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(buttonClass("ghost", "sm"), "hidden text-ink md:inline-flex")}>
              {t("Sign in")} <ChevronDown className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72">
              {signIn.map(({ href, icon: Icon, title, body }) => (
                <DropdownMenuItem key={href} asChild className="items-start py-2.5">
                  <a href={href}>
                    <Icon className="mt-0.5 text-brand-600 dark:text-brand-300" />
                    <span>
                      <span className="block font-medium">{title}</span>
                      <span className="block text-xs text-ink-muted">{body}</span>
                    </span>
                  </a>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Link href="/signup" className={cn(buttonClass("primary", "sm"), "hidden sm:inline-flex")}>
            {t("Start free trial")}
          </Link>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface-2 text-ink transition hover:border-ink-muted/40 lg:hidden" aria-label={t("Open menu")}>
              <Menu className="h-5 w-5" />
            </DialogTrigger>
            <SheetContent className="lg:hidden" aria-describedby={undefined}>
              <DialogTitle className="sr-only">{t("Menu")}</DialogTitle>
              <Logo />
              <ul className="space-y-0.5">
                {LINKS.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-surface-2">
                      {t(l.label)}
                    </Link>
                  </li>
                ))}
                <li>
                  <a href={`${portals.learner}/explore`} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-brand-700 hover:bg-surface-2 dark:text-brand-200">
                    {t("Online courses")}
                  </a>
                </li>
              </ul>
              <Separator />
              <div className="space-y-2">
                {signIn.map(({ href, icon: Icon, title, body }) => (
                  <a key={href} href={href} className="flex items-start gap-3 rounded-lg border border-line p-3">
                    <Icon className="mt-0.5 h-4 w-4 text-brand-600 dark:text-brand-300" />
                    <span>
                      <span className="block text-sm font-medium">{title}</span>
                      <span className="block text-xs text-ink-muted">{body}</span>
                    </span>
                  </a>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2">
                <LanguageMenu />
                <ThemeToggle />
              </div>
              <Link href="/signup" className={cn(buttonClass("primary"), "mt-auto w-full")}>
                {t("Start your free trial")}
              </Link>
            </SheetContent>
          </Dialog>
        </div>
      </nav>
    </header>
  );
}
