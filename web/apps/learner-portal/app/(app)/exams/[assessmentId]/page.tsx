import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, CheckCircle2, ClipboardList, Eye, EyeOff, Hourglass, Lock, RotateCcw, Timer } from "lucide-react";
import { ApiError, type ExamAttemptSummary, type ExamOverview } from "@educloud/api-client";
import { Badge, Card, HeroBanner, SectionHeading, buttonClass } from "@educloud/ui";
import { requireAudience } from "@educloud/portal-kit/session";
import { getFormat, getT } from "@educloud/ui/locale";
import { StartExamButton } from "@/components/exam/start-exam-button";
import { QUESTION_TYPES, num, pct } from "@/lib/exam";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Online exam") };
}

export default async function ExamOverviewPage({ params }: { params: Promise<{ assessmentId: string }> }) {
  const t = await getT();
  const fmt = await getFormat();
  const { assessmentId } = await params;
  const { api, workspace } = await requireAudience("learner", "/staff-account");
  const isParent = workspace.role === "parent";

  const exam: ExamOverview = await api.examOverview(assessmentId).catch((error) => {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) notFound();
    throw error;
  });

  const resultsPolicy =
    exam.results_visibility === "immediately"
      ? t("Results right after you hand in")
      : exam.results_visibility === "after_due"
        ? t("Results after the due date")
        : t("Results are kept private by your teacher");

  const facts = [
    { icon: ClipboardList, label: t("Questions"), value: String(exam.question_count) },
    { icon: Timer, label: t("Time limit"), value: exam.time_limit_minutes ? t("{count} min", { count: exam.time_limit_minutes }) : t("No time limit") },
    { icon: RotateCcw, label: t("Attempts left"), value: t("{left} of {total}", { left: exam.attempts_left, total: exam.max_attempts }) },
    { icon: CalendarClock, label: t("Due"), value: exam.due_at ? fmt.dateTime(exam.due_at) : t("No due date") },
    { icon: exam.results_visibility === "never" ? EyeOff : Eye, label: t("Results"), value: resultsPolicy },
  ];

  let action: React.ReactNode;
  if (isParent) {
    action = (
      <p className="inline-flex items-center gap-2 rounded-xl bg-surface px-4 py-3 text-sm text-ink-muted shadow-[var(--shadow-soft)]">
        <Eye className="h-4 w-4" /> {t("You're viewing this exam as a parent. Only your child can take it.")}
      </p>
    );
  } else if (exam.open_attempt_id) {
    action = <StartExamButton assessmentId={exam.id} resume />;
  } else if (exam.can_start) {
    action = <StartExamButton assessmentId={exam.id} resume={false} />;
  } else {
    action = (
      <p className="inline-flex items-center gap-2 rounded-xl bg-surface px-4 py-3 text-sm font-medium text-ink shadow-[var(--shadow-soft)]">
        <Lock className="h-4 w-4 text-ink-muted" /> {exam.closed ? t("This exam is closed.") : exam.attempts_left === 0 ? t("You have used all your attempts.") : t("This exam isn't available right now.")}
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link href={`/courses/${exam.course.id}?tab=exams`} className={`${buttonClass("ghost", "sm")} mb-4`}>
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {exam.course.name}
      </Link>

      <HeroBanner
        eyebrow={
          <>
            <ClipboardList className="h-3.5 w-3.5" /> {t("Online exam")} · {exam.course.name}
          </>
        }
        title={exam.title}
        // Parents can't start the exam, so the timer advice is only for students.
        subtitle={isParent ? undefined : exam.time_limit_minutes ? t("You'll have {minutes} minutes once you start. The timer keeps running if you leave the page.", { minutes: exam.time_limit_minutes }) : t("Take your time: there's no time limit.")}
        actions={action}
      />

      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {facts.map(({ icon: Icon, label, value }, i) => (
          <Card key={label} className={`flex flex-col gap-2 ${i === facts.length - 1 ? "col-span-2 lg:col-span-1" : ""}`}>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600/10 text-brand-700 dark:text-brand-300">
              <Icon className="h-4.5 w-4.5" />
            </span>
            <span className="text-xs font-medium text-ink-muted">{label}</span>
            <span className="font-display text-base font-semibold leading-snug">{value}</span>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 font-display text-lg font-semibold">{t("Instructions")}</h2>
            {exam.instructions ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{exam.instructions}</p>
            ) : (
              <p className="text-sm text-ink-muted">{t("Read each question carefully. Your answers are saved as you go, and you can move between questions before handing in.")}</p>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 font-display text-lg font-semibold">{t("What's in this exam")}</h2>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {exam.question_types.map((type) => {
                const info = QUESTION_TYPES[type];
                if (!info) return null;
                const Icon = info.icon;
                return (
                  <li key={type} className="flex items-start gap-3 rounded-xl bg-surface-2 p-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface text-brand-600 shadow-[var(--shadow-soft)] dark:text-brand-300">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{t(info.label)}</span>
                      <span className="block text-xs text-ink-muted">{t(info.hint)}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>

        <div>
          <SectionHeading title={isParent ? t("Attempts") : t("Your attempts")} />
          {exam.attempts.length === 0 ? (
            <Card className="text-sm text-ink-muted">{isParent ? t("No attempts yet.") : t("You haven't taken this exam yet.")}</Card>
          ) : (
            <ul className="space-y-3">
              {exam.attempts.map((a, i) => (
                <AttemptRow key={a.id} attempt={a} number={exam.attempts.length - i} />
              ))}
            </ul>
          )}
          {exam.attempts.length > 0 && !isParent && exam.can_start && (
            <p className="mt-3 text-xs text-ink-muted">{t("Your best mark counts towards your grade.")}</p>
          )}
        </div>
      </div>
    </div>
  );

  function AttemptRow({ attempt, number }: { attempt: ExamAttemptSummary; number: number }) {
    const percent = pct(attempt.score, attempt.max_score);
    const status =
      attempt.status === "in_progress" ? (
        <Badge tone="warning">
          <Hourglass className="h-3 w-3" /> {t("In progress")}
        </Badge>
      ) : attempt.status === "needs_review" ? (
        <Badge tone="brand">{t("Awaiting teacher review")}</Badge>
      ) : (
        <Badge tone="success">
          <CheckCircle2 className="h-3 w-3" /> {t("Marked")}
        </Badge>
      );
    const href = `/exams/attempt/${attempt.id}`;
    return (
      <li>
        <Card className="flex items-center gap-4 p-4">
          <span
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl font-display text-sm font-bold ${percent == null ? "bg-surface-3 text-ink-muted" : percent >= 80 ? "bg-success text-white" : percent >= 60 ? "bg-warning text-white" : "bg-live-500 text-white"}`}
          >
            {percent == null ? "—" : `${Math.round(percent)}%`}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {t("Attempt {number}", { number })} {status}
            </p>
            <p className="text-xs text-ink-muted">
              {attempt.submitted_at ? t("Handed in {date}", { date: fmt.dateTime(attempt.submitted_at) }) : t("Started {date}", { date: fmt.dateTime(attempt.started_at) })}
              {attempt.score != null && ` · ${num(attempt.score)} / ${num(attempt.max_score)}`}
            </p>
          </div>
          {(attempt.status !== "in_progress" || isParent) && (
            <Link href={href} className={buttonClass("secondary", "sm")}>
              {t("View")}
            </Link>
          )}
        </Card>
      </li>
    );
  }
}
