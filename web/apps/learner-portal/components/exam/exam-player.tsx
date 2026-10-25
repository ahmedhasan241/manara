"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, Check, CloudOff, Loader2, LogOut, Send, Timer } from "lucide-react";
import type { ExamAttempt } from "@educloud/api-client";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ProgressBar,
  buttonClass,
  cn,
  toast,
  useT,
} from "@educloud/ui";
import { saveExamAnswersAction, submitExamAction } from "@/app/(app)/exams/actions";
import { QUESTION_TYPES, isAnswered, type Answers } from "@/lib/exam";
import { QuestionInput, promptInsideInput } from "./question-input";

/*
 * The exam player: one question at a time, a server-corrected countdown,
 * autosave (debounced, on blur and when the tab is hidden, retried on
 * failure) and a local draft in localStorage so typed answers survive a
 * crash, a lost connection or a closed tab.
 */

type SaveState = "idle" | "pending" | "saving" | "saved" | "error";

interface Draft {
  answers: Answers;
  flagged: string[];
  index: number;
  /** False while there are changes the server hasn't confirmed. */
  synced: boolean;
  at: number;
}

const draftKey = (attemptId: string) => `educloud:exam-draft:${attemptId}`;

function readDraft(attemptId: string): Draft | null {
  try {
    const raw = window.localStorage.getItem(draftKey(attemptId));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

function writeDraft(attemptId: string, draft: Draft) {
  try {
    window.localStorage.setItem(draftKey(attemptId), JSON.stringify(draft));
  } catch {}
}

function clearDraft(attemptId: string) {
  try {
    window.localStorage.removeItem(draftKey(attemptId));
  } catch {}
}

const SAVE_DELAY = 1500;

export function ExamPlayer({ attempt }: { attempt: ExamAttempt }) {
  const t = useT();
  const router = useRouter();
  const questions = attempt.questions;
  const total = questions.length;
  const courseId = attempt.exam.course.id;
  const assessmentId = attempt.exam.id;

  const [answers, setAnswers] = useState<Answers>(() => attempt.answers ?? {});
  const [flagged, setFlagged] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [restored, setRestored] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Refs the async save loop reads, so it always sends the latest answers.
  const answersRef = useRef(answers);
  const versionRef = useRef(0); // bumps on every change
  const savedVersionRef = useRef(0); // the last version the server confirmed
  const inFlightRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryRef = useRef(0);
  const finishedRef = useRef(false);
  const flaggedRef = useRef(flagged);
  const indexRef = useRef(index);
  flaggedRef.current = flagged;
  indexRef.current = index;

  /* ---------- Clock: server time minus device time ---------- */
  const deadline = attempt.deadline_at ? Date.parse(attempt.deadline_at) : null;
  const offsetRef = useRef(0);
  const [now, setNow] = useState(() => Date.parse(attempt.server_time));
  useEffect(() => {
    offsetRef.current = Date.parse(attempt.server_time) - Date.now();
    const tick = () => setNow(Date.now() + offsetRef.current);
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [attempt.server_time]);
  const remaining = deadline == null ? null : Math.max(0, deadline - now);

  /* ---------- Restore a local draft newer than the server's copy ---------- */
  useEffect(() => {
    const draft = readDraft(attempt.id);
    if (draft) {
      setFlagged(draft.flagged ?? []);
      if (typeof draft.index === "number" && draft.index >= 0 && draft.index < total) setIndex(draft.index);
      if (!draft.synced && draft.answers && JSON.stringify(draft.answers) !== JSON.stringify(attempt.answers ?? {})) {
        answersRef.current = draft.answers;
        setAnswers(draft.answers);
        versionRef.current = 1;
        setRestored(true);
        setSaveState("pending");
        scheduleSave(200);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt.id]);

  const persistDraft = useCallback(
    (synced: boolean) => writeDraft(attempt.id, { answers: answersRef.current, flagged: flaggedRef.current, index: indexRef.current, synced, at: Date.now() }),
    [attempt.id],
  );

  useEffect(() => {
    // Flags and the current question are local only; keep them in the draft.
    const draft = readDraft(attempt.id);
    writeDraft(attempt.id, { answers: answersRef.current, flagged, index, synced: draft?.synced ?? versionRef.current === savedVersionRef.current, at: Date.now() });
  }, [attempt.id, flagged, index]);

  /* ---------- Autosave ---------- */
  const handedIn = useCallback(
    (message: string) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      clearDraft(attempt.id);
      toast(message);
      router.refresh();
    },
    [attempt.id, router],
  );

  const save = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (finishedRef.current || inFlightRef.current) return;
    if (versionRef.current === savedVersionRef.current) return;

    inFlightRef.current = true;
    const version = versionRef.current;
    setSaveState("saving");
    const started = Date.now();
    const result = await saveExamAnswersAction(attempt.id, answersRef.current);
    inFlightRef.current = false;

    if (result.ok && "finished" in result) {
      handedIn(t("Time's up: your exam was handed in."));
      return;
    }
    if (result.ok) {
      retryRef.current = 0;
      savedVersionRef.current = Math.max(savedVersionRef.current, version);
      // Re-sync the clock with the server, assuming the reply came half way through.
      const serverNow = Date.parse(result.savedAt);
      if (!Number.isNaN(serverNow)) offsetRef.current = serverNow - (started + Date.now()) / 2;
      const clean = versionRef.current === savedVersionRef.current;
      setSaveState(clean ? "saved" : "pending");
      if (clean) persistDraft(true);
      else scheduleSave(SAVE_DELAY);
      return;
    }
    if (result.status === 422 || result.status === 404) {
      handedIn(t("This attempt has already been handed in."));
      return;
    }
    // Offline or a server hiccup: keep the draft and try again with backoff.
    setSaveState("error");
    retryRef.current += 1;
    scheduleSave(Math.min(30000, 3000 * 2 ** (retryRef.current - 1)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt.id, handedIn, persistDraft, t]);

  const saveRef = useRef(save);
  saveRef.current = save;

  function scheduleSave(delay = SAVE_DELAY) {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void saveRef.current(), delay);
  }

  const setAnswer = (questionId: string, value: unknown) => {
    const next = { ...answersRef.current, [questionId]: value };
    answersRef.current = next;
    versionRef.current += 1;
    setAnswers(next);
    persistDraft(false);
    setSaveState("pending");
    scheduleSave();
  };

  // Save straight away when the student leaves a field or the tab.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void saveRef.current();
    };
    const onOnline = () => void saveRef.current();
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (versionRef.current !== savedVersionRef.current && !finishedRef.current) {
        void saveRef.current();
        e.preventDefault();
      }
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("online", onOnline);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  /* ---------- Hand in ---------- */
  const submit = useCallback(
    async (auto = false) => {
      if (finishedRef.current) return;
      setSubmitting(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      const result = await submitExamAction(attempt.id, answersRef.current, assessmentId, courseId);
      if (result.ok) {
        finishedRef.current = true;
        clearDraft(attempt.id);
        toast.success(auto ? t("Time's up: your exam was handed in.") : t("Exam handed in."));
        router.refresh();
        return;
      }
      setSubmitting(false);
      toast.error(result.error || t("Something went wrong. Please try again."));
      // When the time ran out keep trying: the server accepts a hand-in for a short while after the deadline.
      if (auto) window.setTimeout(() => void submitRef.current(true), 4000);
    },
    [assessmentId, attempt.id, courseId, router, t],
  );
  const submitRef = useRef(submit);
  submitRef.current = submit;

  const autoSubmitted = useRef(false);
  useEffect(() => {
    if (remaining === 0 && !autoSubmitted.current) {
      autoSubmitted.current = true;
      void submit(true);
    }
  }, [remaining, submit]);

  /* ---------- Derived ---------- */
  const answeredFlags = useMemo(() => questions.map((q) => isAnswered(answers[q.id])), [answers, questions]);
  const answeredCount = answeredFlags.filter(Boolean).length;
  const unanswered = total - answeredCount;
  const question = questions[index];

  const go = (i: number) => {
    setIndex(Math.max(0, Math.min(total - 1, i)));
    void saveRef.current();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleFlag = (id: string) => setFlagged((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

  if (!question) {
    return <p className="p-8 text-center text-ink-muted">{t("This exam has no questions.")}</p>;
  }

  const info = QUESTION_TYPES[question.type];
  const isFlagged = flagged.includes(question.id);
  const timeTone = remaining == null ? "normal" : remaining < 60_000 ? "danger" : remaining < 5 * 60_000 ? "warning" : "normal";

  // Portalled to <body> so no animated ancestor can trap the fixed, full-screen layout.
  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-surface-2">
      {/* Top bar */}
      <header className="shrink-0 border-b border-line bg-surface/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href={`/exams/${assessmentId}`} onClick={() => void saveRef.current()} className={buttonClass("ghost", "icon")} aria-label={t("Leave the exam (your answers are saved)")} title={t("Leave the exam (your answers are saved)")}>
            <LogOut className="h-4.5 w-4.5 rtl:rotate-180" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-semibold sm:text-base">{attempt.exam.title}</p>
            <p className="truncate text-xs text-ink-muted">{attempt.exam.course.name}</p>
          </div>
          <SaveIndicator state={saveState} onRetry={() => void saveRef.current()} />
          {remaining != null && <Countdown ms={remaining} tone={timeTone} />}
        </div>
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 pb-3 sm:px-6">
          <ProgressBar value={answeredCount} max={total} className="flex-1" label={t("Answered")} />
          <span className="shrink-0 text-xs font-medium tabular-nums text-ink-muted">{t("{answered} of {total} answered", { answered: answeredCount, total })}</span>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_17rem] lg:py-10">
          <main className="min-w-0">
            {restored && (
              <p className="mb-4 flex items-center gap-2 rounded-xl bg-brand-600/10 px-4 py-2.5 text-sm text-brand-800 dark:text-brand-200">
                <Check className="h-4 w-4" /> {t("We restored answers you typed on this device that hadn't been saved yet.")}
              </p>
            )}
            <article key={question.id} className="animate-rise-in rounded-[1.5rem] border border-line bg-surface p-5 shadow-[var(--shadow-soft)] sm:p-8">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-700 dark:text-brand-300">
                  {t("Question {number} of {total}", { number: index + 1, total })}
                </p>
                <div className="flex items-center gap-2">
                  {info && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs text-ink-muted">
                      <info.icon className="h-3.5 w-3.5" /> {t(info.label)}
                    </span>
                  )}
                  <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium tabular-nums text-ink-muted">{t("{points} pts", { points: question.points })}</span>
                </div>
              </div>

              {!promptInsideInput(question) && <h2 className="mb-6 whitespace-pre-line font-display text-lg font-semibold leading-relaxed sm:text-xl">{question.prompt}</h2>}

              <div onBlur={() => void saveRef.current()}>
                <QuestionInput question={question} value={answers[question.id]} onChange={(v) => setAnswer(question.id, v)} />
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
                <button
                  type="button"
                  onClick={() => toggleFlag(question.id)}
                  aria-pressed={isFlagged}
                  className={cn(buttonClass("ghost", "sm"), isFlagged && "bg-warning/12 text-warning hover:bg-warning/20 hover:text-warning")}
                >
                  {isFlagged ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                  {isFlagged ? t("Flagged for review") : t("Flag for review")}
                </button>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => go(index - 1)} disabled={index === 0}>
                    <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t("Previous")}
                  </Button>
                  {index < total - 1 ? (
                    <Button onClick={() => go(index + 1)}>
                      {t("Next")} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                    </Button>
                  ) : (
                    <Button onClick={() => setConfirmOpen(true)} disabled={submitting}>
                      <Send className="h-4 w-4 rtl:-scale-x-100" /> {t("Review and hand in")}
                    </Button>
                  )}
                </div>
              </div>
            </article>
          </main>

          {/* Question navigator */}
          <aside className="lg:sticky lg:top-0 lg:self-start">
            <div className="rounded-[1.5rem] border border-line bg-surface p-4 shadow-[var(--shadow-soft)]">
              <p className="mb-3 text-sm font-semibold">{t("Questions")}</p>
              <ol className="grid grid-cols-6 gap-2 sm:grid-cols-10 lg:grid-cols-5">
                {questions.map((q, i) => {
                  const answered = answeredFlags[i];
                  const flag = flagged.includes(q.id);
                  const current = i === index;
                  return (
                    <li key={q.id}>
                      <button
                        type="button"
                        onClick={() => go(i)}
                        aria-current={current ? "step" : undefined}
                        aria-label={`${t("Question {number} of {total}", { number: i + 1, total })}: ${answered ? t("answered") : t("not answered")}${flag ? `, ${t("flagged")}` : ""}`}
                        className={cn(
                          "relative grid aspect-square w-full place-items-center rounded-xl border text-sm font-semibold tabular-nums transition-colors",
                          answered ? "border-brand-600 bg-brand-600 text-white dark:border-brand-400 dark:bg-brand-400 dark:text-nav" : "border-line bg-surface-2 text-ink-muted hover:border-brand-300 hover:text-ink",
                          current && "ring-2 ring-brand-400 ring-offset-2 ring-offset-surface",
                        )}
                      >
                        {i + 1}
                        {flag && <span aria-hidden className="absolute -end-1 -top-1 h-3 w-3 rounded-full border-2 border-surface bg-warning" />}
                      </button>
                    </li>
                  );
                })}
              </ol>
              <ul className="mt-4 space-y-1.5 text-xs text-ink-muted">
                <li className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-brand-600 dark:bg-brand-400" /> {t("Answered")}
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded border border-line bg-surface-2" /> {t("Not answered")}
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-warning" /> {t("Flagged for review")}
                </li>
              </ul>
              <Button className="mt-4 w-full" onClick={() => setConfirmOpen(true)} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 rtl:-scale-x-100" />} {t("Hand in")}
              </Button>
            </div>
          </aside>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent role="alertdialog" className="sm:w-[min(28rem,calc(100vw-2rem))]" hideClose>
          <DialogHeader className="pe-0">
            <DialogTitle>{t("Hand in your exam?")}</DialogTitle>
            <DialogDescription>{t("Once you hand in, you can't change your answers.")}</DialogDescription>
          </DialogHeader>
          {(unanswered > 0 || flagged.length > 0) && (
            <div className="space-y-2">
              {unanswered > 0 && (
                <p className="flex items-start gap-2 rounded-xl bg-warning/12 px-3 py-2.5 text-sm text-warning">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {t("Unanswered questions: {count} of {total}", { count: unanswered, total })}
                </p>
              )}
              {flagged.length > 0 && (
                <p className="flex items-start gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-ink-muted">
                  <Bookmark className="mt-0.5 h-4 w-4 shrink-0" />
                  {t("Questions flagged for review: {count}", { count: flagged.length })}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {questions.map((q, i) =>
                  !answeredFlags[i] || flagged.includes(q.id) ? (
                    <DialogClose key={q.id} onClick={() => go(i)} className={cn(buttonClass("secondary", "sm"), "min-w-9 tabular-nums", !answeredFlags[i] && "border-warning/50")}>
                      {i + 1}
                    </DialogClose>
                  ) : null,
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose className={buttonClass("secondary")}>{t("Keep working")}</DialogClose>
            <Button
              onClick={() => {
                setConfirmOpen(false);
                void submit(false);
              }}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 rtl:-scale-x-100" />} {t("Hand in now")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {submitting && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-surface-2/70 backdrop-blur-sm" role="status" aria-live="polite">
          <p className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-5 py-4 font-semibold shadow-[var(--shadow-lift)]">
            <Loader2 className="h-5 w-5 animate-spin text-brand-600 dark:text-brand-300" /> {t("Handing in your exam…")}
          </p>
        </div>
      )}
    </div>,
    document.body,
  );
}

function Countdown({ ms, tone }: { ms: number; tone: "normal" | "warning" | "danger" }) {
  const t = useT();
  const totalSeconds = Math.ceil(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const text = `${h > 0 ? `${h}:${String(m).padStart(2, "0")}` : String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return (
    <div
      role="timer"
      aria-label={t("Time left")}
      dir="ltr"
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 font-display text-base font-bold tabular-nums transition-colors",
        tone === "danger" ? "animate-pulse bg-danger text-white" : tone === "warning" ? "bg-warning/15 text-warning" : "bg-surface-2 text-ink",
      )}
    >
      <Timer className="h-4 w-4" /> {text}
    </div>
  );
}

function SaveIndicator({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  const t = useT();
  if (state === "idle") return null;
  if (state === "error")
    return (
      <button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-danger hover:bg-danger/10" title={t("Your answers are kept on this device. Retrying…")}>
        <CloudOff className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{t("Not saved, retrying")}</span>
      </button>
    );
  return (
    <span aria-live="polite" className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
      {state === "saved" ? <Check className="h-3.5 w-3.5 text-success" /> : <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      <span className="hidden sm:inline">{state === "saved" ? t("Saved") : t("Saving…")}</span>
    </span>
  );
}
