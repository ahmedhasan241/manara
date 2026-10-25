import { cn } from "@educloud/ui";

const fills = {
  brand: "bg-brand-500",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-ink-muted/40",
} as const;

export type MeterTone = keyof typeof fills;

/** A labelled horizontal bar for a percentage (0–100). */
export function Meter({ label, value, display, tone = "brand", marker, className }: { label: string; value: number | null; display?: string; tone?: MeterTone; marker?: number; className?: string }) {
  const width = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className={cn("min-w-0", className)}>
      <p className="mb-1 flex items-baseline justify-between gap-2 text-xs">
        <span className="truncate text-ink-muted">{label}</span>
        <span className="shrink-0 font-semibold tabular-nums text-ink">{display ?? (value == null ? "—" : `${Math.round(value * 10) / 10}%`)}</span>
      </p>
      <div className="relative h-2 overflow-hidden rounded-full bg-surface-3" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value ?? undefined}>
        <div className={cn("h-full rounded-full transition-[width] duration-700", fills[tone])} style={{ width: `${width}%` }} />
        {marker != null && <span aria-hidden className="absolute inset-y-0 w-0.5 bg-ink/50" style={{ insetInlineStart: `${Math.min(100, Math.max(0, marker))}%` }} />}
      </div>
    </div>
  );
}

/** A round score badge, e.g. 86% or a letter grade. */
export function ScoreRing({ value, label, size = "md", tone = "brand" }: { value: number | null; label: string; size?: "sm" | "md" | "lg"; tone?: MeterTone }) {
  const dims = { sm: 44, md: 64, lg: 96 }[size];
  const stroke = size === "lg" ? 8 : 6;
  const r = (dims - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const share = value == null ? 0 : Math.max(0, Math.min(100, value)) / 100;
  const colors = { brand: "text-brand-500", success: "text-success", warning: "text-warning", danger: "text-danger", neutral: "text-ink-muted/40" } as const;

  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: dims, height: dims }}>
      <svg width={dims} height={dims} viewBox={`0 0 ${dims} ${dims}`} className="-rotate-90" aria-hidden>
        <circle cx={dims / 2} cy={dims / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-surface-3" />
        <circle
          cx={dims / 2}
          cy={dims / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="currentColor"
          className={cn(colors[tone], "transition-[stroke-dashoffset] duration-700")}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - share)}
        />
      </svg>
      <span className={cn("absolute font-display font-bold tabular-nums", size === "lg" ? "text-2xl" : size === "md" ? "text-sm" : "text-[11px]")}>{label}</span>
    </span>
  );
}
