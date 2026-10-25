"use client";

import { Fragment, useState } from "react";
import { ArrowDown, ArrowUp, Check, GripVertical } from "lucide-react";
import { Input, Select, Textarea, cn, useT } from "@educloud/ui";
import { blankCount, blankParts, choiceOptions, matchingSides, orderingItems, wordCount, type AttemptQuestion } from "@/lib/exam";

/*
 * The answer controls for each of the nine question types. Each one reports
 * the response in exactly the shape the API's ExamGrader expects.
 */

interface Props {
  question: AttemptQuestion;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function QuestionInput(props: Props) {
  switch (props.question.type) {
    case "single_choice":
      return <SingleChoice {...props} />;
    case "multiple_choice":
      return <MultipleChoice {...props} />;
    case "true_false":
      return <TrueFalse {...props} />;
    case "short_answer":
      return <ShortAnswer {...props} />;
    case "numeric":
      return <NumericAnswer {...props} />;
    case "fill_blanks":
      return <FillBlanks {...props} />;
    case "ordering":
      return <Ordering {...props} />;
    case "matching":
      return <Matching {...props} />;
    case "essay":
      return <Essay {...props} />;
    default:
      return null;
  }
}

/** Fill-in-the-blanks questions show their prompt inside the answer control. */
export const promptInsideInput = (q: AttemptQuestion) => q.type === "fill_blanks";

const optionClass = (selected: boolean) =>
  cn(
    "group flex w-full cursor-pointer items-center gap-3 rounded-2xl border bg-surface px-4 py-3.5 text-start text-[0.95rem] transition-colors duration-150",
    "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-500",
    selected ? "border-brand-500 bg-brand-600/[0.06] shadow-[var(--shadow-soft)]" : "border-line hover:border-brand-300 hover:bg-surface-2",
  );

const letter = (i: number) => String.fromCharCode(65 + i);

function Marker({ selected, round, index }: { selected: boolean; round: boolean; index: number }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid h-7 w-7 shrink-0 place-items-center border text-xs font-semibold transition-colors",
        round ? "rounded-full" : "rounded-lg",
        selected ? "border-brand-600 bg-brand-600 text-white dark:border-brand-400 dark:bg-brand-400 dark:text-nav" : "border-line bg-surface-2 text-ink-muted group-hover:border-brand-300",
      )}
    >
      {selected ? <Check className="h-4 w-4" strokeWidth={3} /> : letter(index)}
    </span>
  );
}

function SingleChoice({ question, value, onChange }: Props) {
  const t = useT();
  return (
    <div role="radiogroup" aria-label={t("Your answer")} className="space-y-2.5">
      {choiceOptions(question).map((option, i) => {
        const selected = String(value ?? "") === String(option.id);
        return (
          <label key={option.id} className={optionClass(selected)}>
            <input type="radio" name={`q-${question.id}`} className="sr-only" checked={selected} onChange={() => onChange(option.id)} />
            <Marker selected={selected} round index={i} />
            <span className="min-w-0 flex-1 whitespace-pre-line">{option.text}</span>
          </label>
        );
      })}
    </div>
  );
}

function MultipleChoice({ question, value, onChange }: Props) {
  const t = useT();
  const chosen = Array.isArray(value) ? value.map(String) : [];
  const toggle = (id: string) => onChange(chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id]);
  return (
    <div role="group" aria-label={t("Your answer")} className="space-y-2.5">
      <p className="text-xs font-medium text-ink-muted">{t("Select all that apply.")}</p>
      {choiceOptions(question).map((option, i) => {
        const selected = chosen.includes(String(option.id));
        return (
          <label key={option.id} className={optionClass(selected)}>
            <input type="checkbox" className="sr-only" checked={selected} onChange={() => toggle(String(option.id))} />
            <Marker selected={selected} round={false} index={i} />
            <span className="min-w-0 flex-1 whitespace-pre-line">{option.text}</span>
          </label>
        );
      })}
    </div>
  );
}

