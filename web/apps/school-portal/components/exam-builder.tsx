"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowLeftRight, ArrowUp, Copy, Eye, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import type { ExamDefinition, ExamItem, ExamQuestion, ExamQuestionType, ExamResultsVisibility } from "@educloud/api-client";
import {
  Alert,
  Badge,
  Button,
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  EmptyState,
  Field,
  Input,
  Select,
  Switch,
  Textarea,
  buttonClass,
  cn,
  toast,
  useT,
  type Translate,
} from "@educloud/ui";
import { saveExam } from "@/app/exam-actions";
import { QuestionPreview, questionTypes } from "./exam-question-view";
import { BLANK, blankDraft, countBlanks, fromQuestion, item, payloadOf, resize, settingsOf, toQuestion, uid, validate, validateSettings, type Draft, type Settings } from "./exam-draft";

const iconButton = "grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition hover:bg-surface-3 hover:text-ink disabled:pointer-events-none disabled:opacity-30";

/**
 * Write an online exam: settings, then questions of nine kinds with their
 * answer keys. Everything is saved at once; the exam's maximum score becomes
 * the total of the points.
 */
export function ExamBuilder({ courseId, exam }: { courseId: string; exam: ExamDefinition }) {
  const t = useT();
  const router = useRouter();
  const types = useMemo(() => questionTypes(t), [t]);
  const [initial] = useState(() => {
    const s = settingsOf(exam);
    const d = exam.questions.map(fromQuestion);
    return { settings: s, drafts: d, baseline: JSON.stringify(payloadOf(s, d)) };
  });
  const [settings, setSettings] = useState<Settings>(initial.settings);
  const [drafts, setDrafts] = useState<Draft[]>(initial.drafts);
  const [baseline, setBaseline] = useState(initial.baseline);
  const [serverErrors, setServerErrors] = useState<{ questions: Record<number, string>; general: string[] }>({ questions: {}, general: [] });
  const [showErrors, setShowErrors] = useState(false);
  const [preview, setPreview] = useState(false);
  const [saving, startSaving] = useTransition();
  const listRef = useRef<HTMLOListElement>(null);

  const payload = payloadOf(settings, drafts);
  const dirty = JSON.stringify(payload) !== baseline;
  const total = drafts.reduce((sum, d) => sum + (Number(d.points) || 0), 0);
  const problems = drafts.map((d, i) => serverErrors.questions[i] ?? (showErrors ? validate(d, t) : null));
  const settingsError = validateSettings(settings, t);
  const toFix = drafts.filter((d) => validate(d, t)).length;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function update(index: number, change: Partial<Draft> | ((d: Draft) => Partial<Draft>)) {
    setDrafts((list) => list.map((d, i) => (i === index ? { ...d, ...(typeof change === "function" ? change(d) : change) } : d)));
    setServerErrors((e) => {
      if (!(index in e.questions)) return e;
      const questions = { ...e.questions };
      delete questions[index];
      return { ...e, questions };
    });
  }

  function add(type: ExamQuestionType) {
    setDrafts((list) => [...list, blankDraft(type)]);
    setServerErrors({ questions: {}, general: [] });
    requestAnimationFrame(() => listRef.current?.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  function move(index: number, by: -1 | 1) {
    setDrafts((list) => {
      const next = [...list];
      const [moved] = next.splice(index, 1);
      next.splice(index + by, 0, moved!);
      return next;
    });
    setServerErrors({ questions: {}, general: [] });
  }

  function duplicate(index: number) {
    setDrafts((list) => {
      const copy: Draft = structuredClone(list[index]!);
      copy.key = uid();
      delete copy.id;
      return [...list.slice(0, index + 1), copy, ...list.slice(index + 1)];
    });
    setServerErrors({ questions: {}, general: [] });
  }

  function remove(index: number) {
    setDrafts((list) => list.filter((_, i) => i !== index));
    setServerErrors({ questions: {}, general: [] });
  }

  function save() {
    setShowErrors(true);
    if (drafts.length === 0) {
      toast.error(t("Add at least one question."));
      return;
    }
    const first = drafts.findIndex((d) => validate(d, t));
    if (first >= 0 || settingsError) {
      toast.error(t("Fix the highlighted problems before saving."));
      if (first >= 0) listRef.current?.children[first]?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    startSaving(async () => {
      const result = await saveExam(courseId, exam.id, payload);
      if (!result.ok) {
        const questions: Record<number, string> = {};
        const general: string[] = [];
        for (const [field, messages] of Object.entries(result.errors)) {
          const match = /^questions\.(\d+)/.exec(field);
          if (match) questions[Number(match[1])] ??= messages[0] ?? result.error;
          else general.push(messages[0] ?? result.error);
        }
        if (!Object.keys(questions).length && !general.length) general.push(result.error);
        setServerErrors({ questions, general });
        toast.error(result.error);
        const firstBad = Math.min(...Object.keys(questions).map(Number));
        if (Number.isFinite(firstBad)) listRef.current?.children[firstBad]?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      // Take the saved questions back so new ones keep their ids next time.
      const saved = result.data.questions.map(fromQuestion);
      const savedSettings = settingsOf(result.data);
      setDrafts(saved);
      setSettings(savedSettings);
      setBaseline(JSON.stringify(payloadOf(savedSettings, saved)));
      setServerErrors({ questions: {}, general: [] });
      setShowErrors(false);
      toast.success(t("Exam saved."));
      router.refresh();
    });
  }

  const addMenu = (label: string, variant: "primary" | "secondary" = "primary") => (
    <DropdownMenu>
      <DropdownMenuTrigger className={buttonClass(variant)}>
        <Plus className="h-4 w-4" /> {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        <DropdownMenuLabel>{t("Question type")}</DropdownMenuLabel>
        {types.map((type) => (
          <DropdownMenuItem key={type.type} onSelect={() => add(type.type)} className="items-start">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-600/10 text-brand-700 dark:text-brand-300">{type.icon}</span>
            <span className="min-w-0">
              <span className="block font-semibold">{type.label}</span>
              <span className="block text-xs text-ink-muted">{type.description}</span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold">{t("Questions")}</h2>
            <p className="text-sm text-ink-muted">{t("Write each question with its answer key. Students only see the answers once results are released.")}</p>
          </div>
          {drafts.length > 0 && (
            <Button variant="secondary" size="sm" onClick={() => setPreview((p) => !p)} aria-pressed={preview}>
              {preview ? <Pencil className="h-4 w-4" /> : <Eye className="h-4 w-4" />} {preview ? t("Back to editing") : t("Preview as student")}
            </Button>
          )}
        </div>

        {exam.stats.submitted > 0 && <Alert tone="warning">{t("Attempts already submitted: {count}. Changing questions or answer keys can change how they are marked.", { count: exam.stats.submitted })}</Alert>}

        {drafts.length === 0 ? (
          <EmptyState title={t("No questions yet")} description={t("Add your first question. You can mix all nine kinds in one exam.")} action={addMenu(t("Add question"))} />
        ) : (
          <ol ref={listRef} className="space-y-4">
            {drafts.map((d, i) => {
              const meta = types.find((x) => x.type === d.type)!;
              return (
                <li key={d.key}>
                  <Card className={cn("space-y-4 shadow-[var(--shadow-soft)]", problems[i] && "border-danger/50")}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-peach text-sm font-bold text-brand-700 dark:text-brand-300">{i + 1}</span>
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted">
                        {meta.icon} {meta.label}
                      </span>
                      <label className="ms-auto flex items-center gap-1.5 text-sm text-ink-muted">
                        <input
                          type="number"
                          min={0}
                          max={1000}
                          step="0.5"
                          inputMode="decimal"
                          value={d.points}
                          onChange={(e) => update(i, { points: e.target.value })}
                          aria-label={t("Points for question {number}", { number: i + 1 })}
                          className="h-8 w-16 rounded-lg border border-line bg-surface px-2 text-end tabular-nums text-ink focus:border-brand-500 focus:outline-none"
                        />
                        {t("pts")}
                      </label>
                      <div className="flex items-center">
                        <button type="button" className={iconButton} disabled={i === 0} onClick={() => move(i, -1)} aria-label={t("Move question up")}>
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button type="button" className={iconButton} disabled={i === drafts.length - 1} onClick={() => move(i, 1)} aria-label={t("Move question down")}>
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button type="button" className={iconButton} onClick={() => duplicate(i)} aria-label={t("Duplicate question")}>
                          <Copy className="h-4 w-4" />
                        </button>
                        <button type="button" className={cn(iconButton, "hover:text-danger")} onClick={() => remove(i)} aria-label={t("Delete question")}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {preview ? (
                      <div className="rounded-xl bg-surface-2 p-4">
                        <QuestionPreview question={toQuestion(d)} t={t} />
                      </div>
                    ) : (
                      <QuestionEditor draft={d} index={i} onChange={(change) => update(i, change)} />
                    )}

                    {problems[i] && <Alert>{problems[i]}</Alert>}
                  </Card>
                </li>
              );
            })}
          </ol>
        )}

        {drafts.length > 0 && <div>{addMenu(t("Add question"), "secondary")}</div>}

        {serverErrors.general.map((message) => (
          <Alert key={message}>{message}</Alert>
        ))}

        <div className="sticky bottom-4 z-20 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface/95 p-3 shadow-[var(--shadow-lift)] backdrop-blur sm:px-4">
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-semibold">
              {t("Questions: {count}", { count: drafts.length })} · {t("Total: {points} points", { points: Number(total.toFixed(2)) })}
            </p>
            <p className="text-xs text-ink-muted">
              {showErrors && toFix > 0 ? <span className="text-danger">{t("Questions to fix: {count}", { count: toFix })}</span> : dirty ? t("Unsaved changes") : t("All changes saved")}
            </p>
          </div>
          <Button onClick={save} disabled={saving || !dirty}>
            <Save className="h-4 w-4" /> {saving ? t("Saving…") : t("Save exam")}
          </Button>
        </div>
      </div>

      {/* Settings */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card className="band-peach space-y-4 shadow-[var(--shadow-soft)]">
          <div>
            <h2 className="font-display text-lg font-bold">{t("Exam settings")}</h2>
            <p className="text-sm text-ink-muted">{t("How students take this exam.")}</p>
          </div>
          <Field label={t("Time limit (minutes)")} htmlFor="exam-time" hint={t("Leave empty for no time limit.")} error={settingsError ?? undefined}>
            <Input id="exam-time" type="number" min={1} max={600} inputMode="numeric" placeholder={t("No limit")} value={settings.timeLimit} onChange={(e) => setSettings((s) => ({ ...s, timeLimit: e.target.value }))} />
          </Field>
          <Field label={t("Attempts allowed")} htmlFor="exam-attempts" hint={t("The best graded attempt goes to the gradebook.")}>
            <Select id="exam-attempts" value={settings.maxAttempts} onChange={(e) => setSettings((s) => ({ ...s, maxAttempts: Number(e.target.value) }))}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("Show results to students")} htmlFor="exam-visibility">
            <Select id="exam-visibility" value={settings.visibility} onChange={(e) => setSettings((s) => ({ ...s, visibility: e.target.value as ExamResultsVisibility }))}>
              <option value="immediately">{t("Right after they submit")}</option>
              <option value="after_due">{t("After the due date")}</option>
              <option value="never">{t("Never (only the score in the gradebook)")}</option>
            </Select>
          </Field>
          <label className="flex items-center justify-between gap-3 rounded-xl bg-surface p-3 text-sm font-medium">
            <span>
              {t("Shuffle questions")}
              <span className="block text-xs font-normal text-ink-muted">{t("Each student gets the questions in a different order.")}</span>
            </span>
            <Switch checked={settings.shuffle} onCheckedChange={(shuffle) => setSettings((s) => ({ ...s, shuffle }))} />
          </label>
          <Field label={t("Instructions")} htmlFor="exam-instructions" hint={t("Shown to students before they start.")}>
            <Textarea id="exam-instructions" rows={4} maxLength={5000} value={settings.instructions} onChange={(e) => setSettings((s) => ({ ...s, instructions: e.target.value }))} />
          </Field>
        </Card>
      </aside>
    </div>
  );
}

function QuestionEditor({ draft: d, index, onChange }: { draft: Draft; index: number; onChange: (change: Partial<Draft> | ((d: Draft) => Partial<Draft>)) => void }) {
  const t = useT();
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const id = `q${index}`;

  function setPrompt(prompt: string) {
    onChange((current) => ({ prompt, ...(current.type === "fill_blanks" ? { blanks: resize(current.blanks, countBlanks(prompt)) } : {}) }));
  }

  function insertBlank() {
    const el = promptRef.current;
    const start = el?.selectionStart ?? d.prompt.length;
    const end = el?.selectionEnd ?? d.prompt.length;
    const next = d.prompt.slice(0, start) + BLANK + d.prompt.slice(end);
    setPrompt(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + BLANK.length, start + BLANK.length);
    });
  }

  return (
    <div className="space-y-4">
      <Field
        label={d.type === "fill_blanks" ? t("Text with blanks") : d.type === "true_false" ? t("Statement") : t("Question")}
        htmlFor={`${id}-prompt`}
        hint={d.type === "fill_blanks" ? t("Put the cursor where a word is missing and press “Insert blank”.") : undefined}
      >
        {/* Plain textarea: the blank inserter needs the cursor position. */}
        <textarea
          ref={promptRef}
          id={`${id}-prompt`}
          rows={d.type === "essay" || d.type === "fill_blanks" ? 3 : 2}
          maxLength={5000}
          value={d.prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink transition placeholder:text-ink-muted/60 hover:border-ink-muted/40 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/15"
        />
      </Field>

      {d.type === "fill_blanks" && (
        <div className="space-y-3">
          <Button type="button" variant="soft" size="sm" onClick={insertBlank}>
            <Plus className="h-4 w-4" /> {t("Insert blank")}
          </Button>
          {d.blanks.length > 0 && (
            <div className="space-y-2">
              {d.blanks.map((accepted, b) => (
                <div key={b} className="grid gap-2 sm:grid-cols-[6rem_1fr] sm:items-center">
                  <span className="text-sm font-medium">{t("Blank {number}", { number: b + 1 })}</span>
                  <ChipsInput
                    label={t("Accepted answers for blank {number}", { number: b + 1 })}
                    values={accepted}
                    onChange={(values) => onChange((current) => ({ blanks: current.blanks.map((x, j) => (j === b ? values : x)) }))}
                  />
                </div>
              ))}
              <p className="text-xs text-ink-muted">{t("Press Enter after each accepted answer. Capital letters don’t matter.")}</p>
            </div>
          )}
        </div>
      )}

      {(d.type === "single_choice" || d.type === "multiple_choice") && (
        <fieldset className="space-y-2">
          <legend className="mb-1.5 text-sm font-medium">{d.type === "single_choice" ? t("Choices (mark the right one)") : t("Choices (mark every right one)")}</legend>
          {d.choices.map((choice, c) => {
            const isCorrect = d.correct.includes(choice.id);
            return (
              <div key={choice.id} className={cn("flex items-center gap-2 rounded-xl border p-1.5 ps-3 transition", isCorrect ? "border-success/50 bg-success/5" : "border-line")}>
                <input
                  type={d.type === "single_choice" ? "radio" : "checkbox"}
                  name={`${id}-correct`}
                  checked={isCorrect}
                  onChange={() =>
                    onChange((current) => ({
                      correct: current.type === "single_choice" ? [choice.id] : isCorrect ? current.correct.filter((x) => x !== choice.id) : [...current.correct, choice.id],
                    }))
                  }
                  aria-label={t("Mark choice {number} as correct", { number: c + 1 })}
                  className="h-4 w-4 shrink-0 accent-[var(--brand-500)]"
                />
                <input
                  value={choice.text}
                  onChange={(e) => onChange((current) => ({ choices: current.choices.map((x) => (x.id === choice.id ? { ...x, text: e.target.value } : x)) }))}
                  placeholder={t("Choice {number}", { number: c + 1 })}
                  aria-label={t("Choice {number}", { number: c + 1 })}
                  className="h-8 min-w-0 flex-1 rounded-lg bg-transparent px-2 text-sm outline-none focus:bg-surface-2"
                />
                {isCorrect && <Badge tone="success">{t("Correct")}</Badge>}
                <button
                  type="button"
                  className={cn(iconButton, "hover:text-danger")}
                  disabled={d.choices.length <= 2}
                  onClick={() => onChange((current) => ({ choices: current.choices.filter((x) => x.id !== choice.id), correct: current.correct.filter((x) => x !== choice.id) }))}
                  aria-label={t("Remove choice {number}", { number: c + 1 })}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange((current) => ({ choices: [...current.choices, item()] }))}>
            <Plus className="h-4 w-4" /> {t("Add choice")}
          </Button>
        </fieldset>
      )}

      {d.type === "true_false" && (
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">{t("The statement is…")}</legend>
          <div className="grid max-w-sm grid-cols-2 gap-2">
            {[true, false].map((value) => (
              <button
                key={String(value)}
                type="button"
                aria-pressed={d.truth === value}
                onClick={() => onChange({ truth: value })}
                className={cn(
                  "h-10 rounded-xl border text-sm font-semibold transition",
                  d.truth === value ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-surface text-ink-muted hover:text-ink",
                )}
              >
                {value ? t("True") : t("False")}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {d.type === "short_answer" && (
        <div className="space-y-2">
          <span className="block text-sm font-medium">{t("Accepted answers")}</span>
          <ChipsInput label={t("Accepted answers")} values={d.accepted} onChange={(accepted) => onChange({ accepted })} />
          <p className="text-xs text-ink-muted">{t("Press Enter after each one. Extra spaces are ignored.")}</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={d.caseSensitive} onChange={(e) => onChange({ caseSensitive: e.target.checked })} className="h-4 w-4 accent-[var(--brand-500)]" />
            {t("Capital letters matter")}
          </label>
        </div>
      )}

      {d.type === "numeric" && (
        <div className="grid max-w-md gap-4 sm:grid-cols-2">
          <Field label={t("Correct number")} htmlFor={`${id}-value`}>
            <Input id={`${id}-value`} type="number" step="any" value={d.value} onChange={(e) => onChange({ value: e.target.value })} />
          </Field>
          <Field label={t("Tolerance (±)")} htmlFor={`${id}-tolerance`} hint={t("Optional. 0.5 accepts 2.5 to 3.5 for 3.")}>
            <Input id={`${id}-tolerance`} type="number" min={0} step="any" value={d.tolerance} onChange={(e) => onChange({ tolerance: e.target.value })} />
          </Field>
        </div>
      )}

      {d.type === "ordering" && (
        <fieldset className="space-y-2">
          <legend className="mb-1.5 text-sm font-medium">{t("Items in the right order")}</legend>
          <p className="text-xs text-ink-muted">{t("Type them in the correct order. Students get them shuffled.")}</p>
          {d.items.map((entry, n) => (
            <div key={entry.id} className="flex items-center gap-2 rounded-xl border border-line p-1.5">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-surface-3 text-xs font-bold">{n + 1}</span>
              <input
                value={entry.text}
                onChange={(e) => onChange((current) => ({ items: current.items.map((x) => (x.id === entry.id ? { ...x, text: e.target.value } : x)) }))}
                placeholder={t("Item {number}", { number: n + 1 })}
                aria-label={t("Item {number}", { number: n + 1 })}
                className="h-8 min-w-0 flex-1 rounded-lg bg-transparent px-2 text-sm outline-none focus:bg-surface-2"
              />
              <button type="button" className={iconButton} disabled={n === 0} onClick={() => onChange((current) => ({ items: swap(current.items, n, n - 1) }))} aria-label={t("Move item up")}>
                <ArrowUp className="h-4 w-4" />
              </button>
              <button type="button" className={iconButton} disabled={n === d.items.length - 1} onClick={() => onChange((current) => ({ items: swap(current.items, n, n + 1) }))} aria-label={t("Move item down")}>
                <ArrowDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                className={cn(iconButton, "hover:text-danger")}
                disabled={d.items.length <= 2}
                onClick={() => onChange((current) => ({ items: current.items.filter((x) => x.id !== entry.id) }))}
                aria-label={t("Remove item {number}", { number: n + 1 })}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange((current) => ({ items: [...current.items, item()] }))}>
            <Plus className="h-4 w-4" /> {t("Add item")}
          </Button>
        </fieldset>
      )}

      {d.type === "matching" && (
        <fieldset className="space-y-2">
          <legend className="mb-1.5 text-sm font-medium">{t("Pairs")}</legend>
          <p className="text-xs text-ink-muted">{t("Students see the right-hand side shuffled and match each item on the left.")}</p>
          {d.pairs.map((pair, n) => (
            <div key={pair.left.id} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 rounded-xl border border-line p-1.5">
              <input
                value={pair.left.text}
                onChange={(e) => onChange((current) => ({ pairs: current.pairs.map((p, j) => (j === n ? { ...p, left: { ...p.left, text: e.target.value } } : p)) }))}
                placeholder={t("Item {number}", { number: n + 1 })}
                aria-label={t("Left item {number}", { number: n + 1 })}
                className="h-8 min-w-0 rounded-lg bg-transparent px-2 text-sm outline-none focus:bg-surface-2"
              />
              <ArrowLeftRight className="h-4 w-4 text-ink-muted" aria-hidden />
              <input
                value={pair.right.text}
                onChange={(e) => onChange((current) => ({ pairs: current.pairs.map((p, j) => (j === n ? { ...p, right: { ...p.right, text: e.target.value } } : p)) }))}
                placeholder={t("Its match")}
                aria-label={t("Match for item {number}", { number: n + 1 })}
                className="h-8 min-w-0 rounded-lg bg-transparent px-2 text-sm outline-none focus:bg-surface-2"
              />
              <button
                type="button"
                className={cn(iconButton, "hover:text-danger")}
                disabled={d.pairs.length <= 2}
                onClick={() => onChange((current) => ({ pairs: current.pairs.filter((_, j) => j !== n) }))}
                aria-label={t("Remove pair {number}", { number: n + 1 })}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          {d.extras.map((extra, n) => (
            <div key={extra.id} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 rounded-xl border border-dashed border-line p-1.5">
              <span className="px-2 text-xs text-ink-muted">{t("Extra option (matches nothing)")}</span>
              <span />
              <input
                value={extra.text}
                onChange={(e) => onChange((current) => ({ extras: current.extras.map((x) => (x.id === extra.id ? { ...x, text: e.target.value } : x)) }))}
                aria-label={t("Extra option {number}", { number: n + 1 })}
                className="h-8 min-w-0 rounded-lg bg-transparent px-2 text-sm outline-none focus:bg-surface-2"
              />
              <button type="button" className={cn(iconButton, "hover:text-danger")} onClick={() => onChange((current) => ({ extras: current.extras.filter((x) => x.id !== extra.id) }))} aria-label={t("Remove extra option {number}", { number: n + 1 })}>
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange((current) => ({ pairs: [...current.pairs, { left: item(), right: item() }] }))}>
              <Plus className="h-4 w-4" /> {t("Add pair")}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange((current) => ({ extras: [...current.extras, item()] }))}>
              <Plus className="h-4 w-4" /> {t("Add extra option")}
            </Button>
          </div>
        </fieldset>
      )}

      {d.type === "essay" && (
        <Field label={t("Rubric or model answer")} htmlFor={`${id}-rubric`} hint={t("Helps you mark. Students may see it once results are released.")}>
          <Textarea id={`${id}-rubric`} rows={3} maxLength={5000} value={d.rubric} onChange={(e) => onChange({ rubric: e.target.value })} />
        </Field>
      )}

      <Field label={t("Explanation (optional)")} htmlFor={`${id}-explanation`} hint={t("Shown to students with their results.")}>
        <Textarea id={`${id}-explanation`} rows={2} maxLength={5000} value={d.explanation} onChange={(e) => onChange({ explanation: e.target.value })} />
      </Field>
    </div>
  );
}

function swap<T>(list: T[], a: number, b: number): T[] {
  const next = [...list];
  [next[a], next[b]] = [next[b]!, next[a]!];
  return next;
}

/** Type an answer and press Enter (or comma) to add it as a chip. */
function ChipsInput({ values, onChange, label }: { values: string[]; onChange: (values: string[]) => void; label: string }) {
  const t = useT();
  const [text, setText] = useState("");

  function commit() {
    const value = text.trim();
    if (value && !values.includes(value)) onChange([...values, value]);
    setText("");
  }

  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-line bg-surface px-2 py-1.5 transition focus-within:border-brand-500 focus-within:ring-3 focus-within:ring-brand-500/15">
      {values.map((value) => (
        <span key={value} className="inline-flex items-center gap-1 rounded-md bg-brand-500/12 py-0.5 ps-2 pe-1 text-sm font-medium text-brand-700 dark:text-brand-200">
          {value}
          <button type="button" onClick={() => onChange(values.filter((v) => v !== value))} className="grid h-5 w-5 place-items-center rounded hover:bg-brand-500/20" aria-label={t("Remove {name}", { name: value })}>
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
      <input
        value={text}
        aria-label={label}
        placeholder={values.length ? "" : t("Type an answer, then Enter")}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && text === "" && values.length) {
            onChange(values.slice(0, -1));
          }
        }}
        className="h-7 min-w-32 flex-1 bg-transparent px-1 text-sm outline-none"
      />
    </div>
  );
}
