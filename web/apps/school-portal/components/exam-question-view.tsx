import { Fragment, type ReactNode } from "react";
import { ArrowLeftRight, CircleDot, Hash, ListChecks, ListOrdered, PenLine, TextCursorInput, ToggleLeft, Type } from "lucide-react";
import type { ExamItem, ExamQuestion, ExamQuestionResult, ExamQuestionType } from "@educloud/api-client";
import { Badge, cn, type Translate } from "@educloud/ui";
import { BLANK, choicesOf, itemsOf, sidesOf } from "./exam-draft";

/**
 * Shared pieces for online exams in the staff portal: the nine question
 * types, how a question looks to students, and how an answer or a key reads.
 */

export type QuestionLike = Pick<ExamQuestion, "type" | "prompt" | "options" | "answer">;

export function questionTypes(t: Translate): { type: ExamQuestionType; label: string; description: string; icon: ReactNode }[] {
  const icon = "h-4 w-4";
  return [
    { type: "single_choice", label: t("Single choice"), description: t("Pick one right answer from a list."), icon: <CircleDot className={icon} /> },
    { type: "multiple_choice", label: t("Multiple choice"), description: t("Several right answers, with partial credit."), icon: <ListChecks className={icon} /> },
    { type: "true_false", label: t("True or false"), description: t("A statement students judge true or false."), icon: <ToggleLeft className={icon} /> },
    { type: "short_answer", label: t("Short answer"), description: t("A word or phrase, matched against accepted answers."), icon: <Type className={icon} /> },
    { type: "numeric", label: t("Number"), description: t("A numeric answer, with an optional tolerance."), icon: <Hash className={icon} /> },
    { type: "fill_blanks", label: t("Fill in the blanks"), description: t("Text with gaps students complete."), icon: <TextCursorInput className={icon} /> },
    { type: "ordering", label: t("Put in order"), description: t("Arrange items in the right sequence."), icon: <ListOrdered className={icon} /> },
    { type: "matching", label: t("Matching"), description: t("Connect each item with its pair."), icon: <ArrowLeftRight className={icon} /> },
    { type: "essay", label: t("Essay"), description: t("A written answer you mark yourself."), icon: <PenLine className={icon} /> },
  ];
}

const textOf = (items: ExamItem[], id: unknown) => items.find((i) => String(i.id) === String(id))?.text ?? "—";
const strings = (value: unknown) => (Array.isArray(value) ? value.map((v) => String(v ?? "")) : []);

/** The prompt, with each [[blank]] drawn as a gap (or filled with `fill`). */
export function Prompt({ prompt, fill }: { prompt: string; fill?: (index: number) => ReactNode }) {
  const parts = prompt.split(BLANK);
  return (
    <p className="whitespace-pre-wrap font-medium leading-relaxed">
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part}
          {i < parts.length - 1 &&
            (fill ? fill(i) : <span className="mx-1 inline-block min-w-16 rounded-md border-b-2 border-dashed border-brand-500/60 bg-brand-500/5 px-2 align-baseline text-xs text-ink-muted">{i + 1}</span>)}
        </Fragment>
      ))}
    </p>
  );
}

const gap = "mx-1 inline-block rounded-md bg-surface-3 px-2 py-0.5 text-sm font-semibold";

