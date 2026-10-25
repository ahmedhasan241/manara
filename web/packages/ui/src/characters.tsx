import { useId } from "react";
import { cn } from "./components";

/*
 * Flat illustrated people for the Campus look: teachers, doctors, students,
 * graduates and readers. Pure SVG, palette-aware (shirts use the brand and
 * accent colours), with a range of skin tones and hair styles so pages can
 * show many different people.
 */

const SKIN = ["#f6cba9", "#e3a679", "#bb7a4f", "#8c5434", "#f3d7c2", "#6b3f27"] as const;
const HAIR = ["#2b2142", "#5a3a22", "#141414", "#8b4a2b", "#d9a441", "#3d2a1e"] as const;
const NAVY = "#2f327d";
const INK = "#252641";

export type CharacterVariant = "teacher" | "graduate" | "laptop" | "reader" | "doctor";

export interface CharacterProps {
  variant: CharacterVariant;
  /** Index into the skin tones (wraps). */
  tone?: number;
  /** Index into the hair colours (wraps). */
  hair?: number;
  hairStyle?: "short" | "long" | "bun" | "curly" | "hijab";
  /** Soft circle behind the person. */
  backdrop?: "sky" | "peach" | "mint" | "blush" | "lilac" | "none";
  className?: string;
  title?: string;
}

function Hair({ style, color, behind }: { style: NonNullable<CharacterProps["hairStyle"]>; color: string; behind?: boolean }) {
  if (style === "hijab") {
    return behind ? (
      <path d="M80 66 C78 40 94 30 110 30 C126 30 142 40 140 66 C142 92 136 108 124 112 L96 112 C84 108 78 92 80 66 Z" fill="var(--accent-500, #f48c4c)" />
    ) : (
      <path d="M84 66 C84 46 96 36 110 36 C124 36 136 46 136 66 C132 52 122 46 110 46 C98 46 88 52 84 66 Z" fill="var(--accent-600, #d9692a)" opacity="0.9" />
    );
  }
  if (behind) {
    if (style === "long") return <path d="M84 60 C78 92 84 112 98 114 L122 114 C136 112 142 92 136 60 Z" fill={color} />;
    if (style === "curly") return <path d="M82 66 C76 58 82 44 90 42 C90 32 104 26 112 32 C122 26 136 34 134 44 C142 48 144 60 138 68 C134 76 86 76 82 66 Z" fill={color} />;
    return null;
  }
  if (style === "bun") {
    return (
      <>
        <circle cx="110" cy="30" r="10" fill={color} />
        <path d="M86 62 C84 42 98 34 110 34 C124 34 136 42 134 62 C126 50 116 46 106 47 C96 48 90 54 86 62 Z" fill={color} />
      </>
    );
  }
  if (style === "curly") return <path d="M88 56 C90 46 98 42 104 44 C108 38 118 38 122 44 C128 42 134 48 132 56 C124 50 96 50 88 56 Z" fill={color} />;
  return <path d="M86 60 C85 40 100 32 112 32 C127 32 137 42 134 60 C128 51 118 47 108 48 C98 49 91 54 86 60 Z" fill={color} />;
}

function Face({ skin, down }: { skin: string; down?: boolean }) {
  return (
    <>
      <rect x="103" y="82" width="14" height="14" rx="5" fill={skin} />
      <circle cx="110" cy="62" r="24" fill={skin} />
      <circle cx="86.5" cy="64" r="4" fill={skin} />
      <circle cx="133.5" cy="64" r="4" fill={skin} />
      {down ? (
        <>
          <path d="M98 66 q3 2.5 6 0" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M116 66 q3 2.5 6 0" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="101" cy="64" r="2.6" fill={INK} />
          <circle cx="119" cy="64" r="2.6" fill={INK} />
        </>
      )}
      <path d="M103 74 Q110 80 117 74" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <circle cx="95" cy="72" r="3.2" fill="#ff8f8f" opacity="0.35" />
      <circle cx="125" cy="72" r="3.2" fill="#ff8f8f" opacity="0.35" />
    </>
  );
}

function Arm({ d, hand, skin, color }: { d: string; hand: [number, number]; skin: string; color: string }) {
  return (
    <>
      <path d={d} stroke={color} strokeWidth="15" fill="none" strokeLinecap="round" />
      <circle cx={hand[0]} cy={hand[1]} r="7" fill={skin} />
    </>
  );
}

const TORSO = "M78 114 C78 101 92 94 110 94 C128 94 142 101 142 114 L147 172 L73 172 Z";
const LEGS = "M78 170 L142 170 L140 222 L117 222 L110 188 L103 222 L80 222 Z";

