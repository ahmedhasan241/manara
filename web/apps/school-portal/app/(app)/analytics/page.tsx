import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, CalendarCheck, LifeBuoy, BarChart3 } from "lucide-react";
import { Avatar, Badge, BarChart, Card, EmptyState, LineChart, PageHeader, ShowMore, StatCard, cn } from "@educloud/ui";
import { getContext } from "@educloud/portal-kit/session";
import { getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Analytics") };
}

/** Below this attendance rate a student is listed as needing support. */
const THRESHOLD = 75;

/**
 * Per-course attendance and grade trends, plus students who may need support.
 */
export default async function AnalyticsPage() {
  const t = await getT();
  const { api, can } = await getContext();
  if (!can("reports.view")) notFound();

  const courses = (await api.courses({})).data.slice(0, 12);
  const perCourse = await Promise.all(
    courses.map(async (course) => {
      const [summary, assessments, grades] = await Promise.all([api.attendanceSummary(course.id), api.assessments(course.id), api.grades(course.id)]);
      const attendanceRate = summary.length ? summary.reduce((s, r) => s + (r.rate ?? 0), 0) / summary.length : null;
      // Only assessments with marks in: an unmarked one is not a 0% average.
      const trend = assessments
        .filter((a) => a.due_at)
        .sort((a, b) => a.due_at!.localeCompare(b.due_at!))
        .flatMap((a) => {
          const scores = grades.filter((g) => g.assessment_id === a.id && g.score != null).map((g) => Number(g.score) / Number(a.max_score));
          return scores.length ? [{ label: a.title, value: (scores.reduce((x, y) => x + y, 0) / scores.length) * 100 }] : [];
        });
      return { course, summary, attendanceRate, trend };
    }),
  );

  // One row per student, listing each course where they are under the line.
  const byStudent = new Map<string, { id: string; name: string; worst: number; courses: { title: string; rate: number }[] }>();
  for (const { course, summary } of perCourse) {
    for (const r of summary) {
      if (r.rate == null || r.rate >= THRESHOLD) continue;
      const id = String(r.student_id);
      const row = byStudent.get(id) ?? { id, name: r.student_name ?? "—", worst: 100, courses: [] as { title: string; rate: number }[] };
      row.courses.push({ title: course.title, rate: r.rate });
      row.worst = Math.min(row.worst, r.rate);
      byStudent.set(id, row);
    }
  }
  const atRisk = [...byStudent.values()].sort((a, b) => a.worst - b.worst);
  const rates = perCourse.map((c) => c.attendanceRate).filter((r): r is number => r != null);
  const average = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null;
  const rateTone = (v: number) => (v < 50 ? "danger" : v < THRESHOLD ? "warning" : "success");

  return (
    <>
      <PageHeader icon={<BarChart3 />} title={t("Analytics")} description={t("Attendance and academic progress across your courses.")} />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard label={t("Courses")} value={courses.length} icon={<BookOpen className="h-5 w-5" />} href="/courses" />
        <StatCard
          label={t("Average attendance")}
          value={average == null ? "—" : `${average.toFixed(1)}%`}
          icon={<CalendarCheck className="h-5 w-5" />}
          meter={average}
          tone={average == null ? undefined : rateTone(average)}
          href="/attendance"
        />
        <div className="col-span-2 sm:col-span-1">
          <StatCard
            label={t("Students below 75% attendance")}
            value={atRisk.length}
            icon={<LifeBuoy className="h-5 w-5" />}
            tone={atRisk.length ? "danger" : "success"}
            href="/attendance?status=flagged"
          />
        </div>
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-2 lg:items-start">
        <Card>
          <h2 className="mb-5 font-display font-bold">{t("Attendance rate by course")}</h2>
          <BarChart
            label={t("Attendance rate by course")}
            max={100}
            target={THRESHOLD}
            tone={rateTone}
            format={(v) => `${v.toFixed(0)}%`}
            data={perCourse.map((c) => ({ label: c.course.title, value: c.attendanceRate ?? 0 }))}
          />
        </Card>
        <Card className="p-2 sm:p-3">
          <h2 className="flex items-center gap-2 px-2 pt-2 font-display font-bold">
            {t("Students who may need support")}
            {atRisk.length > 0 && <Badge tone="danger">{atRisk.length}</Badge>}
          </h2>
          {atRisk.length === 0 ? (
            <p className="p-2 text-sm text-ink-muted">{t("Everyone is above 75% attendance.")}</p>
          ) : (
            <ShowMore initial={6} className="mt-2">
              {atRisk.map((s) => (
                <li key={s.id}>
                  <Link href={`/students/${s.id}`} className="flex items-center gap-3 rounded-xl p-2.5 transition hover:bg-surface-3/70">
                    <Avatar name={s.name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{s.name}</span>
                      <span className="mt-1 flex flex-wrap gap-1.5">
                        {s.courses.map((c) => (
                          <span key={c.title} className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium", c.rate < 50 ? "bg-danger/10 text-danger" : "bg-warning/12 text-warning")}>
                            {c.title} · {Math.round(c.rate * 10) / 10}%
                          </span>
                        ))}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ShowMore>
          )}
        </Card>
      </div>

      <h2 className="mb-1 font-display text-lg font-bold sm:text-xl">{t("Average score per assessment, over time")}</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {perCourse.length === 0 && <EmptyState icon={<BookOpen className="h-6 w-6" />} title={t("No courses yet")} />}
        {perCourse.map(({ course, trend }) => {
          const last = trend.at(-1)?.value;
          return (
            <Card key={course.id}>
              <div className="mb-4 flex items-start justify-between gap-3">
                <h3 className="min-w-0 truncate font-semibold">{course.title}</h3>
                {last != null && <span className={cn("shrink-0 font-display text-lg font-bold tabular-nums", last < 50 ? "text-danger" : "text-heading")}>{Math.round(last)}%</span>}
              </div>
              <LineChart data={trend} target={50} tone={last != null && last < 50 ? "danger" : "brand"} label={t("Average score trend for {course}", { course: course.title })} />
            </Card>
          );
        })}
      </div>
    </>
  );
}
