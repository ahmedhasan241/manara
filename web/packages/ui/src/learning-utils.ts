import { cn } from "./components";
import {
  Atom,
  BookOpenText,
  Briefcase,
  Calculator,
  Code2,
  FlaskConical,
  Globe2,
  GraduationCap,
  HeartPulse,
  Languages,
  Music,
  Palette,
  type LucideIcon,
} from "lucide-react";

/*
 * Server-safe helpers for the learning components (icons and colours picked
 * from a course's category or title).
 */

const CATEGORY_ICONS: [RegExp, LucideIcon][] = [
  [/math|calcul|algebra|statist/i, Calculator],
  [/medic|health|anatom|nurs|first aid/i, HeartPulse],
  [/physic|astro/i, Atom],
  [/scien|chem|bio|lab/i, FlaskConical],
  [/lang|english|arab|french|literat|writing/i, Languages],
  [/code|program|comput|develop|software/i, Code2],
  [/design|art|draw/i, Palette],
  [/business|econom|market|finance/i, Briefcase],
  [/music/i, Music],
  [/history|geograph|social|global/i, Globe2],
];

/** A fitting icon for a course category or title. */
export function categoryIcon(name: string | null | undefined): LucideIcon {
  if (!name) return BookOpenText;
  return CATEGORY_ICONS.find(([pattern]) => pattern.test(name))?.[1] ?? GraduationCap;
}

/**
 * Tiles for category cards, lesson pills and calendar events. They share one
 * brand tint (the names stay so callers keep working).
 */
const TINT = "bg-brand-600/10 text-brand-700 dark:bg-brand-400/10 dark:text-brand-300";
export const TINTS = { sky: TINT, peach: TINT, mint: TINT, blush: TINT, lilac: TINT } as const;

export type Tint = keyof typeof TINTS;
export const TINT_ORDER: Tint[] = ["sky", "peach", "mint", "blush", "lilac"];

export function hash(text: string) {
  return [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
}

/** A stable tint for any label, so the same course always gets the same colour. */
export function tintFor(text: string): Tint {
  return TINT_ORDER[hash(text) % TINT_ORDER.length]!;
}

/** Buttons that sit on the peach banner (a plain class helper, so server pages can call it). */
export function bannerButtonClass(variant: "solid" | "outline" = "solid") {
  return cn(
    "press inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-colors duration-200",
    variant === "solid" ? "shine bg-brand-600 text-white shadow-[var(--shadow-glow)] hover:bg-brand-700" : "border border-brand-200 bg-surface text-ink hover:border-brand-300 hover:text-brand-700 dark:border-line dark:hover:text-brand-300",
  );
}

