"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardCheck, Clock3, Flag, Star, Video } from "lucide-react";
import { cn } from "./components";
import { useLocale, useT } from "./i18n-provider";
import { intlLocale } from "./i18n";

/**
 * Horizontal row of cards with square teal prev/next buttons, as in the
 * Campus "Welcome back" row. Scroll-snaps on touch; buttons hide when there
 * is nothing more to scroll.
 */
export function Carousel({ children, label, heading, className, itemClassName = "w-[min(78vw,18rem)]" }: {
  children: ReactNode[];
  label: string;
  /** Section heading shown with the arrows beside it. */
  heading?: ReactNode;
  className?: string;
  itemClassName?: string;
}) {
  const t = useT();
  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      const pos = Math.abs(el.scrollLeft);
      setEdges({ start: pos <= 4, end: pos >= max - 4 });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [children.length]);

  function scroll(direction: 1 | -1) {
    const el = track.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    el.scrollBy({ left: direction * (rtl ? -1 : 1) * el.clientWidth * 0.85, behavior: "smooth" });
  }

  const button = "grid h-10 w-10 place-items-center rounded-xl transition disabled:cursor-default disabled:opacity-35";

  return (
    <div className={cn("relative", className)} role="region" aria-roledescription="carousel" aria-label={label}>
      <div className="mb-4 flex items-end gap-4">
        <div className="min-w-0 flex-1 [&>*]:mb-0">{heading}</div>
        <div className="hidden shrink-0 gap-2 sm:flex">
          <button type="button" onClick={() => scroll(-1)} disabled={edges.start} aria-label={t("Previous")} className={cn(button, "border border-line bg-surface text-brand-600 hover:border-brand-400")}>
            <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
          </button>
          <button type="button" onClick={() => scroll(1)} disabled={edges.end} aria-label={t("Next")} className={cn(button, "fill-brand text-white shadow-[var(--shadow-soft)]")}>
            <ChevronRight className="h-5 w-5 rtl:rotate-180" />
          </button>
        </div>
      </div>
      <div ref={track} className="-mx-1 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-1 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children.map((child, i) => (
          <div key={i} className={cn("shrink-0 snap-start", itemClassName)}>
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}

export interface CalendarBoardEvent {
  id: string;
  title: string;
  type: "lesson" | "assessment" | "deadline";
  starts_at: string;
  ends_at?: string | null;
  status?: string;
  subtitle?: string | null;
  href?: string;
}

const EVENT_STYLE = {
  lesson: { chip: "bg-brand-500/15 text-brand-700 dark:text-brand-200", block: "border-brand-400 bg-brand-500/10", Icon: Video },
  assessment: { chip: "bg-peach text-brand-700 dark:text-brand-300", block: "border-accent-400 bg-peach", Icon: ClipboardCheck },
  deadline: { chip: "bg-blush text-brand-700 dark:text-brand-300", block: "border-rose-400 bg-blush", Icon: Flag },
} as const;

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/**
 * The Campus calendar: a month grid with event chips on the left, the chosen
 * day's agenda on the right. Times are shown in the viewer's time zone, so
 * the board renders after mount.
 */
