import { CalendarDays, ClipboardCheck, Flag, Video } from "lucide-react";
import { CalendarBoard, FadeIn, HeroBanner, type CalendarBoardEvent } from "@educloud/ui";
import { getRequestLocale, getT } from "@educloud/ui/locale";
import { getContext } from "../session";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Calendar") };
}

const MONTH = /^(\d{4})-(\d{2})$/;

/**
 * Month calendar of live lessons, assessment due dates and announcement
 * deadlines. `?month=2026-11` picks the month.
 */
export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const t = await getT();
  const { api, can } = await getContext();
  const { locale } = await getRequestLocale();
  const { month } = await searchParams;

  const match = month?.match(MONTH);
  const now = new Date();
  const year = match ? Number(match[1]) : now.getFullYear();
  const monthIndex = match ? Number(match[2]) - 1 : now.getMonth();
  const first = new Date(Date.UTC(year, monthIndex, 1));
  // The grid shows a few days of the neighbouring months too.
  const from = new Date(Date.UTC(year, monthIndex, -7));
  const to = new Date(Date.UTC(year, monthIndex + 1, 8));

  const { events } = await api.calendar(from.toISOString(), to.toISOString());
  const isStaff = can("courses.manage");

  const boardEvents: CalendarBoardEvent[] = events.map((e) => ({
    id: e.id,
    title: e.title,
    type: e.type,
    starts_at: e.starts_at,
    ends_at: e.ends_at,
    status: e.status,
    subtitle: e.course?.title ?? null,
    href: e.type === "lesson" ? `/live/${e.target_id}` : e.type === "assessment" && e.course ? `/courses/${e.course.id}` : "/announcements",
  }));

  const inMonth = events.filter((e) => new Date(e.starts_at).getUTCMonth() === monthIndex);
  const count = (type: string) => inMonth.filter((e) => e.type === type).length;
  const shift = (delta: number) => {
    const d = new Date(Date.UTC(year, monthIndex + delta, 1));
    return `?month=${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  };

  return (
    <>
      <FadeIn>
        <HeroBanner
          eyebrow={
            <>
              <CalendarDays className="h-3.5 w-3.5" /> {new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(first)}
            </>
          }
          title={t("Calendar")}
          subtitle={isStaff ? t("Your live lessons, due dates and deadlines across every course.") : t("Live lessons, due dates and deadlines, all in one place.")}
          meta={
            <>
              <span className="inline-flex items-center gap-1.5">
                <Video className="h-4 w-4" /> {t("{count} live lessons", { count: count("lesson") })}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ClipboardCheck className="h-4 w-4" /> {t("{count} due dates", { count: count("assessment") })}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Flag className="h-4 w-4" /> {t("{count} deadlines", { count: count("deadline") })}
              </span>
            </>
          }
        />
      </FadeIn>
      <FadeIn delay={0.05}>
        <CalendarBoard month={`${year}-${String(monthIndex + 1).padStart(2, "0")}-15T12:00:00`} events={boardEvents} locale={locale} prevHref={shift(-1)} nextHref={shift(1)} todayHref={`?month=${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`} />
      </FadeIn>
    </>
  );
}