/**
 * One illustrated person. Use several with different tones and hair styles
 * for a diverse group.
 */
export function Character({ variant, tone = 0, hair = 0, hairStyle = "short", backdrop = "sky", className, title }: CharacterProps) {
  const id = useId().replace(/:/g, "");
  const skin = SKIN[tone % SKIN.length]!;
  const hairColor = HAIR[hair % HAIR.length]!;
  const shirt = variant === "doctor" ? "var(--brand-400, #49bbbd)" : variant === "graduate" ? NAVY : variant === "reader" ? "var(--accent-500, #f48c4c)" : "var(--brand-500, #1e8183)";
  const backdropFill = backdrop === "none" ? undefined : `var(--${backdrop})`;

  return (
    <svg viewBox="0 0 220 240" className={cn("h-auto w-full", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <defs>
        <linearGradient id={`${id}-glow`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="white" stopOpacity="0.55" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>

      {backdropFill && (
        <>
          <circle cx="110" cy="128" r="96" fill={backdropFill} />
          <circle cx="110" cy="128" r="96" fill={`url(#${id}-glow)`} />
        </>
      )}
      {/* Floating decorations */}
      <circle cx="28" cy="70" r="5" fill="var(--accent-400, #ffa26b)" />
      <path d="M190 52 v12 M184 58 h12" stroke="var(--brand-400, #49bbbd)" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="196" cy="168" r="4" fill="none" stroke={NAVY} strokeWidth="2.5" opacity="0.5" />

      {variant === "teacher" && (
        <g>
          <rect x="6" y="34" width="70" height="56" rx="6" fill="white" stroke={NAVY} strokeWidth="3" />
          <path d="M16 50 h30 M16 62 h46 M16 74 h22" stroke="var(--brand-400, #49bbbd)" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M50 76 l6 -8 l6 8" stroke="var(--accent-500, #f48c4c)" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M40 90 l-8 22 M44 90 l8 22" stroke={NAVY} strokeWidth="3" strokeLinecap="round" />
        </g>
      )}

      <Hair style={hairStyle} color={hairColor} behind />
      <path d={LEGS} fill={variant === "doctor" ? "#3a4a8c" : NAVY} />
      <ellipse cx="91" cy="224" rx="13" ry="5" fill={INK} />
      <ellipse cx="129" cy="224" rx="13" ry="5" fill={INK} />
      <path d={TORSO} fill={shirt} />

      {variant === "doctor" && (
        <>
          <path d="M76 116 C76 102 90 96 102 95 L110 128 L118 95 C130 96 144 102 144 116 L150 202 L70 202 Z" fill="white" stroke="#dfe7f1" strokeWidth="2" />
          <path d="M98 98 C92 122 98 138 110 140 C122 138 128 122 122 98" stroke={INK} strokeWidth="3" fill="none" />
          <circle cx="110" cy="144" r="6" fill="#c9d3e0" stroke={INK} strokeWidth="2.5" />
          <rect x="122" y="150" width="14" height="4" rx="2" fill="var(--accent-500, #f48c4c)" />
        </>
      )}

      {variant === "graduate" && (
        <>
          <Arm d="M80 118 C66 100 62 84 64 68" hand={[64, 64]} skin={skin} color={shirt} />
          <Arm d="M140 118 C154 100 158 84 156 70" hand={[156, 66]} skin={skin} color={shirt} />
          <g transform="rotate(-18 166 58)">
            <rect x="150" y="50" width="34" height="14" rx="7" fill="white" stroke="#dfe7f1" strokeWidth="2" />
            <rect x="164" y="49" width="6" height="16" fill="var(--accent-500, #f48c4c)" />
          </g>
        </>
      )}
      {variant === "teacher" && (
        <>
          <Arm d="M80 118 C66 106 56 96 50 86" hand={[48, 84]} skin={skin} color={shirt} />
          <Arm d="M140 118 C148 138 148 152 144 164" hand={[144, 166]} skin={skin} color={shirt} />
          <rect x="132" y="150" width="26" height="32" rx="3" fill="var(--accent-500, #f48c4c)" transform="rotate(8 145 166)" />
        </>
      )}
      {variant === "laptop" && (
        <>
          <Arm d="M80 118 C74 140 80 158 92 170" hand={[94, 172]} skin={skin} color={shirt} />
          <Arm d="M140 118 C146 140 140 158 128 170" hand={[126, 172]} skin={skin} color={shirt} />
          <rect x="66" y="128" width="88" height="56" rx="6" fill="#e9eef7" stroke="#c9d3e0" strokeWidth="2" />
          <circle cx="110" cy="156" r="8" fill="var(--brand-400, #49bbbd)" />
          <path d="M54 184 L166 184 L158 194 L62 194 Z" fill="#c9d3e0" />
        </>
      )}
      {variant === "reader" && (
        <>
          <Arm d="M80 118 C72 130 72 142 76 150" hand={[76, 152]} skin={skin} color={shirt} />
          <Arm d="M140 118 C148 130 148 142 144 150" hand={[144, 152]} skin={skin} color={shirt} />
          <path d="M72 128 L110 138 L148 128 L148 170 L110 180 L72 170 Z" fill={NAVY} />
          <path d="M76 126 L110 134 L110 172 L76 164 Z" fill="white" />
          <path d="M144 126 L110 134 L110 172 L144 164 Z" fill="#f3f6fb" />
          <path d="M84 140 l18 4 M84 148 l18 4 M118 144 l18 -4 M118 152 l18 -4" stroke="#c9d3e0" strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}
      {variant === "doctor" && (
        <>
          <Arm d="M78 118 C70 140 72 156 78 168" hand={[78, 170]} skin={skin} color="white" />
          <Arm d="M142 118 C150 132 150 146 146 156" hand={[146, 158]} skin={skin} color="white" />
          <rect x="138" y="144" width="24" height="32" rx="3" fill="#dfe7f1" stroke={NAVY} strokeWidth="2" transform="rotate(10 150 160)" />
        </>
      )}

      <Face skin={skin} down={variant === "reader" || variant === "laptop"} />
      <Hair style={hairStyle} color={hairColor} />

      {variant === "graduate" && (
        <>
          <path d="M96 46 L124 46 L124 54 Q110 60 96 54 Z" fill={INK} />
          <path d="M78 42 L110 28 L142 42 L110 56 Z" fill={NAVY} />
          <path d="M140 43 L142 62" stroke="var(--accent-500, #f48c4c)" strokeWidth="2.5" />
          <circle cx="142" cy="64" r="3.5" fill="var(--accent-500, #f48c4c)" />
        </>
      )}
    </svg>
  );
}

const GROUP: Omit<CharacterProps, "className">[] = [
  { variant: "teacher", tone: 1, hair: 1, hairStyle: "bun", backdrop: "peach" },
  { variant: "laptop", tone: 3, hair: 2, hairStyle: "curly", backdrop: "sky" },
  { variant: "graduate", tone: 0, hair: 4, hairStyle: "long", backdrop: "mint" },
  { variant: "doctor", tone: 2, hair: 0, hairStyle: "short", backdrop: "lilac" },
  { variant: "reader", tone: 4, hair: 3, hairStyle: "hijab", backdrop: "blush" },
];

/**
 * A row of different people: teacher, student, graduate, doctor and reader.
 * `count` picks how many (from the start of the group).
 */
export function CharacterGroup({ count = 5, className, itemClassName }: { count?: number; className?: string; itemClassName?: string }) {
  return (
    <div aria-hidden className={cn("flex items-end justify-center", className)}>
      {GROUP.slice(0, count).map((props, i) => (
        <div
          key={props.variant}
          className={cn("animate-float -mx-2 min-w-0 transition-transform duration-500 hover:-translate-y-2", i % 2 === 1 && "translate-y-4", itemClassName)}
          style={{ animationDelay: `${i * -1.3}s`, width: `${100 / Math.min(count, GROUP.length) + 4}%` }}
        >
          <Character {...props} />
        </div>
      ))}
    </div>
  );
}

/** Which illustration suits a category best. */
export function characterFor(category: string | null | undefined): CharacterProps {
  const c = category?.toLowerCase() ?? "";
  if (/medic|health|anatom|nurs|first aid/.test(c)) return { variant: "doctor", tone: 2, hair: 0, backdrop: "mint" };
  if (/develop|code|program|comput|data/.test(c)) return { variant: "laptop", tone: 3, hair: 2, hairStyle: "curly", backdrop: "sky" };
  if (/lang|writ|literat|history/.test(c)) return { variant: "reader", tone: 4, hair: 3, hairStyle: "hijab", backdrop: "blush" };
  if (/business|design/.test(c)) return { variant: "laptop", tone: 0, hair: 4, hairStyle: "long", backdrop: "peach" };
  if (/math|scien|phys/.test(c)) return { variant: "teacher", tone: 1, hair: 1, hairStyle: "bun", backdrop: "lilac" };
  return { variant: "graduate", tone: 5, hair: 2, backdrop: "sky" };
}
