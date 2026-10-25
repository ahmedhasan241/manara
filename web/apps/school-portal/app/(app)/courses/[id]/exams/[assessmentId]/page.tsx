import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, ClipboardCheck, Inbox, ListChecks, Repeat, Timer, Users } from "lucide-react";
import { ApiError, type ExamAttemptStatus } from "@educloud/api-client";
import { Badge, Card, EmptyState, HeroBanner, StatCard, Tabs, asKey, buttonClass } from "@educloud/ui";
import { getContext } from "@educloud/portal-kit/session";
import { getFormat, getI18n, getT } from "@educloud/ui/locale";
import { ExamBuilder } from "@/components/exam-builder";
import { ExamReview } from "@/components/exam-review";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Online exam") };
}

const notFoundOn404 = (error: unknown): never => {
  if (error instanceof ApiError && error.status === 404) notFound();
  throw error;
};

const statusTone: Record<ExamAttemptStatus, "neutral" | "warning" | "success"> = { in_progress: "neutral", needs_review: "warning", graded: "success" };

async function StatusBadge({ status }: { status: ExamAttemptStatus }) {
  const t = await getT();
  const label = { in_progress: t("In progress"), needs_review: t("Needs review"), graded: t("Graded") };
  return <Badge tone={statusTone[status]}>{label[status]}</Badge>;
}

const num = (value: string | number | null | undefined) => (value == null ? "—" : String(Math.round(Number(value) * 100) / 100));

/**
 * Build an online exam on top of an assessment (questions & settings) and
 * see how students did (results & marking).
 */
export default async function ExamPage({ params, searchParams }: { params: Promise<{ id: string; assessmentId: string }>; searchParams: Promise<{ tab?: string; attempt?: string }> }) {
  const { id, assessmentId } = await params;
  const query = await searchParams;
  const tab = query.attempt || query.tab === "results" ? "results" : "questions";
  const { api, can } = await getContext();
  if (!can("grades.write")) notFound();
  const { t } = await getI18n();
  const fmt = await getFormat();

  const [course, exam] = await Promise.all([api.course(id), api.exam(assessmentId)]).catch(notFoundOn404);

  return (
    <>
      <Link href={`/courses/${id}?tab=grades`} className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {course.title}
      </Link>

      <HeroBanner
        eyebrow={
          <>
            <ListChecks className="h-3.5 w-3.5" /> {t("Online exam")}
          </>
        }
        title={exam.title}
        subtitle={exam.is_online ? t("Students take this exam online in the learner portal and most answers are marked for them.") : t("Not online yet: add questions and save to let students take it online.")}
        meta={
          <>
            <Badge>{t(asKey(exam.type))}</Badge>
            {exam.published_at ? <Badge tone="success">{t("Visible to students")}</Badge> : <Badge tone="warning">{t("Hidden from students")}</Badge>}
            <span className="inline-flex items-center gap-1.5">
              <ClipboardCheck className="h-4 w-4 text-brand-600 dark:text-brand-300" /> {t("Out of {max}", { max: num(exam.max_score) })}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Timer className="h-4 w-4 text-brand-600 dark:text-brand-300" /> {exam.time_limit_minutes ? t("{count} min", { count: exam.time_limit_minutes }) : t("No time limit")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Repeat className="h-4 w-4 text-brand-600 dark:text-brand-300" /> {t("Attempts allowed: {count}", { count: exam.max_attempts })}
            </span>
            {exam.due_at && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="h-4 w-4 text-brand-600 dark:text-brand-300" /> {t("Due {date}", { date: fmt.dateTime(exam.due_at) })}
              </span>
            )}
          </>
        }
      />

      <Tabs
        id="exam"
        active={tab}
        tabs={[
          { key: "questions", label: t("Questions"), href: "?tab=questions", icon: <ListChecks className="h-4 w-4" />, count: exam.questions.length },
          { key: "results", label: t("Results"), href: "?tab=results", icon: <Users className="h-4 w-4" />, count: exam.stats.submitted },
        ]}
      />

      {tab === "questions" && <ExamBuilder courseId={id} exam={exam} />}
      {tab === "results" && (query.attempt ? <AttemptView courseId={id} assessmentId={assessmentId} attemptId={query.attempt} /> : <ResultsTab assessmentId={assessmentId} maxScore={exam.max_score} stats={exam.stats} />)}
    </>
  );
}

