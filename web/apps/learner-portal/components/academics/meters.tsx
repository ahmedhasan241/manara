"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@educloud/ui";

const fills = { success: "bg-success", warning: "bg-warning", danger: "bg-danger", neutral: "bg-ink-muted/40", brand: "bg-brand-500" } as const;
type Fill = keyof typeof fills;

const clamp = (value: number) => Math.min(100, Math.max(0, value));

/**
 * A subject's percentage as a bar, with a small flag at the pass mark so it's
 * easy to see how far above (or below) it the student is.
 */
export function ScoreBar({ value, pass, tone, label, passLabel, className }: { value: number | null; pass?: number | null; tone: Fill; label: string; passLabel?: string; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <div className={cn("relative", className)}>
      <div role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value ?? undefined} aria-label={label} className="h-2.5 w-full overflow-hidden rounded-full bg-surface-3">
        <motion.div
          className={cn("h-full rounded-full", fills[tone])}
          initial={reduce ? false : { width: 0 }}
          whileInView={{ width: `${clamp(value ?? 0)}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          data-meter-fill
          style={{ ["--meter-width" as string]: `${clamp(value ?? 0)}%`, ...(reduce ? { width: `${clamp(value ?? 0)}%` } : {}) }}
        />
      </div>
      {pass != null && (
        <span aria-hidden title={passLabel} className="absolute -top-1 bottom-[-0.25rem] w-0.5 rounded-full bg-heading/70" style={{ insetInlineStart: `calc(${clamp(pass)}% - 1px)` }} />
      )}
    </div>
  );
}

/**
 * Absences as a share of lessons, against the school's warning and limit
 * lines. The track is tinted in three zones so the thresholds read at a glance.
 */
export function ThresholdBar({ value, warning, limit, label, warningLabel, limitLabel }: { value: number; warning: number; limit: number; label: string; warningLabel: string; limitLabel: string }) {
  const reduce = useReducedMotion();
  // Show a little past the limit so the limit line isn't at the very edge.
  const scale = Math.max(limit * 1.25, value * 1.1, 10);
  const at = (v: number) => `${clamp((v / scale) * 100)}%`;
  const tone: Fill = value >= limit ? "danger" : value >= warning ? "warning" : "success";

  return (
    <div>
      <div role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-label={label} className="relative h-3 w-full overflow-hidden rounded-full bg-surface-3">
        <span aria-hidden className="absolute inset-y-0 bg-warning/15" style={{ insetInlineStart: at(warning), insetInlineEnd: `calc(100% - ${at(limit)})` }} />
        <span aria-hidden className="absolute inset-y-0 end-0 bg-danger/15" style={{ insetInlineStart: at(limit) }} />
        <motion.span
          className={cn("absolute inset-y-0 start-0 rounded-full", fills[tone])}
          initial={reduce ? false : { width: 0 }}
          whileInView={{ width: at(value) }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          data-meter-fill
          style={{ ["--meter-width" as string]: at(value), ...(reduce ? { width: at(value) } : {}) }}
        />
      </div>
      <div aria-hidden className="relative mt-1 h-4 text-[10px] font-semibold text-ink-muted">
        <span className="absolute -translate-x-1/2 whitespace-nowrap text-warning rtl:translate-x-1/2" style={{ insetInlineStart: at(warning) }}>
          ▲ {warningLabel}
        </span>
        <span className="absolute -translate-x-1/2 whitespace-nowrap text-danger rtl:translate-x-1/2" style={{ insetInlineStart: at(limit) }}>
          ▲ {limitLabel}
        </span>
      </div>
    </div>
  );
}
