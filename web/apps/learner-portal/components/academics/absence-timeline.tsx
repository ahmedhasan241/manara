import { CalendarX2, Clock, ShieldCheck } from "lucide-react";
import type { ReportCard } from "@educloud/api-client";
import { Badge, Card, cn } from "@educloud/ui";
import { getI18n } from "@educloud/ui/locale";

const looks = {
  absent: { icon: CalendarX2, dot: "bg-danger text-white", tone: "danger" },
  late: { icon: Clock, dot: "bg-warning text-white", tone: "warning" },
  excused: { icon: ShieldCheck, dot: "bg-brand-600 text-white", tone: "brand" },
} as const;

/** Recent absences, lates and excused absences as a vertical timeline. */
export async function AbsenceTimeline({ absences }: { absences: ReportCard["absences"] }) {
  const { t, fmt } = await getI18n();
  const label = { absent: t("Absent"), late: t("Late"), excused: t("Excused") };

  return (
    <Card className="shadow-[var(--shadow-soft)] print:shadow-none">
      <ol className="relative space-y-5 before:absolute before:inset-y-2 before:start-[1.05rem] before:w-px before:bg-line">
        {absences.map((a) => {
          const look = looks[a.status];
          const Icon = look.icon;
          return (
            <li key={a.id} className="relative flex gap-4 print:break-inside-avoid">
              <span className={cn("relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full ring-4 ring-surface", look.dot)}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                  <span className="min-w-0 truncate">{a.course?.subject ?? a.course?.title ?? t("Class")}</span>
                  <Badge tone={look.tone}>{label[a.status]}</Badge>
                </p>
                <p className="text-xs text-ink-muted">
                  {a.date ? fmt.date(a.date, { weekday: "short", month: "short", day: "numeric" }) : "—"}
                  {a.topic && ` · ${a.topic}`}
                </p>
                {a.note && <p className="mt-1 text-xs italic text-ink-muted">“{a.note}”</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
