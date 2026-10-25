import Link from "next/link";
import { AlertTriangle, ArrowRight, Award, CalendarCheck, GraduationCap, Trophy } from "lucide-react";
import type { ReportCard } from "@educloud/api-client";
import { Badge, Card, cn } from "@educloud/ui";
import { getI18n } from "@educloud/ui/locale";
import { formatPercent, formatScore, rankText, standingLabel, standingTone, usesGpa } from "@/lib/academics";

/**
 * Dashboard "Standing" card: average or GPA, class rank, and a nudge when a
 * subject's absences pass the school's warning line.
 */
export async function StandingWidget({ card, child }: { card: ReportCard; child: string | null }) {
  const { t, fmt } = await getI18n();
  const overall = card.overall;
  const gpa = usesGpa(card.settings);
  const flagged = card.subjects.filter((s) => s.attendance && s.attendance.status !== "ok");
  const overLimit = flagged.some((s) => s.attendance?.status === "limit");
  const classRank = rankText(card.ranks.group ?? card.ranks.level ?? card.ranks.school, t);

  const tiles = [
    { icon: GraduationCap, label: gpa ? t("GPA") : t("Average"), value: overall ? formatScore(overall, card.settings.grading_scale, fmt) : "—", href: "/report-card" },
    { icon: Trophy, label: card.ranks.group ? t("Class rank") : t("Rank"), value: classRank ?? "—", href: card.settings.rankings_visible ? "/rankings" : "/report-card" },
    { icon: CalendarCheck, label: t("Attendance"), value: formatPercent(overall?.attendance_rate, fmt), href: "/attendance" },
  ];

  return (
    <section aria-labelledby="standing-heading" className="mb-10">
      <Card className="relative overflow-hidden shadow-[var(--shadow-soft)]">
        <div aria-hidden className="absolute -end-16 -top-16 h-44 w-44 rounded-full bg-brand-500/8" />
        <div className="relative mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="standing-heading" className="font-display text-lg font-bold">
              {child ? t("{name}'s standing", { name: child }) : t("Your standing")}
            </h2>
            {overall && (
              <Badge tone={standingTone(overall.standing)}>
                {overall.standing === "honors" && <Award className="h-3 w-3" />} {standingLabel(overall.standing, t)}
              </Badge>
            )}
            {overall?.letter && <span className="rounded-md bg-surface-3 px-1.5 py-0.5 text-xs font-bold">{overall.letter}</span>}
          </div>
          <Link href="/report-card" className="group inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-300">
            {child ? t("Report card") : t("My grades")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
          </Link>
        </div>

        <div className="relative grid grid-cols-3 gap-2 sm:gap-3">
          {tiles.map(({ icon: Icon, label, value, href }) => (
            <Link key={label} href={href} className="group rounded-2xl bg-surface-2 p-3 transition hover:bg-brand-500/8 sm:p-4">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-ink-muted sm:text-xs">
                <Icon className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{label}</span>
              </span>
              <span className="mt-1 block truncate font-display text-lg font-bold tabular-nums sm:text-2xl">{value}</span>
            </Link>
          ))}
        </div>

        {flagged.length > 0 && (
          <Link
            href="/attendance"
            className={cn("relative mt-4 flex items-start gap-3 rounded-2xl p-3 text-sm transition", overLimit ? "bg-danger/8 hover:bg-danger/12" : "bg-warning/8 hover:bg-warning/12")}
          >
            <AlertTriangle className={cn("mt-0.5 h-4 w-4 shrink-0", overLimit ? "text-danger" : "text-warning")} />
            <span>
              <span className="font-semibold">
                {child ? t("{name} has missed a lot of lessons in: {subjects}", { name: child, subjects: flagged.map((s) => s.course.subject ?? s.course.title).join(", ") }) : t("You've missed a lot of lessons in: {subjects}", { subjects: flagged.map((s) => s.course.subject ?? s.course.title).join(", ") })}
              </span>{" "}
              <span className="text-ink-muted">{t("See the attendance rules")}</span>
            </span>
          </Link>
        )}
      </Card>
    </section>
  );
}
