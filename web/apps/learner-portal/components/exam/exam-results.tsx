import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleDashed, Clock3, EyeOff, Hourglass, Lightbulb, MessageSquareQuote, MinusCircle, RotateCcw, XCircle } from "lucide-react";
import type { ExamAttempt, ExamItem, ExamQuestionResult } from "@educloud/api-client";
import { Badge, Card, HeroBanner, bannerButtonClass, cn } from "@educloud/ui";
import { getFormat, getT } from "@educloud/ui/locale";
import { ProgressRing } from "@/components/progress-ring";
import { QUESTION_TYPES, blankParts, choiceOptions, matchingSides, num, orderingItems, pct, type AttemptQuestion } from "@/lib/exam";

type T = Awaited<ReturnType<typeof getT>>;
type Outcome = ExamQuestionResult["outcome"];

const OUTCOME: Record<Outcome, { tone: "success" | "warning" | "danger" | "neutral" | "brand"; icon: typeof CheckCircle2; border: string }> = {
  correct: { tone: "success", icon: CheckCircle2, border: "border-s-success" },
  partial: { tone: "warning", icon: MinusCircle, border: "border-s-warning" },
  incorrect: { tone: "danger", icon: XCircle, border: "border-s-danger" },
  unanswered: { tone: "neutral", icon: CircleDashed, border: "border-s-line" },
  pending: { tone: "brand", icon: Hourglass, border: "border-s-brand-400" },
};

