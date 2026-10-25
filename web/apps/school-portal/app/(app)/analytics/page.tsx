import { notFound } from "next/navigation";
import { BarChart, Card, PageHeader, Sparkline, StatCard } from "@educloud/ui";
import { getContext } from "@educloud/portal-kit/session";
import { getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Analytics") };
}

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
      const trend = assessments
        .filter((a) => a.due_at)
        .sort((a, b) => a.due_at!.localeCompare(b.due_at!))
        .map((a) => {
          const scores = grades.filter((g) => g.assessment_id === a.id && g.score != null).map((g) => Number(g.score) / Number(a.max_score));
          return scores.length ? (scores.reduce((x, y) => x + y, 0) / scores.length) * 100 : 0;
        });
      return { course, summary, attendanceRate, trend };
    }),
  );

  const atRisk = perCourse
    .flatMap(({ course, summary }) => summary.filter((r) => r.rate != null && r.rate < 75).map((r) => ({ ...r, course: course.title })))
    .sort((a, b) => (a.rate ?? 0) - (b.rate ?? 0))
    .slice(0, 10);
  const rates = perCourse.map((c) => c.attendanceRate).filter((r): r is number => r != null);

  return (
    <>
      <PageHeader title={t("Analytics")} description={t("Attendance and academic progress across your courses.")} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label={t("Courses")} value={courses.length} />
        <StatCard label={t("Average attendance")} value={rates.length ? `${(rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(1)}%` : "—"} />
        <StatCard label={t("Students below 75% attendance")} value={atRisk.length} tone={atRisk.length ? "danger" : "success"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">{t("Attendance rate by course")}</h2>
          <BarChart
            label={t("Attendance rate by course")}
            max={100}
            format={(v) => `${v.toFixed(0)}%`}
            data={perCourse.map((c) => ({ label: c.course.title, value: c.attendanceRate ?? 0 }))}
          />
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">{t("Students who may need support")}</h2>
          {atRisk.length === 0 ? (
            <p className="text-sm text-ink-muted">{t("Everyone is above 75% attendance.")}</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {atRisk.map((r) => (
                <li key={`${r.course}-${r.student_id}`} className="flex justify-between gap-4">
                  <span>
                    {r.student_name} <span className="text-ink-muted">· {r.course}</span>
                  </span>
                  <span className="tabular-nums text-danger">{r.rate}%</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        {perCourse.map(({ course, trend }) => (
          <Card key={course.id}>
            <h2 className="font-semibold">{course.title}</h2>
            <p className="mb-2 text-sm text-ink-muted">{t("Average score per assessment, over time")}</p>
            <Sparkline values={trend} label={t("Average score trend for {course}", { course: course.title })} />
          </Card>
        ))}
      </div>
    </>
  );
}
