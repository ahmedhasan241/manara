import type { ReactNode, SVGProps } from "react";
import { cn } from "./components";

/**
 * Hand-drawn accents: pen strokes that make pages feel made by a person, not
 * generated. They draw in currentColor and are decorative (aria-hidden).
 * Arrows mirror themselves in right-to-left layouts.
 */
type DoodleProps = SVGProps<SVGSVGElement> & { className?: string };

const stroke = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** A loose pen underline. */
export function Squiggle({ className, ...props }: DoodleProps) {
  return (
    <svg viewBox="0 0 200 16" preserveAspectRatio="none" aria-hidden className={cn("h-3 w-full", className)} {...props}>
      <path {...stroke} strokeWidth={3.5} d="M3 11c20-6 38-7 56-3s30 5 50 0 44-8 64-3 18 4 24 2" />
    </svg>
  );
}

/** A curved arrow, as if pointing at something from the margin. */
export function DoodleArrow({ className, ...props }: DoodleProps) {
  return (
    <svg viewBox="0 0 80 60" aria-hidden className={cn("h-12 w-16 rtl:-scale-x-100", className)} {...props}>
      <path {...stroke} strokeWidth={2.5} d="M6 8c10 22 28 36 58 40" />
      <path {...stroke} strokeWidth={2.5} d="M52 38l13 10-15 6" />
    </svg>
  );
}

/** A small sparkle drawn in four strokes. */
export function DoodleStar({ className, ...props }: DoodleProps) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={cn("h-8 w-8", className)} {...props}>
      <path {...stroke} strokeWidth={2.5} d="M20 4c1 9 3 13 15 16-11 2-14 6-15 16-2-10-5-14-16-16 11-3 14-7 16-16z" />
    </svg>
  );
}

/** A loose hand-drawn loop to circle a word or number. */
export function DoodleCircle({ className, ...props }: DoodleProps) {
  return (
    <svg viewBox="0 0 120 60" preserveAspectRatio="none" aria-hidden className={cn("pointer-events-none absolute -inset-x-3 -inset-y-2", className)} {...props}>
      <path {...stroke} strokeWidth={2.5} d="M64 6C30 3 6 14 6 30s26 26 56 25 52-10 52-26S88 3 52 8" />
    </svg>
  );
}

/** Scattered dots and dashes, a sketchbook texture for empty corners. */
export function DoodleScatter({ className, ...props }: DoodleProps) {
  return (
    <svg viewBox="0 0 160 120" aria-hidden className={cn("h-28 w-36", className)} {...props}>
      <g {...stroke} strokeWidth={2.5}>
        <path d="M14 20l8 4M60 10l2 9M120 18l9-3M30 70l9 1M100 60l6 6M140 90l-4 8M70 100l9-2M20 108l5-6" />
        <circle cx="90" cy="30" r="3" />
        <circle cx="50" cy="50" r="2.5" />
        <circle cx="130" cy="50" r="2" />
      </g>
    </svg>
  );
}

/** A handwritten note with an arrow, for pointing out a detail beside a button or figure. */
export function MarginNote({ children, className, arrow = "below" }: { children: ReactNode; className?: string; arrow?: "below" | "before" }) {
  return (
    <span className={cn("pointer-events-none inline-flex select-none items-start gap-1 text-accent-600 dark:text-accent-400", arrow === "before" && "flex-row-reverse", className)} aria-hidden>
      {arrow === "before" && <DoodleArrow className="mt-1 h-8 w-10 -scale-y-100 rtl:-scale-y-100" />}
      <span className="font-hand -rotate-3 text-xl leading-tight">{children}</span>
      {arrow === "below" && <DoodleArrow className="mt-3 h-9 w-12" />}
    </span>
  );
}
