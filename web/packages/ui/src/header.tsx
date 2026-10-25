"use client";

import { startTransition, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Check, Globe, Settings } from "lucide-react";
import { Avatar, cn } from "./components";
import { CURRENCIES, CURRENCY_COOKIE } from "@educloud/api-client";
import { LOCALES, LOCALE_COOKIE, intlLocale, type Locale } from "./i18n";
import { useCurrency, useFormat, useLocale, useT } from "./i18n-provider";
import { startLanguageLoad, startPageLoad } from "./loader";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, PopoverContent, PopoverRoot, PopoverTrigger } from "./primitives";

/**
 * A header button with a panel under it (Radix popover: focus trap, Escape,
 * outside click, collision-aware placement). `children` gets a `close` callback.
 */
export function Popover({
  label,
  trigger,
  children,
  align = "end",
  className,
  panelClassName,
}: {
  label: string;
  trigger: ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "start" | "end";
  className?: string;
  panelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <PopoverRoot open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={label}
        className={cn("relative grid h-10 min-w-10 place-items-center rounded-xl text-ink-muted transition hover:bg-surface-3 hover:text-ink data-[state=open]:bg-surface-3 data-[state=open]:text-ink", className)}
      >
        {trigger}
      </PopoverTrigger>
      <PopoverContent align={align} aria-label={label} className={panelClassName}>
        {children(() => setOpen(false))}
      </PopoverContent>
    </PopoverRoot>
  );
}

export interface HeaderNotification {
  id: string;
  title: string;
  body: string;
  created_at: string;
  read: boolean;
}

export function NotificationsMenu({ items, unread, href }: { items: HeaderNotification[]; unread: number; href: string }) {
  const fmt = useFormat();
  const t = useT();
  return (
    <Popover
      label={t("Notifications")}
      trigger={
        <>
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute end-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-live-500 px-1 text-[10px] font-bold text-white ring-2 ring-surface">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </>
      }
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between px-3 py-2">
            <p className="font-display font-bold">{t("Notifications")}</p>
            <Link href={href} onClick={close} className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">
              {t("View all")}
            </Link>
          </div>
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-ink-muted">{t("You're all caught up")}</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {items.slice(0, 6).map((n) => (
                <li key={n.id}>
                  <Link href={href} onClick={close} className="flex gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-2">
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-brand-500")} aria-hidden />
                    <span className="min-w-0">
                      <span className={cn("block truncate text-sm", !n.read && "font-semibold")}>{n.title}</span>
                      <span className="block truncate text-xs text-ink-muted">{n.body}</span>
                      <span className="text-[11px] text-ink-muted/80">{fmt.dateTime(n.created_at)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Popover>
  );
}

/**
 * Sets the locale cookie and re-renders the app in that language and
 * direction, without reloading the page. A full-screen card covers the
 * switch; it lifts as soon as the new language has arrived.
 */
export function useSetLocale() {
  const router = useRouter();
  const current = useLocale();
  return (locale: Locale) => {
    if (locale === current) return;
    const meta = LOCALES.find((l) => l.code === locale)!;
    startLanguageLoad({ name: meta.name, dir: meta.dir });
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = locale;
    document.documentElement.dir = meta.dir;
    // A ?lang= in the address wins over the cookie, so carry the new choice there too.
    const url = new URL(window.location.href);
    if (url.searchParams.has("lang")) {
      url.searchParams.set("lang", locale);
      startTransition(() => router.replace(url.pathname + url.search + url.hash, { scroll: false }));
    } else {
      startTransition(() => router.refresh());
    }
  };
}

/** Saves the currency choice and re-renders prices (with the page loader meanwhile). */
export function useSetCurrency() {
  const router = useRouter();
  const current = useCurrency();
  return (currency: string) => {
    if (currency === current) return;
    startPageLoad();
    document.cookie = `${CURRENCY_COOKIE}=${currency}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  };
}

/**
 * Language and currency in one menu. Languages are listed in their own
 * script; the currency starts as the visitor's local one and can be changed.
 */
export function LanguageMenu() {
  const t = useT();
  const locale = useLocale();
  const currency = useCurrency();
  const setLocale = useSetLocale();
  const setCurrency = useSetCurrency();
  const [query, setQuery] = useState("");
  const names = new Intl.DisplayNames([intlLocale(locale)], { type: "currency" });
  const currencies = CURRENCIES.filter((c) => !query || `${c} ${names.of(c) ?? ""}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <Popover
      label={t("Language & currency")}
      trigger={
        <span className="flex items-center gap-1.5 px-1.5">
          <Globe className="h-[18px] w-[18px]" />
          <span className="hidden text-xs font-bold uppercase xl:inline">
            {locale} · {currency}
          </span>
        </span>
      }
      panelClassName="w-72 p-0"
    >
      {(close) => (
        <div>
          <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{t("Language")}</p>
          <ul role="listbox" aria-label={t("Language")} className="grid grid-cols-2 gap-1 px-2 pb-2">
            {LOCALES.map((l) => (
              <li key={l.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={l.code === locale}
                  onClick={() => {
                    setLocale(l.code);
                    close();
                  }}
                  className={cn("flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-start text-sm transition", l.code === locale ? "bg-brand-500/10 font-semibold text-brand-700 dark:text-brand-200" : "hover:bg-surface-2")}
                >
                  <span lang={l.code} dir={l.dir}>
                    {l.name}
                  </span>
                  <span className="text-[10px] font-bold uppercase text-ink-muted">{l.code}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-line px-2 pb-2 pt-3">
            <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{t("Currency")}</p>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Search currencies")}
              aria-label={t("Search currencies")}
              className="mb-2 h-9 w-full rounded-lg border border-line bg-surface-2 px-3 text-sm outline-none focus:border-brand-400"
            />
            <ul role="listbox" aria-label={t("Currency")} className="max-h-56 overflow-y-auto">
              {currencies.map((c) => (
                <li key={c}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={c === currency}
                    onClick={() => {
                      setCurrency(c);
                      close();
                    }}
                    className={cn("flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-start text-sm", c === currency ? "bg-brand-500/10 font-semibold" : "hover:bg-surface-2")}
                  >
                    <span className="w-10 font-mono text-xs font-bold text-ink-muted">{c}</span>
                    <span className="flex-1 truncate">{names.of(c)}</span>
                    {c === currency && <Check className="h-4 w-4 text-brand-600" />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Popover>
  );
}

export function UserMenu({ name, role, email, settingsHref, signOut }: { name: string; role: string; email?: string; settingsHref: string; signOut?: ReactNode }) {
  const t = useT();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={t("Account")} className="grid h-10 w-10 shrink-0 place-items-center rounded-full outline-offset-2 ring-2 ring-transparent transition hover:ring-brand-500/40 data-[state=open]:ring-brand-500/60">
        <Avatar name={name} size="sm" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <div className="flex items-center gap-3 px-2.5 py-2">
          <Avatar name={name} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="truncate text-xs text-ink-muted">{email ?? role}</p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={settingsHref}>
            <Settings className="text-ink-muted" /> {t("Settings")}
          </Link>
        </DropdownMenuItem>
        {signOut && <div className="[&_button]:w-full">{signOut}</div>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
