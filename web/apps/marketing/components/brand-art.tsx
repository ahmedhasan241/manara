import { cn } from "@educloud/ui";

/**
 * Decorative light from the Manara lighthouse: soft gold beams fanning out
 * from the top end corner, with a small constellation, for navy bands.
 * Purely visual (aria-hidden); mirrors itself in right-to-left pages.
 */
export function LighthouseBeams({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 600 400"
      preserveAspectRatio="xMaxYMin slice"
      className={cn("pointer-events-none absolute inset-0 h-full w-full rtl:-scale-x-100", className)}
    >
      <defs>
        <radialGradient id="mn-beam-glow" cx="88%" cy="6%" r="70%">
          <stop offset="0" stopColor="#e0b55f" stopOpacity="0.32" />
          <stop offset="1" stopColor="#e0b55f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="mn-beam" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e0b55f" stopOpacity="0.28" />
          <stop offset="1" stopColor="#e0b55f" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="600" height="400" fill="url(#mn-beam-glow)" />
      <g fill="url(#mn-beam)">
        <path d="M528 24 L120 400 L230 400 Z" />
        <path d="M528 24 L-40 250 L-40 330 Z" opacity="0.7" />
        <path d="M528 24 L330 400 L400 400 Z" opacity="0.55" />
      </g>
      {/* Constellation, as in the logo. */}
      <g stroke="#e4c07c" strokeOpacity="0.35" strokeWidth="1" fill="none">
        <path d="M412 70 L452 52 L486 84 L468 118" />
      </g>
      <g fill="#e4c07c">
        <circle cx="412" cy="70" r="2.2" opacity="0.8" />
        <circle cx="452" cy="52" r="2.6" opacity="0.9" />
        <circle cx="486" cy="84" r="2" opacity="0.7" />
        <circle cx="468" cy="118" r="2.4" opacity="0.8" />
        <circle cx="360" cy="40" r="1.4" opacity="0.5" />
        <circle cx="300" cy="96" r="1.2" opacity="0.4" />
        <circle cx="560" cy="150" r="1.6" opacity="0.5" />
      </g>
      <circle cx="528" cy="24" r="7" fill="#f6ebd3" opacity="0.85" />
    </svg>
  );
}

/** Classes for the shared `Logo` when it sits on navy: white "ARA", lighter gold "MAN" and "منارة". */
export const LOGO_ON_NAVY = "[&_.text-heading]:text-white [&_.text-brand-600]:text-brand-400";