export function CalendarBoard({
  month,
  events,
  locale: localeOverride,
  prevHref,
  nextHref,
  todayHref,
  labels,
}: {
  /** Any ISO date inside the month to show. */
  month: string;
  events: CalendarBoardEvent[];
  locale?: string;
  prevHref: string;
  nextHref: string;
  todayHref: string;
  labels?: { today?: string; empty?: string; lesson?: string; assessment?: string; deadline?: string; live?: string };
}) {
  const t = useT();
  const locale = localeOverride ?? intlLocale(useLocale());
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => setMounted(true), []);

  const base = useMemo(() => new Date(month), [month]);
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarBoardEvent[]>();
    for (const e of events) {
      const key = dayKey(new Date(e.starts_at));
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return map;
  }, [events]);

  const weeks = useMemo(() => {
    const first = new Date(base.getFullYear(), base.getMonth(), 1);
    // Monday-first grid.
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() - offset);
    return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => {
      const day = new Date(start);
      day.setDate(start.getDate() + w * 7 + d);
      return day;
    })).filter((week, i) => i < 5 || week.some((d) => d.getMonth() === base.getMonth()));
  }, [base]);

  if (!mounted) {
    return <div aria-hidden className="skeleton h-[28rem] rounded-[1.25rem]" />;
  }

  const today = new Date();
  const inMonth = today.getMonth() === base.getMonth() && today.getFullYear() === base.getFullYear();
  const firstEventDay = events[0] ? dayKey(new Date(events[0].starts_at)) : null;
  const activeKey = selected ?? (inMonth ? dayKey(today) : (firstEventDay ?? dayKey(new Date(base.getFullYear(), base.getMonth(), 1))));
  const activeDate = weeks.flat().find((d) => dayKey(d) === activeKey) ?? base;
  const dayEvents = byDay.get(activeKey) ?? [];

  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(base);
  const weekdayLabels = weeks[0]!.map((d) => new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d));
  const time = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" });
  const typeLabel = { lesson: labels?.lesson ?? t("Live lesson"), assessment: labels?.assessment ?? t("Due"), deadline: labels?.deadline ?? t("Deadline") };

  return (
    <div className="grid overflow-hidden rounded-[1.25rem] border border-line bg-surface shadow-[var(--shadow-soft)] lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      {/* Month */}
      <div className="p-4 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-2">
          <Link href={prevHref} aria-label={t("Previous month")} className="grid h-9 w-9 place-items-center rounded-xl text-ink-muted hover:bg-surface-2 hover:text-ink">
            <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
          </Link>
          <div className="flex items-center gap-3">
            <p className="font-display text-lg font-bold capitalize text-heading">{monthLabel}</p>
            {!inMonth && (
              <Link href={todayHref} className="rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-500/15 dark:text-brand-200">
                {labels?.today ?? t("Today")}
              </Link>
            )}
          </div>
          <Link href={nextHref} aria-label={t("Next month")} className="grid h-9 w-9 place-items-center rounded-xl text-ink-muted hover:bg-surface-2 hover:text-ink">
            <ChevronRight className="h-5 w-5 rtl:rotate-180" />
          </Link>
        </div>

        <div role="grid" aria-label={monthLabel} className="grid grid-cols-7 gap-1 text-center">
          {weekdayLabels.map((w) => (
            <div key={w} role="columnheader" className="pb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              {w}
            </div>
          ))}
          {weeks.flat().map((day) => {
            const key = dayKey(day);
            const items = byDay.get(key) ?? [];
            const outside = day.getMonth() !== base.getMonth();
            const isToday = key === dayKey(today);
            const isActive = key === activeKey;
            return (
              <button
                key={key}
                type="button"
                role="gridcell"
                aria-selected={isActive}
                aria-label={`${new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(day)}${items.length ? `, ${t("{count} events", { count: items.length })}` : ""}`}
                onClick={() => setSelected(key)}
                className={cn(
                  "relative flex min-h-14 flex-col items-center rounded-xl px-0.5 pb-1 pt-1.5 text-sm transition sm:min-h-[4.5rem]",
                  outside ? "text-ink-muted/45" : "text-ink",
                  isActive ? "fill-brand text-white shadow-[var(--shadow-soft)]" : "hover:bg-surface-2",
                )}
              >
                <span className={cn("grid h-7 w-7 place-items-center rounded-full font-semibold", isToday && !isActive && "bg-brand-500/12 text-brand-700 dark:text-brand-200")}>{day.getDate()}</span>
                <span className="mt-auto flex flex-wrap justify-center gap-0.5">
                  {items.slice(0, 3).map((e) => (
                    <span
                      key={e.id}
                      className={cn("h-1.5 w-1.5 rounded-full", isActive ? "bg-white" : e.type === "lesson" ? (e.status === "live" ? "bg-live-500" : "bg-brand-400") : e.type === "assessment" ? "bg-accent-500" : "bg-rose-400")}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap gap-2 text-xs">
          {(["lesson", "assessment", "deadline"] as const).map((type) => {
            const { chip, Icon } = EVENT_STYLE[type];
            return (
              <span key={type} className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold", chip)}>
                <Icon className="h-3.5 w-3.5" /> {typeLabel[type]}
              </span>
            );
          })}
        </div>
      </div>

      {/* Day agenda */}
      <div className="border-t border-line bg-surface-2/60 p-4 sm:p-6 lg:border-s lg:border-t-0">
        <p className="mb-4 flex items-center gap-2 font-display font-bold capitalize text-heading">
          <CalendarDays className="h-5 w-5 text-brand-500" />
          {new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "short" }).format(activeDate)}
        </p>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.ol key={activeKey} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-3">
            {dayEvents.length === 0 && (
              <li className="rounded-2xl border border-dashed border-line px-4 py-10 text-center text-sm text-ink-muted">{labels?.empty ?? t("Nothing planned for this day.")}</li>
            )}
            {dayEvents.map((e) => {
              const { block, Icon } = EVENT_STYLE[e.type];
              const content = (
                <>
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
                    <Clock3 className="h-3.5 w-3.5" />
                    {time.format(new Date(e.starts_at))}
                    {e.ends_at && ` – ${time.format(new Date(e.ends_at))}`}
                    {e.status === "live" && <span className="ms-auto rounded-full bg-live-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">{labels?.live ?? t("Live")}</span>}
                  </p>
                  <p className="mt-1 flex items-start gap-2 font-semibold text-heading">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
                    <span>{e.title}</span>
                  </p>
                  {e.subtitle && <p className="ms-6 mt-0.5 text-xs text-ink-muted">{e.subtitle}</p>}
                </>
              );
              return (
                <li key={e.id}>
                  {e.href ? (
                    <Link href={e.href} className={cn("block rounded-2xl border-s-4 px-4 py-3 transition hover:-translate-y-px hover:shadow-[var(--shadow-soft)]", block)}>
                      {content}
                    </Link>
                  ) : (
                    <div className={cn("rounded-2xl border-s-4 px-4 py-3", block)}>{content}</div>
                  )}
                </li>
              );
            })}
          </motion.ol>
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Five tappable stars that fill a hidden form field. */
export function StarRatingInput({ name, defaultValue = 0, label }: { name: string; defaultValue?: number; label?: string }) {
  const t = useT();
  label ??= t("Your rating");
  const [value, setValue] = useState(defaultValue);
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div role="radiogroup" aria-label={label} className="inline-flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      <input type="hidden" name={name} value={value || ""} />
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={t("{count} stars", { count: n })}
          onClick={() => setValue(n)}
          onMouseEnter={() => setHover(n)}
          className="rounded-md p-0.5 transition-transform hover:scale-125"
        >
          <Star className={cn("h-7 w-7 transition-colors", n <= shown ? "fill-amber-400 text-amber-400" : "text-ink-muted/40")} />
        </button>
      ))}
    </div>
  );
}
