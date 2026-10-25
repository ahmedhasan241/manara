import type { ReactNode } from "react";
import { cn } from "./components";

/*
 * Brand scenes: small line drawings in the Manara style (gold strokes on navy,
 * like the lighthouse logo) used wherever the site needs a picture. They show
 * places and objects (a desk, a classroom, a campus, a laptop…), never photos
 * of people. Pure SVG with no ids, so they render the same on the server.
 */

export type SceneName =
  | "study"
  | "teach"
  | "family"
  | "class"
  | "campus"
  | "online"
  | "math"
  | "science"
  | "medicine"
  | "code"
  | "design"
  | "languages"
  | "business";

export const SCENES: SceneName[] = ["study", "teach", "family", "class", "campus", "online", "math", "science", "medicine", "code", "design", "languages", "business"];

const GOLD = "#e0b55f";
const CREAM = "#f4efe3";

/** Stroke presets: the main gold line and a quieter cream detail line. */
const line = { fill: "none", stroke: GOLD, strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const detail = { fill: "none", stroke: CREAM, strokeOpacity: 0.55, strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const glow = { fill: GOLD, fillOpacity: 0.16 } as const;
const label = { fill: CREAM, fontFamily: "ui-sans-serif, system-ui, sans-serif", fontWeight: 700, textAnchor: "middle" } as const;

const ART: Record<SceneName, ReactNode> = {
  // An open book, a pencil and a bright idea.
  study: (
    <>
      <circle cx="76" cy="88" r="20" {...glow} />
      <circle cx="76" cy="88" r="20" {...line} />
      <path d="M68 110h16M70 117h12M69 88q7 9 14 0" {...line} />
      <path d="M76 58v-9M54 66l-6-6M98 66l6-6M48 88h-9M104 88h9" {...detail} />
      <path d="M118 128 150 96l8 8-32 32zM118 128l-4 12 12-4M146 100l8 8" {...line} />
      <path d="M40 148q30-13 60 1 30-14 60-1v22q-30-13-60 1-30-14-60-1zM100 149v22" {...line} />
      <path d="M50 152q20-7 40 1M50 159q20-7 40 1M110 153q20-8 40-1M110 160q20-8 40-1" {...detail} />
    </>
  ),
  // A board with a lesson on it.
  teach: (
    <>
      <rect x="34" y="40" width="132" height="86" rx="7" {...glow} />
      <rect x="34" y="40" width="132" height="86" rx="7" {...line} />
      <text x="118" y="76" fontSize="17" {...label}>a²+b²=c²</text>
      <path d="M54 112 78 88v24zM96 98h52M96 110h36" {...detail} />
      <path d="M40 126h120M62 126l-12 42M138 126l12 42M100 126v42" {...line} />
      <path d="M150 150a8 8 0 1 0 0.1 0M150 142v-5" {...detail} />
    </>
  ),
  // Home, a heart and a progress card: families following along.
  family: (
    <>
      <path d="M42 112 98 66l56 46" {...line} />
      <path d="M50 106v62h96v-62M132 94V74h12v30" {...line} />
      <path d="M86 168v-24a12 12 0 0 1 24 0v24" {...line} />
      <path d="M98 104c-6-8-18-3-13 7l13 11 13-11c5-10-7-15-13-7z" {...glow} />
      <path d="M98 104c-6-8-18-3-13 7l13 11 13-11c5-10-7-15-13-7z" {...line} />
      <rect x="122" y="30" width="52" height="38" rx="7" fill="#172a4b" />
      <rect x="122" y="30" width="52" height="38" rx="7" {...line} />
      <path d="M134 58v-8M144 58V44M154 58v-10M164 58V40" {...detail} />
    </>
  ),
  // A classroom: board, desks and a globe.
  class: (
    <>
      <rect x="52" y="34" width="96" height="40" rx="5" {...glow} />
      <rect x="52" y="34" width="96" height="40" rx="5" {...line} />
      <text x="100" y="61" fontSize="16" {...label}>A B C</text>
      <path d="M36 112h40M40 112v20M72 112v20M88 112h40M92 112v20M124 112v20M60 146h40M64 146v20M96 146v20" {...line} />
      <path d="M44 104h24M96 104h24M68 138h24" {...detail} />
      <circle cx="156" cy="136" r="15" {...line} />
      <path d="M141 136h30M156 121q-9 15 0 30q9-15 0-30M156 151v12M146 166h20" {...detail} />
    </>
  ),
  // A university: columns, steps and a graduation cap above.
  campus: (
    <>
      <path d="M84 38 100 30l16 8-16 8zM90 41v8q10 6 20 0v-8" {...line} />
      <path d="M40 84 100 56l60 28z" {...glow} />
      <path d="M40 84 100 56l60 28zM44 90h112" {...line} />
      <path d="M56 96v50M78 96v50M100 96v50M122 96v50M144 96v50" {...line} />
      <path d="M40 150h120M34 158h132M28 166h144" {...detail} />
    </>
  ),
  // A laptop playing a lesson, with a chat bubble.
  online: (
    <>
      <rect x="46" y="58" width="108" height="72" rx="7" {...glow} />
      <rect x="46" y="58" width="108" height="72" rx="7" {...line} />
      <path d="M34 138h132l-10 14H44z" {...line} />
      <path d="M90 80 116 94 90 108z" fill={GOLD} fillOpacity="0.35" />
      <path d="M90 80 116 94 90 108z" {...line} />
      <path d="M58 120h84" {...detail} />
      <path d="M136 26h32a7 7 0 0 1 7 7v14a7 7 0 0 1-7 7h-18l-9 8v-8h-5a7 7 0 0 1-7-7V33a7 7 0 0 1 7-7z" {...line} />
      <path d="M144 40h.1M152 40h.1M160 40h.1" stroke={CREAM} strokeWidth="3.4" strokeLinecap="round" />
    </>
  ),
  // Maths symbols and a compass.
  math: (
    <>
      <text x="70" y="98" fontSize="44" {...label} fill={GOLD}>π</text>
      <text x="132" y="86" fontSize="34" {...label}>∑</text>
      <text x="128" y="146" fontSize="26" {...label}>√x</text>
      <path d="M58 166 78 116l20 50M78 116v-8M66 146h24" {...line} />
      <path d="M36 120h20M46 110v20M150 104h22" {...detail} />
    </>
  ),
  // A flask and an atom.
  science: (
    <>
      <path d="M84 44h28M90 44v40l-28 64a8 8 0 0 0 7 12h58a8 8 0 0 0 7-12l-28-64V44" {...line} />
      <path d="M70 130h56l9 20a6 6 0 0 1-5 8H66a6 6 0 0 1-5-8z" {...glow} />
      <path d="M88 116a3 3 0 1 0 .1 0M104 104a4 4 0 1 0 .1 0M96 140a3 3 0 1 0 .1 0" {...detail} />
      <ellipse cx="150" cy="64" rx="24" ry="9" {...detail} />
      <ellipse cx="150" cy="64" rx="24" ry="9" transform="rotate(60 150 64)" {...detail} />
      <ellipse cx="150" cy="64" rx="24" ry="9" transform="rotate(-60 150 64)" {...detail} />
      <circle cx="150" cy="64" r="4" fill={GOLD} />
    </>
  ),
  // A heart with a pulse line.
  medicine: (
    <>
      <path d="M100 162C42 124 52 66 100 92c48-26 58 32 0 70z" {...glow} />
      <path d="M100 162C42 124 52 66 100 92c48-26 58 32 0 70z" {...line} />
      <path d="M36 118h34l8-16 11 32 9-24 6 8h66" {...line} />
      <path d="M150 40v20M140 50h20" {...detail} />
    </>
  ),
  // Code brackets.
  code: (
    <>
      <rect x="38" y="52" width="124" height="96" rx="9" {...glow} />
      <rect x="38" y="52" width="124" height="96" rx="9" {...line} />
      <path d="M38 70h124" {...detail} />
      <path d="M48 61h.1M56 61h.1M64 61h.1" stroke={CREAM} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M78 90 60 108l18 18M122 90l18 18-18 18M110 84 90 132" {...line} />
    </>
  ),
  // A paint palette and a brush.
  design: (
    <>
      <path d="M100 48c-36 0-62 24-62 54 0 22 18 32 32 26 11-5 17 2 17 10 0 14 10 20 22 18 32-6 52-30 52-56 0-30-26-52-61-52z" {...glow} />
      <path d="M100 48c-36 0-62 24-62 54 0 22 18 32 32 26 11-5 17 2 17 10 0 14 10 20 22 18 32-6 52-30 52-56 0-30-26-52-61-52z" {...line} />
      <circle cx="74" cy="84" r="7" fill={GOLD} />
      <circle cx="102" cy="72" r="7" fill={CREAM} fillOpacity="0.7" />
      <circle cx="130" cy="84" r="7" fill={GOLD} fillOpacity="0.6" />
      <circle cx="136" cy="110" r="7" fill={CREAM} fillOpacity="0.45" />
      <path d="M168 168 140 140M140 140l-6 2-2 6 6-2z" {...line} />
    </>
  ),
  // Two speech bubbles, Latin and Arabic.
  languages: (
    <>
      <path d="M48 48h64a10 10 0 0 1 10 10v30a10 10 0 0 1-10 10H70l-14 12V98h-8a10 10 0 0 1-10-10V58a10 10 0 0 1 10-10z" {...glow} />
      <path d="M48 48h64a10 10 0 0 1 10 10v30a10 10 0 0 1-10 10H70l-14 12V98h-8a10 10 0 0 1-10-10V58a10 10 0 0 1 10-10z" {...line} />
      <text x="80" y="84" fontSize="24" {...label}>Aa</text>
      <path d="M152 100H96a10 10 0 0 0-10 10v30a10 10 0 0 0 10 10h38l14 12v-12h4a10 10 0 0 0 10-10v-30a10 10 0 0 0-10-10z" {...line} />
      <text x="124" y="138" fontSize="26" {...label} fill={GOLD}>ع</text>
    </>
  ),
  // A rising chart.
  business: (
    <>
      <path d="M44 46v118h120" {...line} />
      <path d="M62 164v-30M88 164v-46M114 164v-36M140 164v-64" {...detail} strokeWidth={9} strokeOpacity={0.25} strokeLinecap="butt" />
      <path d="M56 136 84 108l26 12 44-50" {...line} />
      <path d="M154 70l-13 1M154 70l-1 13" {...line} />
    </>
  ),
};

/**
 * A scene on a navy card with a soft gold glow and a few stars. It fills its
 * box (sliced to cover), so give it a size or put it in a sized container.
 */
export function Scene({ name, className, title }: { name: SceneName; className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" className={cn("block h-full w-full", className)} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <rect x="-200" y="-200" width="600" height="600" fill="#132544" />
      <circle cx="160" cy="24" r="110" fill={GOLD} fillOpacity="0.05" />
      <circle cx="160" cy="24" r="62" fill={GOLD} fillOpacity="0.06" />
      <path d="M22 36l14-8 12 12" stroke={CREAM} strokeOpacity="0.25" strokeWidth="1" fill="none" />
      <circle cx="22" cy="36" r="1.8" fill={CREAM} fillOpacity="0.5" />
      <circle cx="36" cy="28" r="2.4" fill={GOLD} fillOpacity="0.7" />
      <circle cx="48" cy="40" r="1.6" fill={CREAM} fillOpacity="0.5" />
      <circle cx="178" cy="176" r="1.6" fill={CREAM} fillOpacity="0.35" />
      <circle cx="18" cy="170" r="1.4" fill={CREAM} fillOpacity="0.3" />
      {ART[name]}
    </svg>
  );
}

/** A scene for a course, from its category (maths, science, medicine…), else picked from its title. */
export function sceneFor(category: string | null | undefined, seed: string): SceneName {
  const text = `${category ?? ""} ${seed}`.toLowerCase();
  // Short words get word boundaries so "startup" isn't "art" and "تطبيق" isn't "طب".
  const rules: [RegExp, SceneName][] = [
    [/math|algebra|calcul|geometr|statist|رياضيات/, "math"],
    [/medic|health|nurs|doctor|anatom|pharm|الطب|طبي|تمريض|صحة/, "medicine"],
    [/scien|physic|chem|biolog|\blab\b|علوم|فيزياء|كيمياء|أحياء/, "science"],
    [/program|\bcode\b|coding|\bweb\b|software|comput|\bdata\b|\bai\b|برمجة|حاسب/, "code"],
    [/design|\bart\b|drawing|colou?r|\bui\b|\bux\b|تصميم|رسم/, "design"],
    [/business|market|financ|accounting|manage|startup|أعمال|تسويق|إدارة/, "business"],
    [/language|english|arabic|french|writing|literat|grammar|لغة|لغات|أدب/, "languages"],
    [/universit|college|campus|جامعة/, "campus"],
  ];
  const match = rules.find(([pattern]) => pattern.test(text));
  if (match) return match[1];
  const general: SceneName[] = ["study", "online", "teach", "class"];
  const h = [...seed].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) >>> 0, 7);
  return general[h % general.length]!;
}