function TrueFalse({ question, value, onChange }: Props) {
  const t = useT();
  return (
    <div role="radiogroup" aria-label={t("Your answer")} className="grid grid-cols-2 gap-3">
      {[
        { v: true, label: t("True") },
        { v: false, label: t("False") },
      ].map(({ v, label }) => {
        const selected = value === v;
        return (
          <label key={label} className={cn(optionClass(selected), "justify-center py-5 font-display text-lg font-semibold")}>
            <input type="radio" name={`q-${question.id}`} className="sr-only" checked={selected} onChange={() => onChange(v)} />
            {selected && <Check className="h-5 w-5 text-brand-600 dark:text-brand-300" strokeWidth={3} />}
            {label}
          </label>
        );
      })}
    </div>
  );
}

function ShortAnswer({ question, value, onChange }: Props) {
  const t = useT();
  return (
    <Input
      aria-label={t("Your answer")}
      placeholder={t("Type your answer")}
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value)}
      maxLength={500}
      autoComplete="off"
      spellCheck={false}
      className="h-12 text-base"
      id={`q-${question.id}-input`}
    />
  );
}

function NumericAnswer({ question, value, onChange }: Props) {
  const t = useT();
  const text = value == null ? "" : String(value);
  const invalid = text.trim() !== "" && !/^\s*[-+]?(\d+([.,]\d*)?|[.,]\d+)(e[-+]?\d+)?\s*$/i.test(text);
  return (
    <div className="max-w-xs">
      <Input
        aria-label={t("Your answer")}
        placeholder={t("Type a number")}
        inputMode="decimal"
        autoComplete="off"
        value={text}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid || undefined}
        className={cn("h-12 text-base tabular-nums", invalid && "border-warning")}
        id={`q-${question.id}-input`}
      />
      {invalid && <p className="mt-1.5 text-xs text-warning">{t("That doesn't look like a number.")}</p>}
    </div>
  );
}

function FillBlanks({ question, value, onChange }: Props) {
  const t = useT();
  const parts = blankParts(question.prompt);
  const count = blankCount(question.prompt);
  const values = Array.from({ length: count }, (_, i) => (Array.isArray(value) ? String(value[i] ?? "") : ""));
  const set = (i: number, text: string) => onChange(values.map((v, j) => (j === i ? text : v)));

  return (
    <p className="whitespace-pre-line font-display text-lg leading-[2.6rem] sm:text-xl">
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part}
          {i < count && (
            <input
              aria-label={t("Blank {number}", { number: i + 1 })}
              value={values[i]}
              onChange={(e) => set(i, e.target.value)}
              autoComplete="off"
              spellCheck={false}
              size={Math.max(6, Math.min(24, values[i]!.length + 2))}
              className="mx-1 inline-block h-10 rounded-lg border-0 border-b-2 border-brand-400 bg-brand-600/[0.06] px-2 text-center font-sans text-base font-medium text-ink outline-none transition-colors placeholder:text-ink-muted/60 focus:border-brand-600 focus:bg-brand-600/10 dark:border-brand-500"
              placeholder={String(i + 1)}
            />
          )}
        </Fragment>
      ))}
    </p>
  );
}

