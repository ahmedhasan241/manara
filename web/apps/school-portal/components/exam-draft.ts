import type { ExamDefinition, ExamItem, ExamQuestion, ExamQuestionType, ExamResultsVisibility } from "@educloud/api-client";
import type { Translate } from "@educloud/ui";

/**
 * The exam builder's editing model, kept free of React so it can be checked
 * on its own: a question as a flat draft, back and forth to the API shape,
 * and the same checks the API makes.
 */

export const BLANK = "[[blank]]";
export const countBlanks = (prompt: string) => prompt.split(BLANK).length - 1;

export function choicesOf(q: Pick<ExamQuestion, "options">): ExamItem[] {
  return Array.isArray(q.options) ? q.options : [];
}

export function itemsOf(q: Pick<ExamQuestion, "options">): ExamItem[] {
  return q.options && !Array.isArray(q.options) && "items" in q.options ? q.options.items : [];
}

export function sidesOf(q: Pick<ExamQuestion, "options">): { left: ExamItem[]; right: ExamItem[] } {
  return q.options && !Array.isArray(q.options) && "left" in q.options ? q.options : { left: [], right: [] };
}

export const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(16).slice(2) + "00000000").slice(0, 8);
export const item = (text = ""): ExamItem => ({ id: uid(), text });

/** One question while it is being edited: every type's fields side by side, so switching nothing is lost. */
export interface Draft {
  key: string;
  id?: string;
  type: ExamQuestionType;
  prompt: string;
  points: string;
  explanation: string;
  choices: ExamItem[];
  correct: string[];
  truth: boolean | null;
  accepted: string[];
  caseSensitive: boolean;
  value: string;
  tolerance: string;
  blanks: string[][];
  items: ExamItem[];
  pairs: { left: ExamItem; right: ExamItem }[];
  extras: ExamItem[];
  rubric: string;
}

export function blankDraft(type: ExamQuestionType): Draft {
  return {
    key: uid(),
    type,
    prompt: "",
    points: "1",
    explanation: "",
    choices: [item(), item()],
    correct: [],
    truth: null,
    accepted: [],
    caseSensitive: false,
    value: "",
    tolerance: "",
    blanks: [],
    items: [item(), item()],
    pairs: [
      { left: item(), right: item() },
      { left: item(), right: item() },
    ],
    extras: [],
    rubric: "",
  };
}

const strings = (value: unknown) => (Array.isArray(value) ? value.map((v) => String(v ?? "")) : []);

export function fromQuestion(q: ExamQuestion): Draft {
  const d = blankDraft(q.type);
  const key = (q.answer ?? {}) as Record<string, unknown>;
  d.key = q.id ?? d.key;
  d.id = q.id;
  d.prompt = q.prompt;
  d.points = String(Number(q.points));
  d.explanation = q.explanation ?? "";
  switch (q.type) {
    case "single_choice":
    case "multiple_choice":
      d.choices = choicesOf(q).map((c) => ({ id: String(c.id), text: c.text }));
      d.correct = q.type === "single_choice" ? (key.correct != null ? [String(key.correct)] : []) : strings(key.correct);
      break;
    case "true_false":
      d.truth = typeof key.correct === "boolean" ? key.correct : null;
      break;
    case "short_answer":
      d.accepted = strings(key.accepted).filter((a) => a.trim());
      d.caseSensitive = key.case_sensitive === true;
      break;
    case "numeric":
      d.value = key.value == null ? "" : String(key.value);
      d.tolerance = key.tolerance == null || Number(key.tolerance) === 0 ? "" : String(key.tolerance);
      break;
    case "fill_blanks":
      d.blanks = Array.isArray(key.blanks) ? key.blanks.map(strings) : [];
      d.blanks = resize(d.blanks, countBlanks(q.prompt));
      break;
    case "ordering": {
      // The builder lists items in the correct order.
      const order = strings(key.order);
      d.items = [...itemsOf(q)].sort((a, b) => order.indexOf(String(a.id)) - order.indexOf(String(b.id)));
      break;
    }
    case "matching": {
      const { left, right } = sidesOf(q);
      const pairs = (key.pairs ?? {}) as Record<string, unknown>;
      d.pairs = left.map((l) => ({ left: l, right: right.find((r) => String(r.id) === String(pairs[l.id])) ?? item() }));
      const used = new Set(d.pairs.map((p) => p.right.id));
      d.extras = right.filter((r) => !used.has(r.id));
      break;
    }
    case "essay":
      d.rubric = typeof key.rubric === "string" ? key.rubric : "";
      break;
  }
  return d;
}

