"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ChevronsDownUp, ChevronsUpDown, Share2 } from "lucide-react";
import { cn, scrollToTarget, toast, useT } from "@educloud/ui";

/**
 * Sticky links to the parts of a course page. The one whose section is on
 * screen is highlighted (with a sliding pill), so long pages stay easy to
 * find your way around.
 */
export function SectionNav({ sections }: { sections: { id: string; label: string }[] }) {
  const t = useT();
  const [active, setActive] = useState(sections[0]?.id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      // A band across the upper middle of the screen decides which section is "current".
      { rootMargin: "-30% 0px -60% 0px" },
    );
    for (const { id } of sections) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav aria-label={t("On this page")} className="sticky top-2 z-20 -mx-4 border-b border-line bg-surface/95 px-4 shadow-[var(--shadow-soft)] backdrop-blur-xl sm:-mx-6 sm:px-6 lg:mx-0 lg:rounded-2xl lg:border lg:px-2">
      <ul className="flex gap-1 overflow-x-auto py-2 [scrollbar-width:none]">
        {sections.map((s) => (
          <li key={s.id} className="shrink-0">
            <a
              href={`#${s.id}`}
              onClick={(e) => {
                e.preventDefault();
                scrollToTarget(`#${s.id}`, -140);
              }}
              aria-current={active === s.id ? "location" : undefined}
              className={cn("relative block rounded-full px-4 py-2 text-sm font-semibold transition-colors", active === s.id ? "text-white" : "text-ink-muted hover:text-ink")}
            >
              {active === s.id && <motion.span layoutId="course-section-pill" className="absolute inset-0 rounded-full bg-brand-600" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <span className="relative">{s.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Opens or closes every curriculum section (the <details> inside `target`) at once. */
export function ExpandAllButton({ target }: { target: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        const next = !open;
        document.querySelectorAll<HTMLDetailsElement>(`#${target} details`).forEach((d) => (d.open = next));
        setOpen(next);
      }}
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-ink-muted transition-colors hover:border-brand-300 hover:text-brand-700 dark:hover:text-brand-300"
    >
      {open ? <ChevronsDownUp className="h-4 w-4" /> : <ChevronsUpDown className="h-4 w-4" />}
      {open ? t("Collapse all") : t("Expand all")}
    </button>
  );
}

/** Shares the page with the phone's share sheet, or copies the link elsewhere. */
export function ShareButton({ title, className }: { title: string; className?: string }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={async () => {
        const url = window.location.href;
        if (navigator.share) {
          await navigator.share({ title, url }).catch(() => {});
          return;
        }
        await navigator.clipboard.writeText(url);
        toast.success(t("Link copied"));
      }}
      className={cn("inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm font-semibold text-ink shadow-[var(--shadow-soft)] transition-colors hover:text-brand-700 dark:hover:text-brand-300", className)}
    >
      <Share2 className="h-4 w-4" /> {t("Share")}
    </button>
  );
}