/** A finished attempt: the score and, when released, every question with the right answer. */
export async function ExamResults({ attempt, canRetake, isParent }: { attempt: ExamAttempt; canRetake: boolean; isParent: boolean }) {
  const t = await getT();
  const fmt = await getFormat();
  const exam = attempt.exam;
  const percent = pct(attempt.score, attempt.max_score);
  const pending = attempt.status === "needs_review";

  const outcomeLabel: Record<Outcome, string> = {
    correct: t("Correct"),
    partial: t("Partly correct"),
    incorrect: t("Incorrect"),
    unanswered: t("Not answered"),
    pending: t("Awaiting teacher review"),
  };

  const counts = attempt.questions.reduce(
    (acc, q) => {
      const o = q.result?.outcome;
      if (o) acc[o] += 1;
      return acc;
    },
    { correct: 0, partial: 0, incorrect: 0, unanswered: 0, pending: 0 } as Record<Outcome, number>,
  );

  const hiddenMessage =
    exam.results_visibility === "after_due" && exam.due_at
      ? t("Your results will appear after the due date ({date}).", { date: fmt.dateTime(exam.due_at) })
      : exam.results_visibility === "never"
        ? t("Your teacher keeps the results of this exam private. Your mark will appear in your grades.")
        : t("Your results aren't available yet.");

  return (
    <div className="mx-auto max-w-4xl">
      <Link href={`/courses/${exam.course.id}?tab=exams`} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {exam.course.name}
      </Link>

      <HeroBanner
        eyebrow={
          <>
            <CheckCircle2 className="h-3.5 w-3.5" /> {t("Handed in")}
            {attempt.submitted_at && ` · ${fmt.dateTime(attempt.submitted_at)}`}
          </>
        }
        title={exam.title}
        subtitle={
          !attempt.results_visible
            ? hiddenMessage
            : pending
              ? t("Most of your answers are marked. Your teacher still has to mark the written answers, so your score may go up.")
              : percent != null && percent >= 80
                ? t("Excellent work!")
                : percent != null && percent >= 50
                  ? t("Good effort. Review the answers below to learn from your mistakes.")
                  : t("Review the answers below to see where you can improve.")
        }
        actions={
          <>
            <Link href={`/exams/${exam.id}`} className={bannerButtonClass("outline")}>
              {t("Exam overview")}
            </Link>
            {canRetake && !isParent && (
              <Link href={`/exams/${exam.id}`} className={bannerButtonClass("solid")}>
                <RotateCcw className="h-4 w-4" /> {t("Try again")}
              </Link>
            )}
          </>
        }
        art={
          attempt.results_visible && percent != null ? (
            <div className="grid place-items-center rounded-full bg-surface p-3 shadow-[var(--shadow-lift)]">
              <ProgressRing value={percent} size={150} label={t("Score")} />
            </div>
          ) : (
            <div className="grid h-36 w-36 place-items-center rounded-full bg-surface text-ink-muted shadow-[var(--shadow-lift)]">
              <EyeOff className="h-10 w-10" />
            </div>
          )
        }
      />

      {attempt.results_visible && (
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="col-span-2 flex items-center gap-4 sm:col-span-1 md:hidden">
            <ProgressRing value={percent} size={72} label={t("Score")} />
            <span className="font-display text-xl font-bold tabular-nums">
              {num(attempt.score)} / {num(attempt.max_score)}
            </span>
          </Card>
          <Card className="hidden md:block">
            <p className="text-xs font-medium text-ink-muted">{t("Score")}</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums">
              {num(attempt.score)} <span className="text-base font-medium text-ink-muted">/ {num(attempt.max_score)}</span>
            </p>
          </Card>
          <Card>
            <p className="text-xs font-medium text-ink-muted">{t("Correct")}</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-success">{counts.correct}</p>
          </Card>
          <Card>
            <p className="text-xs font-medium text-ink-muted">{t("Partly correct")}</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-warning">{counts.partial}</p>
          </Card>
          <Card>
            <p className="text-xs font-medium text-ink-muted">{t("Incorrect or not answered")}</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-danger">{counts.incorrect + counts.unanswered}</p>
          </Card>
        </div>
      )}

      {attempt.results_visible && attempt.feedback && (
        <Card className="mb-8 flex gap-3 border-brand-200 bg-brand-600/[0.04] dark:border-line">
          <MessageSquareQuote className="mt-0.5 h-5 w-5 shrink-0 text-brand-600 dark:text-brand-300" />
          <div>
            <p className="text-sm font-semibold">{t("Feedback from your teacher")}</p>
            <p className="mt-1 whitespace-pre-line text-sm text-ink">{attempt.feedback}</p>
          </div>
        </Card>
      )}

      {!attempt.results_visible ? (
        <Card className="flex items-start gap-3">
          <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-ink-muted" />
          <div>
            <p className="font-semibold">{t("Your answers were received.")}</p>
            <p className="mt-1 text-sm text-ink-muted">{hiddenMessage}</p>
          </div>
        </Card>
      ) : (
        <ol className="space-y-4">
          {attempt.questions.map((q, i) => {
            const result = q.result ?? null;
            const outcome: Outcome = result?.outcome ?? "pending";
            const style = OUTCOME[outcome];
            const Icon = style.icon;
            const info = QUESTION_TYPES[q.type];
            return (
              <li key={q.id}>
                <Card className={cn("border-s-4", style.border)}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                      {t("Question {number}", { number: i + 1 })}
                      {info && <span className="ms-2 font-medium normal-case tracking-normal">· {t(info.label)}</span>}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge tone={style.tone}>
                        <Icon className="h-3.5 w-3.5" /> {outcomeLabel[outcome]}
                      </Badge>
                      <span className="text-sm font-semibold tabular-nums">
                        {result?.points == null ? "—" : num(result.points)} / {num(result?.max ?? q.points)}
                      </span>
                    </div>
                  </div>
                  {q.type !== "fill_blanks" && <p className="mb-4 whitespace-pre-line font-medium leading-relaxed">{q.prompt}</p>}
                  <AnswerReview question={q} response={attempt.answers[q.id]} t={t} />
                  {q.explanation && (
                    <div className="mt-4 flex gap-2.5 rounded-xl bg-surface-2 p-3 text-sm">
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" />
                      <p className="whitespace-pre-line">
                        <span className="font-semibold">{t("Explanation")}: </span>
                        {q.explanation}
                      </p>
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

/* ---------- The student's answer next to the right one, per type ---------- */

function Row({ label, children, tone }: { label: string; children: React.ReactNode; tone?: "good" | "bad" | "muted" }) {
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-[9rem_1fr] sm:gap-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted sm:pt-0.5">{label}</span>
      <div className={cn("min-w-0 whitespace-pre-line text-sm", tone === "good" && "text-success", tone === "bad" && "text-danger", tone === "muted" && "italic text-ink-muted")}>{children}</div>
    </div>
  );
}

const text = (items: ExamItem[], id: unknown) => items.find((i) => String(i.id) === String(id))?.text ?? String(id ?? "");
const key = (q: AttemptQuestion) => (q.answer ?? {}) as Record<string, unknown>;

function AnswerReview({ question: q, response, t }: { question: AttemptQuestion; response: unknown; t: T }) {
  const none = <Row label={t("Your answer")} tone="muted">{t("No answer")}</Row>;
  const k = key(q);
  const empty = response == null || response === "" || (Array.isArray(response) && response.length === 0);

  switch (q.type) {
    case "single_choice":
    case "multiple_choice": {
      const options = choiceOptions(q);
      const chosen = (Array.isArray(response) ? response : response == null || response === "" ? [] : [response]).map(String);
      const correct = (Array.isArray(k.correct) ? k.correct : k.correct == null ? [] : [k.correct]).map(String);
      return (
        <ul className="space-y-2">
          {options.map((o) => {
            const picked = chosen.includes(String(o.id));
            const right = correct.includes(String(o.id));
            return (
              <li
                key={o.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm",
                  right ? "border-success/40 bg-success/[0.07]" : picked ? "border-danger/40 bg-danger/[0.06]" : "border-line",
                )}
              >
                {right ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" /> : picked ? <XCircle className="h-4 w-4 shrink-0 text-danger" /> : <span className="h-4 w-4 shrink-0" />}
                <span className="min-w-0 flex-1 whitespace-pre-line">{o.text}</span>
                {picked && <span className="shrink-0 text-xs font-semibold text-ink-muted">{t("Your choice")}</span>}
              </li>
            );
          })}
        </ul>
      );
    }
    case "true_false": {
      const label = (v: unknown) => (v === true || v === "true" ? t("True") : t("False"));
      return (
        <div className="space-y-2">
          {empty ? none : <Row label={t("Your answer")}>{label(response)}</Row>}
          {k.correct != null && <Row label={t("Correct answer")} tone="good">{label(k.correct)}</Row>}
        </div>
      );
    }
    case "short_answer": {
      const accepted = Array.isArray(k.accepted) ? k.accepted.map(String) : [];
      return (
        <div className="space-y-2">
          {empty ? none : <Row label={t("Your answer")}>{String(response)}</Row>}
          {accepted.length > 0 && <Row label={t("Accepted answers")} tone="good">{accepted.join(" · ")}</Row>}
        </div>
      );
    }
    case "numeric": {
      const tolerance = Number(k.tolerance ?? 0);
      return (
        <div className="space-y-2">
          {empty ? none : <Row label={t("Your answer")}>{String(response)}</Row>}
          {k.value != null && (
            <Row label={t("Correct answer")} tone="good">
              {String(k.value)}
              {tolerance > 0 && ` (± ${tolerance})`}
            </Row>
          )}
        </div>
      );
    }
    case "fill_blanks": {
      const parts = blankParts(q.prompt);
      const blanks = Array.isArray(k.blanks) ? (k.blanks as unknown[]).map((b) => (Array.isArray(b) ? b.map(String) : [String(b)])) : [];
      const given = Array.isArray(response) ? response.map((v) => String(v ?? "")) : [];
      const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
      return (
        <p className="whitespace-pre-line leading-[2.4rem]">
          {parts.map((part, i) => {
            const answer = given[i] ?? "";
            const accepted = blanks[i] ?? [];
            const ok = answer !== "" && accepted.some((a) => norm(a) === norm(answer));
            return (
              <span key={i}>
                {part}
                {i < parts.length - 1 && (
                  <span className="mx-1 inline-flex flex-wrap items-baseline gap-1 align-baseline">
                    <span className={cn("rounded-md px-2 py-0.5 text-sm font-semibold", ok ? "bg-success/12 text-success" : "bg-danger/10 text-danger line-through decoration-1", answer === "" && "no-underline italic")}>
                      {answer === "" ? t("blank") : answer}
                    </span>
                    {!ok && accepted.length > 0 && <span className="rounded-md bg-success/12 px-2 py-0.5 text-sm font-semibold text-success">{accepted.join(" / ")}</span>}
                  </span>
                )}
              </span>
            );
          })}
        </p>
      );
    }
    case "ordering": {
      const items = orderingItems(q);
      const correct = Array.isArray(k.order) ? k.order.map(String) : [];
      const given = Array.isArray(response) ? response.map(String) : [];
      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">{t("Your order")}</p>
            {given.length === 0 ? (
              <p className="text-sm italic text-ink-muted">{t("No answer")}</p>
            ) : (
              <ol className="space-y-1.5">
                {given.map((id, i) => (
                  <li key={id} className={cn("flex gap-2 rounded-lg px-2.5 py-1.5 text-sm", correct[i] === id ? "bg-success/[0.08] text-success" : "bg-danger/[0.06] text-danger")}>
                    <span className="w-5 shrink-0 font-bold tabular-nums">{i + 1}.</span> <span className="text-ink">{text(items, id)}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          {correct.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">{t("Correct order")}</p>
              <ol className="space-y-1.5">
                {correct.map((id, i) => (
                  <li key={id} className="flex gap-2 rounded-lg bg-surface-2 px-2.5 py-1.5 text-sm">
                    <span className="w-5 shrink-0 font-bold tabular-nums text-success">{i + 1}.</span> {text(items, id)}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      );
    }
    case "matching": {
      const { left, right } = matchingSides(q);
      const pairs = (k.pairs ?? {}) as Record<string, unknown>;
      const given = response && typeof response === "object" && !Array.isArray(response) ? (response as Record<string, unknown>) : {};
      return (
        <ul className="space-y-2">
          {left.map((l) => {
            const mine = given[l.id];
            const right_ = pairs[l.id];
            const ok = mine != null && String(mine) === String(right_);
            return (
              <li key={l.id} className="grid grid-cols-1 gap-1 rounded-xl border border-line p-3 text-sm sm:grid-cols-[1fr_1fr] sm:gap-3">
                <span className="font-medium">{l.text}</span>
                <span className="flex flex-wrap items-center gap-1.5">
                  {mine == null || mine === "" ? (
                    <span className="italic text-ink-muted">{t("No answer")}</span>
                  ) : (
                    <span className={cn("rounded-md px-2 py-0.5 font-semibold", ok ? "bg-success/12 text-success" : "bg-danger/10 text-danger line-through decoration-1")}>{text(right, mine)}</span>
                  )}
                  {!ok && right_ != null && <span className="rounded-md bg-success/12 px-2 py-0.5 font-semibold text-success">{text(right, right_)}</span>}
                </span>
              </li>
            );
          })}
        </ul>
      );
    }
    case "essay":
      return empty ? (
        none
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{t("Your answer")}</p>
          <blockquote className="whitespace-pre-line rounded-xl border border-line bg-surface-2 p-3 text-sm leading-relaxed">{String(response)}</blockquote>
          {q.result?.outcome === "pending" && (
            <p className="flex items-center gap-2 text-sm text-brand-700 dark:text-brand-300">
              <Hourglass className="h-4 w-4" /> {t("Your teacher will mark this answer.")}
            </p>
          )}
        </div>
      );
    default:
      return null;
  }
}
