"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import type { ExamAttempt } from "@educloud/api-client";
import { Alert, Button, Card, Field, Textarea, cn, toast, useT } from "@educloud/ui";
import { reviewExamAttempt } from "@/app/exam-actions";
import { AnswerView, KeyView, OutcomeBadge, Prompt, questionTypes } from "./exam-question-view";

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Mark one attempt: every question with the student's answer, the key and
 * the automatic result. Essays need points; any other mark can be adjusted.
 */
export function ExamReview({ courseId, assessmentId, attempt }: { courseId: string; assessmentId: string; attempt: ExamAttempt }) {
  const t = useT();
  const router = useRouter();
  const types = questionTypes(t);
  const initial = Object.fromEntries(attempt.questions.map((q) => [q.id, q.result?.points == null ? "" : String(round(q.result.points))]));
  const [points, setPoints] = useState<Record<string, string>>(initial);
  const [feedback, setFeedback] = useState(attempt.feedback ?? "");
  const [saving, startSaving] = useTransition();
  const running = attempt.status === "in_progress";

  const errorFor = (id: string, max: number) => {
    const raw = points[id] ?? "";
    if (raw === "") return null;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 && value <= max ? null : t("Enter 0 to {max}.", { max });
  };
  const invalid = attempt.questions.some((q) => errorFor(q.id, q.points));
  const pendingEssays = attempt.questions.filter((q) => q.result?.outcome === "pending" && (points[q.id] ?? "") === "").length;
  const changed = attempt.questions.filter((q) => (points[q.id] ?? "") !== "" && points[q.id] !== initial[q.id]);
  const dirty = changed.length > 0 || feedback !== (attempt.feedback ?? "");
  const projected = attempt.questions.reduce((sum, q) => sum + (Number(points[q.id]) || 0), 0);

  function save() {
    if (invalid) {
      toast.error(t("Fix the highlighted points before saving."));
      return;
    }
    startSaving(async () => {
      const result = await reviewExamAttempt(courseId, assessmentId, attempt.id, {
        points: Object.fromEntries(changed.map((q) => [q.id, Number(points[q.id])])),
        feedback: feedback.trim() || null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("Marks saved."));
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {running && <Alert tone="warning">{t("The student is still taking this exam. You can mark it once it is submitted.")}</Alert>}

      <ol className="space-y-4">
        {attempt.questions.map((q, i) => {
          const meta = types.find((x) => x.type === q.type);
          const error = errorFor(q.id, q.points);
          const needsMarking = q.result?.outcome === "pending";
          const response = attempt.answers[q.id];
          return (
            <li key={q.id}>
              <Card className={cn("space-y-4 shadow-[var(--shadow-soft)]", needsMarking && "border-brand-500/60")}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-peach text-sm font-bold text-brand-700 dark:text-brand-300">{i + 1}</span>
                  {meta && (
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted">
                      {meta.icon} {meta.label}
                    </span>
                  )}
                  <span className="ms-auto flex items-center gap-2">
                    <OutcomeBadge result={q.result} t={t} />
                    {q.result?.reviewed && <span className="text-xs text-ink-muted">{t("Marked by a teacher")}</span>}
                  </span>
                </div>

                {q.type !== "fill_blanks" && <Prompt prompt={q.prompt} />}

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl bg-surface-2 p-3 text-sm">
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-muted">{t("Student’s answer")}</p>
                    <AnswerView question={q} response={response} t={t} />
                  </div>
                  <div className="rounded-xl bg-success/5 p-3 text-sm ring-1 ring-success/20">
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-success">{q.type === "essay" ? t("Rubric") : t("Answer key")}</p>
                    <KeyView question={q} t={t} />
                  </div>
                </div>

                {q.explanation && (
                  <p className="text-sm text-ink-muted">
                    <span className="font-semibold text-ink">{t("Explanation")}:</span> {q.explanation}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3 text-sm">
                  <label htmlFor={`points-${q.id}`} className="font-medium">
                    {needsMarking ? t("Award points") : t("Points")}
                  </label>
                  <input
                    id={`points-${q.id}`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={q.points}
                    step="0.5"
                    disabled={running}
                    value={points[q.id] ?? ""}
                    placeholder={needsMarking ? "—" : undefined}
                    onChange={(e) => setPoints((p) => ({ ...p, [q.id]: e.target.value }))}
                    aria-invalid={!!error}
                    className={cn("h-9 w-20 rounded-lg border bg-surface px-2 text-end tabular-nums focus:border-brand-500 focus:outline-none", error ? "border-danger" : "border-line")}
                  />
                  <span className="text-ink-muted tabular-nums">/ {round(q.points)}</span>
                  {error && (
                    <span className="text-xs font-medium text-danger" role="alert">
                      {error}
                    </span>
                  )}
                </div>
              </Card>
            </li>
          );
        })}
      </ol>

      <Card className="band-peach shadow-[var(--shadow-soft)]">
        <Field label={t("Feedback for the student")} htmlFor="attempt-feedback" hint={t("Shown with their results.")}>
          <Textarea id="attempt-feedback" rows={3} maxLength={5000} disabled={running} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
        </Field>
      </Card>

      <div className="sticky bottom-4 z-20 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface/95 p-3 shadow-[var(--shadow-lift)] backdrop-blur sm:px-4">
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold tabular-nums">{t("Score: {score} / {max}", { score: round(projected), max: round(Number(attempt.max_score)) })}</p>
          <p className="text-xs text-ink-muted">{pendingEssays > 0 ? t("Answers still to mark: {count}", { count: pendingEssays }) : dirty ? t("Unsaved changes") : t("All changes saved")}</p>
        </div>
        <Button onClick={save} disabled={saving || running || !dirty}>
          <Save className="h-4 w-4" /> {saving ? t("Saving…") : t("Save marks")}
        </Button>
      </div>
    </div>
  );
}
