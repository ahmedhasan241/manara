"use client";

import { motion } from "motion/react";
import type { LearnerChild } from "@educloud/api-client";
import { Avatar, cn, firstName, useT } from "@educloud/ui";
import { selectChild } from "@/app/actions";
import { useMutation } from "@/components/use-mutation";

/**
 * Parents with several children switch the whole portal between them.
 */
export function ChildSwitcher({ kids }: { kids: LearnerChild[] }) {
  const t = useT();
  const { run, pending } = useMutation();

  return (
    <div className="glass sticky top-0 z-20 border-b border-line max-lg:top-16">
      <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-x-auto px-4 py-2.5 sm:px-8" role="radiogroup" aria-label={t("Choose a child")}>
        <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">{t("Viewing")}</span>
        {kids.map((child) => (
          <button
            key={child.id}
            type="button"
            role="radio"
            aria-checked={child.selected}
            disabled={pending}
            onClick={() => !child.selected && run(() => selectChild(child.id), { success: t("Now viewing {name}.", { name: firstName(child.name) }) })}
            className={cn(
              "relative flex shrink-0 items-center gap-2 rounded-full py-1 pe-4 ps-1 text-sm font-semibold transition-colors",
              child.selected ? "text-white" : "text-ink-muted hover:bg-surface-3 hover:text-ink",
              pending && "opacity-70",
            )}
          >
            {child.selected && (
              <motion.span layoutId="child-pill" className="absolute inset-0 rounded-full bg-brand-600" transition={{ type: "spring", stiffness: 400, damping: 34 }} />
            )}
            <Avatar name={child.name} size="sm" className="relative h-7 w-7" />
            <span className="relative max-w-40 truncate">{firstName(child.name)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
