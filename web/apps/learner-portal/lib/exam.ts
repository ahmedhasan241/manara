import { AlignLeft, ArrowDownUp, CheckSquare, CircleDot, Hash, Link2, ListChecks, TextCursorInput, ToggleLeft, type LucideIcon } from "lucide-react";
import type { ExamAttempt, ExamItem, ExamQuestionType } from "@educloud/api-client";
import type { MessageKey } from "@educloud/ui";

/*
 * Shared helpers for online exams: friendly names and icons per question
 * type, typed access to each type's options, and whether a response counts
 * as answered (the same rule the API's grader uses).
 */

export const QUESTION_TYPES: Record<ExamQuestionType, { label: MessageKey; hint: MessageKey; icon: LucideIcon }> = {
  single_choice: { label: "Single choice", hint: "Pick one answer", icon: CircleDot },
  multiple_choice: { label: "Multiple choice", hint: "Pick every answer that applies", icon: ListChecks },
  true_false: { label: "True or false", hint: "Decide if the statement is true", icon: ToggleLeft },
  short_answer: { label: "Short answer", hint: "Type a word or a short phrase", icon: TextCursorInput },
  numeric: { label: "Number", hint: "Type a number", icon: Hash },
  fill_blanks: { label: "Fill in the blanks", hint: "Complete each gap in the text", icon: CheckSquare },
  ordering: { label: "Put in order", hint: "Arrange the items in the right order", icon: ArrowDownUp },
  matching: { label: "Matching", hint: "Pair each item with its match", icon: Link2 },
  essay: { label: "Essay", hint: "Write your answer in your own words", icon: AlignLeft },
};

export type AttemptQuestion = ExamAttempt["questions"][number];
export type Answers = Record<string, unknown>;

/** Choices of a single/multiple choice question. */
export function choiceOptions(q: Pick<AttemptQuestion, "options">): ExamItem[] {
  return Array.isArray(q.options) ? q.options : [];
}

export function orderingItems(q: Pick<AttemptQuestion, "options">): ExamItem[] {
  const o = q.options;
  return o && !Array.isArray(o) && "items" in o ? o.items : [];
}

export function matchingSides(q: Pick<AttemptQuestion, "options">): { left: ExamItem[]; right: ExamItem[] } {
  const o = q.options;
  return o && !Array.isArray(o) && "left" in o ? { left: o.left, right: o.right } : { left: [], right: [] };
}

export const BLANK = "[[blank]]";

/** The prompt of a fill-in-the-blanks question split around its "[[blank]]" markers. */
export function blankParts(prompt: string): string[] {
  return prompt.split(BLANK);
}

export function blankCount(prompt: string) {
  return Math.max(0, blankParts(prompt).length - 1);
}

/** True when the student has given some response (mirrors ExamGrader::isBlank). */
export function isAnswered(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.some((v) => v !== null && v !== undefined && String(v).trim() !== "");
  if (typeof value === "object") return Object.values(value as object).some((v) => v !== null && v !== undefined && v !== "");
  if (typeof value === "string") return value.trim() !== "";
  return true;
}

export function wordCount(text: string) {
  const words = text.trim().match(/\S+/g);
  return words ? words.length : 0;
}

export const pct = (score: string | number | null, max: string | number) => (score == null || Number(max) <= 0 ? null : Math.round((Number(score) / Number(max)) * 1000) / 10);

export const num = (value: string | number | null | undefined) => (value == null ? "—" : String(Number(value)));
