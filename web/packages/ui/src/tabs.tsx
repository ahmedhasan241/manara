"use client";

import Link from "next/link";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "./components";
import { useT } from "./i18n-provider";

/**
 * Link-based tabs with a sliding indicator. Each tab is a URL, so tabs are
 * shareable and work without JavaScript.
 */
export function Tabs({ tabs, active, id = "tabs" }: { tabs: { key: string; label: string; href: string; icon?: ReactNode; count?: number }[]; active: string; id?: string }) {
  const t = useT();
  return (
    <nav aria-label={t("Sections")} className="mb-8 overflow-x-auto">
      <div className="inline-flex min-w-full gap-1 rounded-2xl border border-line bg-surface p-1.5 shadow-[var(--shadow-soft)] sm:min-w-0">
        {tabs.map((tab) => {
          const selected = tab.key === active;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              scroll={false}
              aria-current={selected ? "page" : undefined}
              className={cn(
                "relative flex h-10 items-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition-colors",
                selected ? "text-white" : "text-ink-muted hover:text-ink",
              )}
            >
              {selected && (
                <motion.span
                  layoutId={`${id}-indicator`}
                  className="fill-brand absolute inset-0 rounded-xl shadow-[var(--shadow-soft)]"
                  transition={{ type: "spring", stiffness: 400, damping: 34 }}
                />
              )}
              <span className="relative flex items-center gap-2">
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={cn("rounded-full px-1.5 text-[11px]", selected ? "bg-white/25" : "bg-surface-3")}>{tab.count}</span>
                )}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
