"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Link2, Plus, Target, X } from "lucide-react";
import type { LessonPlan } from "@educloud/api-client";
import { Button, Field, Input, Textarea, useT } from "@educloud/ui";

/** An ISO time as a datetime-local value in the browser's time zone. */
function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

let nextKey = 0;
const keyed = <T,>(items: T[]) => items.map((value) => ({ key: nextKey++, value }));

/**
 * Lesson plan inputs: unit, objectives (add/remove), homework with a due
 * date, resource links and (after the lesson) a summary. Read them back with
 * planFromForm() from "./lesson-plan".
 */
export function LessonPlanFields({ plan, showSummary = false, withOffset = false, idPrefix = "plan" }: { plan?: Partial<LessonPlan>; showSummary?: boolean; withOffset?: boolean; idPrefix?: string }) {
  const t = useT();
  const [objectives, setObjectives] = useState(() => keyed(plan?.objectives?.length ? plan.objectives : [""]));
  const [resources, setResources] = useState(() => keyed(plan?.resources?.length ? plan.resources : []));
  const [due, setDue] = useState("");
  const [offset, setOffset] = useState(0);
  const id = (name: string) => `${idPrefix}-${name}`;

  // Local times depend on the browser's time zone, so set them after hydration.
  useEffect(() => {
    setOffset(new Date().getTimezoneOffset());
    setDue(toLocalInput(plan?.homework_due_at));
  }, [plan?.homework_due_at]);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {withOffset && <input type="hidden" name="tz_offset" value={offset} />}
      <div className="sm:col-span-2">
        <Field label={t("Unit or chapter")} htmlFor={id("unit")}>
          <Input id={id("unit")} name="unit" defaultValue={plan?.unit ?? ""} placeholder={t("e.g. Unit 3 — Quadratic equations")} />
        </Field>
      </div>

      <fieldset className="space-y-2 sm:col-span-2">
        <legend className="mb-1.5 text-sm font-medium">{t("Learning objectives")}</legend>
        <AnimatePresence initial={false}>
          {objectives.map((o, i) => (
            <motion.div key={o.key} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2">
              <Target className="h-4 w-4 shrink-0 text-brand-500" aria-hidden />
              <Input
                name="objectives"
                aria-label={t("Objective {number}", { number: i + 1 })}
                defaultValue={o.value}
                placeholder={i === 0 ? t("Students can solve a quadratic by factoring") : t("Another objective")}
              />
              <button
                type="button"
                onClick={() => setObjectives((list) => (list.length > 1 ? list.filter((x) => x.key !== o.key) : keyed([""])))}
                aria-label={t("Remove objective {number}", { number: i + 1 })}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-muted transition hover:bg-danger/10 hover:text-danger"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        <Button type="button" variant="ghost" size="sm" onClick={() => setObjectives((list) => [...list, ...keyed([""])])}>
          <Plus className="h-4 w-4" /> {t("Add objective")}
        </Button>
      </fieldset>

      <div className="sm:col-span-2">
        <Field label={t("Homework")} htmlFor={id("homework")}>
          <Textarea id={id("homework")} name="homework" rows={2} defaultValue={plan?.homework ?? ""} placeholder={t("e.g. Exercises 1–10 on page 42")} />
        </Field>
      </div>
      <Field label={t("Homework due")} htmlFor={id("due")}>
        <Input id={id("due")} name="homework_due_at" type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
      </Field>

      <fieldset className="space-y-2 sm:col-span-2">
        <legend className="mb-1.5 text-sm font-medium">{t("Resources")}</legend>
        <AnimatePresence initial={false}>
          {resources.map((r, i) => (
            <motion.div key={r.key} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex flex-col gap-2 rounded-xl border border-line p-2 sm:flex-row sm:items-center sm:border-0 sm:p-0">
              <Link2 className="hidden h-4 w-4 shrink-0 text-brand-500 sm:block" aria-hidden />
              <Input name="resource_title" aria-label={t("Resource {number} title", { number: i + 1 })} defaultValue={r.value.title} placeholder={t("Title")} className="sm:w-56" />
              <div className="flex flex-1 items-center gap-2">
                <Input name="resource_url" type="url" aria-label={t("Resource {number} link", { number: i + 1 })} defaultValue={r.value.url} placeholder="https://" required />
                <button
                  type="button"
                  onClick={() => setResources((list) => list.filter((x) => x.key !== r.key))}
                  aria-label={t("Remove resource {number}", { number: i + 1 })}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-muted transition hover:bg-danger/10 hover:text-danger"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <Button type="button" variant="ghost" size="sm" onClick={() => setResources((list) => [...list, ...keyed([{ title: "", url: "" }])])}>
          <Plus className="h-4 w-4" /> {t("Add a link")}
        </Button>
      </fieldset>

      {showSummary && (
        <div className="sm:col-span-2">
          <Field label={t("What was covered")} htmlFor={id("summary")} hint={t("A short recap for students who missed the lesson.")}>
            <Textarea id={id("summary")} name="summary" rows={3} defaultValue={plan?.summary ?? ""} />
          </Field>
        </div>
      )}
    </div>
  );
}