function Ordering({ question, value, onChange }: Props) {
  const t = useT();
  const items = orderingItems(question);
  const byId = new Map(items.map((item) => [String(item.id), item]));
  const touched = Array.isArray(value) && value.length > 0;
  // Saved order first (ignoring unknown ids), then anything missing in the given order.
  const order = touched ? [...(value as unknown[]).map(String).filter((id) => byId.has(id)), ...items.map((i) => String(i.id)).filter((id) => !(value as unknown[]).map(String).includes(id))] : items.map((i) => String(i.id));
  const [dragging, setDragging] = useState<string | null>(null);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    const [id] = next.splice(from, 1);
    next.splice(to, 0, id!);
    onChange(next);
  };

  return (
    <div>
      <p className="mb-2.5 text-xs font-medium text-ink-muted">{touched ? t("Drag the items or use the arrows to change the order.") : t("Drag the items or use the arrows. Your answer is saved once you change the order.")}</p>
      <ol className="space-y-2">
        {order.map((id, i) => {
          const item = byId.get(id)!;
          return (
            <li
              key={id}
              draggable
              onDragStart={(e) => {
                setDragging(id);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", id);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragging && dragging !== id) move(order.indexOf(dragging), i);
              }}
              onDragEnd={() => setDragging(null)}
              onDrop={(e) => e.preventDefault()}
              className={cn(
                "flex items-center gap-3 rounded-2xl border bg-surface px-3 py-2.5 transition-[box-shadow,opacity,border-color]",
                dragging === id ? "border-brand-500 opacity-60 shadow-[var(--shadow-lift)]" : "border-line",
              )}
            >
              <GripVertical aria-hidden className="h-5 w-5 shrink-0 cursor-grab text-ink-muted active:cursor-grabbing" />
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-3 text-xs font-bold tabular-nums">{i + 1}</span>
              <span className="min-w-0 flex-1 whitespace-pre-line">{item.text}</span>
              <span className="flex shrink-0 gap-1">
                <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={t("Move up")} className="grid h-9 w-9 place-items-center rounded-lg text-ink-muted hover:bg-surface-3 hover:text-ink disabled:opacity-30">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => move(i, i + 1)} disabled={i === order.length - 1} aria-label={t("Move down")} className="grid h-9 w-9 place-items-center rounded-lg text-ink-muted hover:bg-surface-3 hover:text-ink disabled:opacity-30">
                  <ArrowDown className="h-4 w-4" />
                </button>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Matching({ question, value, onChange }: Props) {
  const t = useT();
  const { left, right } = matchingSides(question);
  const pairs = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, string>) : {};
  const used = new Set(Object.values(pairs).map(String));

  return (
    <div className="space-y-2.5">
      <p className="text-xs font-medium text-ink-muted">{t("Choose the match for each item.")}</p>
      {left.map((item) => {
        const current = pairs[item.id] != null ? String(pairs[item.id]) : "";
        return (
          <div key={item.id} className={cn("grid grid-cols-1 items-center gap-2 rounded-2xl border bg-surface p-3 sm:grid-cols-[1fr_auto_1fr] sm:gap-3", current ? "border-brand-300 dark:border-brand-700" : "border-line")}>
            <span className="whitespace-pre-line font-medium">{item.text}</span>
            <span aria-hidden className="hidden text-ink-muted sm:block">→</span>
            <Select
              aria-label={t("Match for {item}", { item: item.text })}
              value={current}
              onChange={(e) => {
                const next = { ...pairs };
                if (e.target.value) next[item.id] = e.target.value;
                else delete next[item.id];
                onChange(next);
              }}
              className="h-11"
            >
              <option value="">{t("Choose…")}</option>
              {right.map((r) => (
                <option key={r.id} value={r.id}>
                  {used.has(String(r.id)) && String(r.id) !== current ? `✓ ${r.text}` : r.text}
                </option>
              ))}
            </Select>
          </div>
        );
      })}
    </div>
  );
}

function Essay({ question, value, onChange }: Props) {
  const t = useT();
  const text = typeof value === "string" ? value : "";
  const words = wordCount(text);
  return (
    <div>
      <Textarea
        aria-label={t("Your answer")}
        placeholder={t("Write your answer here…")}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        rows={12}
        className="min-h-[16rem] text-base leading-relaxed"
        id={`q-${question.id}-input`}
      />
      <p className="mt-1.5 text-end text-xs tabular-nums text-ink-muted">{t("Words: {count}", { count: words })}</p>
    </div>
  );
}