export function toQuestion(d: Draft): ExamQuestion {
  const base = { ...(d.id ? { id: d.id } : {}), type: d.type, prompt: d.prompt.trim(), points: Number(d.points || 0), explanation: d.explanation.trim() || null };
  switch (d.type) {
    case "single_choice":
      return { ...base, options: d.choices, answer: { correct: d.correct[0] ?? null } };
    case "multiple_choice":
      return { ...base, options: d.choices, answer: { correct: d.correct } };
    case "true_false":
      return { ...base, options: null, answer: { correct: d.truth } };
    case "short_answer":
      return { ...base, options: null, answer: { accepted: d.accepted, case_sensitive: d.caseSensitive } };
    case "numeric":
      return { ...base, options: null, answer: { value: d.value.trim() === "" ? null : Number(d.value), ...(d.tolerance.trim() ? { tolerance: Number(d.tolerance) } : {}) } };
    case "fill_blanks":
      return { ...base, options: null, answer: { blanks: d.blanks } };
    case "ordering":
      return { ...base, options: { items: d.items }, answer: { order: d.items.map((i) => i.id) } };
    case "matching":
      return {
        ...base,
        options: { left: d.pairs.map((p) => p.left), right: [...d.pairs.map((p) => p.right), ...d.extras] },
        answer: { pairs: Object.fromEntries(d.pairs.map((p) => [p.left.id, p.right.id])) },
      };
    case "essay":
      return { ...base, options: null, answer: d.rubric.trim() ? { rubric: d.rubric.trim() } : null };
  }
}

export function resize(blanks: string[][], count: number) {
  return Array.from({ length: count }, (_, i) => blanks[i] ?? []);
}

/** Mirrors the API's checks so problems show before saving. */
export function validate(d: Draft, t: Translate): string | null {
  if (!d.prompt.trim()) return t("Write the question.");
  if (d.points.trim() === "" || !Number.isFinite(Number(d.points)) || Number(d.points) < 0 || Number(d.points) > 1000) return t("Points must be a number from 0 to 1000.");
  const filled = (items: ExamItem[]) => items.every((i) => i.text.trim());
  switch (d.type) {
    case "single_choice":
    case "multiple_choice":
      if (d.choices.length < 2 || !filled(d.choices)) return t("Add at least two choices and fill them in.");
      if (!d.correct.some((id) => d.choices.some((c) => c.id === id))) return d.type === "single_choice" ? t("Mark the right choice.") : t("Mark at least one right choice.");
      return null;
    case "true_false":
      return d.truth === null ? t("Choose whether the statement is true or false.") : null;
    case "short_answer":
      return d.accepted.length === 0 ? t("Add at least one accepted answer.") : null;
    case "numeric":
      if (d.value.trim() === "" || !Number.isFinite(Number(d.value))) return t("Enter the correct number.");
      if (d.tolerance.trim() && (!Number.isFinite(Number(d.tolerance)) || Number(d.tolerance) < 0)) return t("Tolerance must be 0 or more.");
      return null;
    case "fill_blanks":
      if (countBlanks(d.prompt) === 0) return t("Insert at least one blank into the text.");
      if (d.blanks.some((b) => b.length === 0)) return t("Give at least one accepted answer for each blank.");
      return null;
    case "ordering":
      return d.items.length < 2 || !filled(d.items) ? t("Add at least two items and fill them in.") : null;
    case "matching":
      return d.pairs.length < 2 || !filled(d.pairs.flatMap((p) => [p.left, p.right])) || !filled(d.extras) ? t("Add at least two pairs and fill in both sides.") : null;
    case "essay":
      return null;
  }
}

export interface Settings {
  timeLimit: string;
  maxAttempts: number;
  shuffle: boolean;
  visibility: ExamResultsVisibility;
  instructions: string;
}

export function validateSettings(s: Settings, t: Translate): string | null {
  if (s.timeLimit.trim() === "") return null;
  const minutes = Number(s.timeLimit);
  return Number.isInteger(minutes) && minutes >= 1 && minutes <= 600 ? null : t("Use a whole number of minutes from 1 to 600, or leave it empty.");
}

export function payloadOf(settings: Settings, drafts: Draft[]) {
  return {
    time_limit_minutes: settings.timeLimit.trim() ? Number(settings.timeLimit) : null,
    max_attempts: settings.maxAttempts,
    shuffle_questions: settings.shuffle,
    results_visibility: settings.visibility,
    instructions: settings.instructions.trim() || null,
    questions: drafts.map(toQuestion),
  };
}

export const settingsOf = (exam: ExamDefinition): Settings => ({
  timeLimit: exam.time_limit_minutes ? String(exam.time_limit_minutes) : "",
  maxAttempts: exam.max_attempts || 1,
  shuffle: exam.shuffle_questions,
  visibility: exam.results_visibility,
  instructions: exam.instructions ?? "",
});
