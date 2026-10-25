"use client";

import { useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Search, SearchX } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, cn, useT } from "@educloud/ui";

export interface HelpTopic {
  id: string;
  title: string;
  icon: ReactNode;
  items: { question: string; answer: string }[];
}

/**
 * Help topics as cards that jump to their questions, plus a search box that
 * filters every answer as you type (matching questions and answers).
 */
export function HelpCenter({ topics, footer }: { topics: HelpTopic[]; footer?: ReactNode }) {
  const t = useT();
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();

  const shown = useMemo(
    () =>
      topics
        .map((topic) => ({ ...topic, items: needle ? topic.items.filter((i) => `${i.question} ${i.answer}`.toLowerCase().includes(needle)) : topic.items }))
        .filter((topic) => topic.items.length > 0),
    [topics, needle],
  );

  return (
    <>
      <div className="relative mx-auto -mt-7 max-w-2xl px-4">
        <label className="flex items-center gap-3 rounded-full border border-line bg-surface p-2 ps-5 shadow-[var(--shadow-lift)] focus-within:border-brand-300">
          <Search className="h-5 w-5 shrink-0 text-ink-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search for an answer…")}
            aria-label={t("Search for an answer…")}
            className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-ink-muted/70"
          />
        </label>
      </div>

      {!needle && (
        <div className="mx-auto mt-12 grid max-w-6xl grid-cols-2 gap-4 px-4 md:grid-cols-4">
          {topics.map((topic) => (
            <a key={topic.id} href={`#${topic.id}`} className="lift press group flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-5 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600 transition-colors duration-300 group-hover:bg-brand-600 group-hover:text-white dark:bg-brand-900/40 dark:text-brand-300 [&_svg]:h-5 [&_svg]:w-5">{topic.icon}</span>
              <span className="font-semibold">{topic.title}</span>
              <span className="text-xs text-ink-muted">{t("{count} answers", { count: topic.items.length })}</span>
            </a>
          ))}
        </div>
      )}

      <div className="mx-auto mt-12 max-w-3xl space-y-10 px-4">
        <AnimatePresence mode="popLayout" initial={false}>
          {shown.map((topic) => (
            <motion.section key={topic.id} id={topic.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="scroll-mt-28">
              <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-bold">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300 [&_svg]:h-4 [&_svg]:w-4">{topic.icon}</span>
                {topic.title}
              </h2>
              <Accordion type="multiple" defaultValue={needle ? topic.items.map((i) => i.question) : []} key={needle ? "search" : "browse"} className="rounded-[var(--radius-card)] border border-line bg-surface px-4 sm:px-6">
                {topic.items.map((item) => (
                  <AccordionItem key={item.question} value={item.question} className="last:border-b-0">
                    <AccordionTrigger className="text-start sm:text-base">{item.question}</AccordionTrigger>
                    <AccordionContent className="leading-relaxed text-ink-muted sm:text-[0.9375rem]">{item.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.section>
          ))}
        </AnimatePresence>
        {shown.length === 0 && (
          <p className={cn("flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-dashed border-line bg-surface p-10 text-center text-ink-muted")}>
            <SearchX className="h-8 w-8 text-brand-400" />
            {t("No answers match your search.")}
          </p>
        )}
        {footer}
      </div>
    </>
  );
}