/** Roughly what students see when they take the exam (inputs are inert). */
export function QuestionPreview({ question, t }: { question: QuestionLike; t: Translate }) {
  const box = "flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm";
  const answer = (question.answer ?? {}) as Record<string, unknown>;
  const body = (() => {
    switch (question.type) {
      case "single_choice":
      case "multiple_choice":
        return (
          <ul className="space-y-2">
            {choicesOf(question).map((c) => (
              <li key={c.id} className={box}>
                <span className={cn("h-4 w-4 shrink-0 border border-line", question.type === "single_choice" ? "rounded-full" : "rounded-[5px]")} />
                {c.text || "—"}
              </li>
            ))}
          </ul>
        );
      case "true_false":
        return (
          <div className="grid grid-cols-2 gap-2">
            {[t("True"), t("False")].map((label) => (
              <span key={label} className={cn(box, "justify-center font-semibold")}>
                {label}
              </span>
            ))}
          </div>
        );
      case "short_answer":
        return <div className={cn(box, "text-ink-muted")}>{t("Type your answer")}</div>;
      case "numeric":
        return <div className={cn(box, "w-40 text-ink-muted")}>0</div>;
      case "fill_blanks":
        return null;
      case "ordering":
        return (
          <ol className="space-y-2">
            {/* Students get the items shuffled. */}
            {[...itemsOf(question)].reverse().map((item, i) => (
              <li key={item.id} className={box}>
                <span className="grid h-6 w-6 place-items-center rounded-md bg-surface-3 text-xs font-bold">{i + 1}</span>
                {item.text || "—"}
              </li>
            ))}
          </ol>
        );
      case "matching": {
        const { left, right } = sidesOf(question);
        return (
          <ul className="space-y-2">
            {left.map((l) => (
              <li key={l.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <span className={box}>{l.text || "—"}</span>
                <ArrowLeftRight className="h-4 w-4 text-ink-muted" />
                <span className={cn(box, "text-ink-muted")}>{t("Choose a match ({count} options)", { count: right.length })}</span>
              </li>
            ))}
          </ul>
        );
      }
      case "essay":
        return <div className={cn(box, "h-24 items-start text-ink-muted")}>{t("Write your answer")}</div>;
    }
  })();

  return (
    <div className="space-y-3">
      <Prompt prompt={question.prompt || "…"} fill={question.type === "fill_blanks" ? (i) => <span className={cn(gap, "min-w-20 border border-line bg-surface text-ink-muted")}>{i + 1}</span> : undefined} />
      {body}
      {question.type === "short_answer" && answer.case_sensitive === true && <p className="text-xs text-ink-muted">{t("Capital letters matter.")}</p>}
    </div>
  );
}

/** A student's response, written out for the teacher. */
export function AnswerView({ question, response, t }: { question: QuestionLike; response: unknown; t: Translate }) {
  const empty = response === undefined || response === null || response === "" || (Array.isArray(response) && response.length === 0);
  if (empty) return <span className="text-ink-muted italic">{t("No answer")}</span>;

  switch (question.type) {
    case "single_choice":
      return <span>{textOf(choicesOf(question), response)}</span>;
    case "multiple_choice":
      return <List values={strings(response).map((id) => textOf(choicesOf(question), id))} />;
    case "true_false":
      return <span>{response === true || response === "true" || response === 1 ? t("True") : t("False")}</span>;
    case "short_answer":
    case "numeric":
      return <span>{String(response)}</span>;
    case "fill_blanks": {
      const values = strings(response);
      return <Prompt prompt={question.prompt} fill={(i) => <span className={gap}>{values[i]?.trim() || "—"}</span>} />;
    }
    case "ordering":
      return <List ordered values={strings(response).map((id) => textOf(itemsOf(question), id))} />;
    case "matching": {
      const { left, right } = sidesOf(question);
      const pairs = (typeof response === "object" ? response : {}) as Record<string, unknown>;
      return <Pairs rows={left.map((l) => [l.text, pairs[l.id] == null ? "—" : textOf(right, pairs[l.id])])} />;
    }
    case "essay":
      return <p className="whitespace-pre-wrap leading-relaxed">{String(response)}</p>;
  }
}

/** The answer key, written out for the teacher. */
export function KeyView({ question, t }: { question: QuestionLike; t: Translate }) {
  const key = (question.answer ?? {}) as Record<string, unknown>;
  switch (question.type) {
    case "single_choice":
      return <span>{textOf(choicesOf(question), key.correct)}</span>;
    case "multiple_choice":
      return <List values={strings(key.correct).map((id) => textOf(choicesOf(question), id))} />;
    case "true_false":
      return <span>{key.correct === true ? t("True") : key.correct === false ? t("False") : "—"}</span>;
    case "short_answer":
      return (
        <span>
          {strings(key.accepted).join(" · ") || "—"}
          {key.case_sensitive === true && <span className="text-ink-muted"> ({t("case-sensitive")})</span>}
        </span>
      );
    case "numeric":
      return (
        <span className="tabular-nums">
          {String(key.value ?? "—")}
          {Number(key.tolerance) > 0 && ` ± ${Number(key.tolerance)}`}
        </span>
      );
    case "fill_blanks": {
      const blanks = Array.isArray(key.blanks) ? key.blanks.map(strings) : [];
      return <Prompt prompt={question.prompt} fill={(i) => <span className={cn(gap, "bg-success/12 text-success")}>{blanks[i]?.join(" / ") || "—"}</span>} />;
    }
    case "ordering":
      return <List ordered values={strings(key.order).map((id) => textOf(itemsOf(question), id))} />;
    case "matching": {
      const { left, right } = sidesOf(question);
      const pairs = (key.pairs ?? {}) as Record<string, unknown>;
      return <Pairs rows={left.map((l) => [l.text, textOf(right, pairs[l.id])])} />;
    }
    case "essay":
      return key.rubric ? <p className="whitespace-pre-wrap">{String(key.rubric)}</p> : <span className="text-ink-muted italic">{t("No rubric")}</span>;
  }
}

function List({ values, ordered }: { values: string[]; ordered?: boolean }) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className={cn("space-y-0.5 ps-5", ordered ? "list-decimal" : "list-disc")}>
      {values.map((v, i) => (
        <li key={i}>{v}</li>
      ))}
    </Tag>
  );
}

function Pairs({ rows }: { rows: [string, string][] }) {
  return (
    <ul className="space-y-1">
      {rows.map(([left, right], i) => (
        <li key={i} className="flex flex-wrap items-center gap-2">
          <span>{left}</span>
          <ArrowLeftRight className="h-3.5 w-3.5 text-ink-muted" />
          <span className="font-medium">{right}</span>
        </li>
      ))}
    </ul>
  );
}

export function OutcomeBadge({ result, t }: { result: ExamQuestionResult | null | undefined; t: Translate }) {
  if (!result) return <Badge>{t("Not marked")}</Badge>;
  const tone = { correct: "success", partial: "warning", incorrect: "danger", unanswered: "neutral", pending: "brand" } as const;
  const label = { correct: t("Correct"), partial: t("Partly right"), incorrect: t("Incorrect"), unanswered: t("Unanswered"), pending: t("Needs marking") };
  return <Badge tone={tone[result.outcome]}>{label[result.outcome]}</Badge>;
}
