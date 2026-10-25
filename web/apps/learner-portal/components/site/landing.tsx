"use client";

import { useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring, type MotionValue } from "motion/react";
import { Check } from "lucide-react";
import { asKey, cn, useT } from "@educloud/ui";

/**
 * Popular courses with category chips: picking one filters the grid, and the
 * cards glide into their new places. Cards are rendered on the server and
 * passed in, so this only handles the filtering.
 */
export function CourseFilter({ items }: { items: { id: string; category: string | null; card: ReactNode }[] }) {
  const t = useT();
  const categories = Array.from(new Set(items.map((i) => i.category).filter((c): c is string => !!c))).slice(0, 6);
  const [active, setActive] = useState<string | null>(null);
  const shown = active ? items.filter((i) => i.category === active) : items;

  return (
    <div>
      {categories.length > 1 && (
        <div role="tablist" aria-label={t("Categories")} className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
          {[null, ...categories].map((c) => {
            const selected = active === c;
            return (
              <button
                key={c ?? "all"}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActive(c)}
                className={cn("relative shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors", selected ? "border-transparent text-white" : "border-line bg-surface text-ink-muted hover:border-brand-300 hover:text-ink")}
              >
                {selected && <motion.span layoutId="course-filter-pill" className="absolute inset-0 rounded-full bg-brand-600" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                <span className="relative">{c ? t(asKey(c)) : t("All")}</span>
              </button>
            );
          })}
        </div>
      )}
      <motion.div layout className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <AnimatePresence mode="popLayout" initial={false}>
          {shown.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              {item.card}
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/**
 * Three steps on one track. The track runs exactly through the centre of each
 * step's circle and fills from the reading side as the section scrolls by
 * (sideways on wide screens, downwards on phones); each step lights up when
 * the fill reaches it and gets a tick once it has been passed.
 */
export function HowItWorks({ steps }: { steps: { icon: ReactNode; title: string; body: string }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.75", "end 0.6"] });
  const fill = useSpring(scrollYProgress, { stiffness: 140, damping: 30 });
  const progress = reduce ? 1 : fill;
  // From the centre of the first column to the centre of the last.
  const edge = `${50 / steps.length}%`;

  return (
    <div ref={ref} className="relative">
      {/* Wide screens: a horizontal track through the circles' centres (circles are h-24, so 3rem down). */}
      <div aria-hidden className="absolute top-12 hidden h-1 -translate-y-1/2 md:block" style={{ insetInlineStart: edge, insetInlineEnd: edge }}>
        <div className="absolute inset-0 rounded-full border-t-2 border-dashed border-line" />
        <motion.div className="absolute inset-0 origin-left rounded-full bg-gradient-to-r from-brand-300 via-brand-500 to-brand-600 rtl:origin-right rtl:bg-gradient-to-l" style={{ scaleX: progress }} />
      </div>
      {/* Phones: the same track running down beside the steps. */}
      <div aria-hidden className="absolute bottom-24 start-12 top-12 w-1 -translate-x-1/2 md:hidden rtl:translate-x-1/2">
        <div className="absolute inset-0 rounded-full border-s-2 border-dashed border-line" />
        <motion.div className="absolute inset-0 origin-top rounded-full bg-gradient-to-b from-brand-300 via-brand-500 to-brand-600" style={{ scaleY: progress }} />
      </div>

      <ol className="relative grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6">
        {steps.map((step, i) => (
          <Step key={step.title} index={i} count={steps.length} progress={fill} still={!!reduce} {...step} />
        ))}
      </ol>
    </div>
  );
}

function Step({ index, count, progress, still, icon, title, body }: { index: number; count: number; progress: MotionValue<number>; still: boolean; icon: ReactNode; title: string; body: string }) {
  const at = count > 1 ? index / (count - 1) : 0;
  const [state, setState] = useState<"ahead" | "here" | "done">(still ? "done" : "ahead");
  useMotionValueEvent(progress, "change", (v) => {
    if (still) return;
    setState(v >= at + 0.25 / count ? "done" : v >= at - 0.04 ? "here" : "ahead");
  });
  const lit = state !== "ahead";

  return (
    <li className="flex items-start gap-5 md:flex-col md:items-center md:gap-6">
      {/* The circle sits on the track; a ring in the page colour cuts the line around it. */}
      <span className="relative grid h-24 w-24 shrink-0 place-items-center rounded-full bg-surface-2 ring-8 ring-surface-2">
        <span className={cn("absolute inset-0 rounded-full border-2 border-dashed transition-colors duration-500", lit ? "border-brand-400" : "border-line")} />
        {state === "here" && <span aria-hidden className="absolute inset-2 animate-ping rounded-full bg-brand-400/25 [animation-duration:1.8s]" />}
        <motion.span
          animate={{ scale: lit ? 1 : 0.86 }}
          transition={{ type: "spring", stiffness: 320, damping: 18 }}
          className={cn("relative grid h-16 w-16 place-items-center rounded-full shadow-[var(--shadow-soft)] transition-colors duration-500 [&_svg]:h-7 [&_svg]:w-7", lit ? "bg-brand-600 text-white shadow-[var(--shadow-glow)]" : "bg-surface text-ink-muted")}
        >
          {icon}
        </motion.span>
        <span className={cn("absolute -end-1 -top-1 grid h-8 w-8 place-items-center rounded-full font-display text-sm font-bold shadow-[var(--shadow-soft)] transition-colors duration-500", state === "done" ? "bg-success text-white" : lit ? "bg-nav text-white" : "bg-surface text-ink-muted")}>
          {state === "done" ? <Check className="h-4 w-4" strokeWidth={3} /> : index + 1}
        </span>
      </span>

      <div className={cn("relative w-full overflow-hidden rounded-[1.5rem] border bg-surface p-5 text-start transition-all duration-500 md:px-6 md:pb-7 md:pt-6 md:text-center", lit ? "border-brand-200 shadow-[var(--shadow-lift)] dark:border-brand-800" : "border-line shadow-[var(--shadow-soft)]")}>
        {/* Accent along the top edge, drawn in when the step is reached. */}
        <span aria-hidden className={cn("absolute inset-x-0 top-0 h-1 origin-left bg-gradient-to-r from-brand-300 to-brand-600 transition-transform duration-700 rtl:origin-right rtl:bg-gradient-to-l", lit ? "scale-x-100" : "scale-x-0")} />
        <span className={cn("inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2.5 font-display text-xs font-bold tabular-nums transition-colors duration-500", lit ? "bg-brand-600 text-white" : "bg-surface-3 text-ink-muted")}>
          {String(index + 1).padStart(2, "0")}
        </span>
        <h3 className="mt-3 font-display text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{body}</p>
      </div>
    </li>
  );
}