async function ResultsTab({ assessmentId, maxScore, stats }: { assessmentId: string; maxScore: string; stats: { submitted: number; needs_review: number; average: number | null } }) {
  const t = await getT();
  const fmt = await getFormat();
  const { api } = await getContext();
  const attempts = await api.examAttempts(assessmentId);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t("Attempts")} value={stats.submitted} icon={<Users className="h-4 w-4" />} />
        <StatCard label={t("Needs review")} value={stats.needs_review} icon={<Inbox className="h-4 w-4" />} hint={stats.needs_review ? t("Essays waiting for your marks.") : undefined} />
        <StatCard
          label={t("Average score")}
          value={stats.average == null ? "—" : `${num(stats.average)} / ${num(maxScore)}`}
          icon={<ClipboardCheck className="h-4 w-4" />}
          hint={stats.average != null && Number(maxScore) > 0 ? fmt.percent((stats.average / Number(maxScore)) * 100) : undefined}
        />
      </div>

      {attempts.length === 0 ? (
        <EmptyState icon={<Users className="h-6 w-6" />} title={t("No attempts yet")} description={t("Attempts appear here as soon as students start the exam.")} />
      ) : (
        <Card className="overflow-x-auto p-0 shadow-[var(--shadow-soft)]">
          <table className="w-full text-sm">
            <thead className="border-b border-line text-ink-muted">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{t("Student")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("Status")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("Score")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("Submitted")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {attempts.map((a) => (
                <tr key={a.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium">{a.student?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-4 py-3 tabular-nums">{a.score == null ? "—" : `${num(a.score)} / ${num(a.max_score)}`}</td>
                  <td className="px-4 py-3 text-ink-muted">{a.submitted_at ? fmt.dateTime(a.submitted_at) : t("Started {time}", { time: fmt.relative(a.started_at) })}</td>
                  <td className="px-4 py-3 text-end">
                    <Link href={`?tab=results&attempt=${a.id}`} className={buttonClass(a.status === "needs_review" ? "primary" : "secondary", "sm")}>
                      {a.status === "needs_review" ? t("Mark") : t("Review")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

async function AttemptView({ courseId, assessmentId, attemptId }: { courseId: string; assessmentId: string; attemptId: string }) {
  const t = await getT();
  const fmt = await getFormat();
  const { api } = await getContext();
  const attempt = await api.examAttempt(attemptId).catch(notFoundOn404);

  return (
    <div className="space-y-6">
      <Link href="?tab=results" className="inline-flex items-center gap-1 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t("All attempts")}
      </Link>
      <Card className="flex flex-wrap items-center gap-4 shadow-[var(--shadow-soft)]">
        <div className="min-w-[12rem] flex-1">
          <p className="flex flex-wrap items-center gap-2 font-display text-lg font-bold">
            {attempt.student?.name ?? t("Student")} <StatusBadge status={attempt.status} />
          </p>
          <p className="text-sm text-ink-muted">
            {t("Started {time}", { time: fmt.dateTime(attempt.started_at) })}
            {attempt.submitted_at && ` · ${t("Submitted {time}", { time: fmt.dateTime(attempt.submitted_at) })}`}
          </p>
        </div>
        <p className="font-display text-2xl font-bold tabular-nums">
          {num(attempt.score)} <span className="text-base font-semibold text-ink-muted">/ {num(attempt.max_score)}</span>
        </p>
      </Card>
      {/* A new key after each save resets the form to the saved marks. */}
      <ExamReview key={[attempt.id, attempt.status, attempt.feedback, ...attempt.questions.map((q) => q.result?.points)].join(":")} courseId={courseId} assessmentId={assessmentId} attempt={attempt} />
    </div>
  );
}
