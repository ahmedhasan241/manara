"use client";

import { Children, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "./components";
import { useT } from "./i18n-provider";

/**
 * A list that shows its first few items and folds the rest behind a
 * "Show all" button, so one long list can't push the rest of a page away.
 */
export function ShowMore({ children, initial = 5, className, as: List = "ul" }: { children: ReactNode; initial?: number; className?: string; as?: "ul" | "ol" | "div" }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const items = Children.toArray(children);
  const hidden = items.length - initial;

  return (
    <>
      <List className={className}>{open || hidden <= 0 ? items : items.slice(0, initial)}</List>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-2 text-sm font-semibold text-brand-700 transition hover:border-brand-300 hover:bg-brand-500/5 dark:text-brand-300"
        >
          {open ? t("Show fewer") : t("Show all ({count})", { count: items.length })}
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </button>
      )}
    </>
  );
}
