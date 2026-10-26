import { Translated } from "./i18n-provider";
import { cn } from "./components";
/**
 * Small dependency-free SVG charts. They scale to their container and use
 * currentColor / theme tokens so they work in light and dark mode.
 */

export type ChartTone = "brand" | "success" | "warning" | "danger";

const fills: Record<ChartTone, string> = { brand: "bg-brand-500", success: "bg-success", warning: "bg-warning", danger: "bg-danger" };
const strokes: Record<ChartTone, string> = { brand: "text-brand-500", success: "text-success", warning: "text-warning", danger: "text-danger" };

/** A stable id for SVG gradients, from the chart's label (no hooks, so it works on the server). */
function svgId(label: string) {
  let h = 0;
  for (const c of label) h = (h * 31 + c.charCodeAt(0)) | 0;
  return `chart-${(h >>> 0).toString(36)}`;
}

/**
 * Horizontal bars. `tone` colours a bar by its value (say red under 75%),
 * and `target` draws a thin marker where the line is.
 */
export function BarChart({
  data,
  max,
  label,
  format = (v) => String(v),
  tone,
  target,
}: {
  data: { label: string; value: number }[];
  max?: number;
  label: string;
  format?: (value: number) => string;
  tone?: (value: number) => ChartTone;
  target?: number;
}) {
  const top = max ?? Math.max(1, ...data.map((d) => d.value));

  return (
    <figure aria-label={label}>
      <ul className="space-y-3">
        {data.map((d) => {
          const color = tone?.(d.value) ?? "brand";
          return (
            <li key={d.label} className="grid grid-cols-[minmax(5rem,9rem)_1fr_3.5rem] items-center gap-3 text-sm">
              <span className="truncate text-ink-muted" title={d.label}>
                {d.label}
              </span>
              <span className="relative h-2.5 rounded-full bg-surface-3">
                <span className={cn("block h-full rounded-full transition-[width] duration-700", fills[color])} style={{ width: `${Math.min(100, (d.value / top) * 100)}%` }} />
                {target != null && <span aria-hidden className="absolute -inset-y-1 w-0.5 rounded-full bg-ink/40" style={{ insetInlineStart: `${Math.min(100, (target / top) * 100)}%` }} />}
              </span>
              <span className={cn("text-end font-semibold tabular-nums", color !== "brand" && strokes[color])}>{format(d.value)}</span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}

/** A compact trend line with a soft fill and a dot on the latest value. */
export function Sparkline({ values, label, height = 48, tone = "brand" }: { values: number[]; label: string; height?: number; tone?: ChartTone }) {
  const width = 240;
  if (values.length < 2) {
    return <p className="text-sm text-ink-muted"><Translated text="Not enough data yet." /></p>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const xy = values.map((v, i) => [(i / (values.length - 1)) * width, height - 4 - ((v - min) / span) * (height - 8)] as const);
  const points = xy.map(([x, y]) => `${x},${y}`).join(" ");
  const id = svgId(label);
  const last = xy[xy.length - 1]!;

  return (
    <div className={cn("relative", strokes[tone])} style={{ height }}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" role="img" aria-label={label} preserveAspectRatio="none">
        <defs>
          <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.22" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,${height} ${points} ${width},${height}`} fill={`url(#${id})`} />
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <span aria-hidden className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current ring-2 ring-surface" style={{ left: `${(last[0] / width) * 100}%`, top: `${(last[1] / height) * 100}%` }} />
    </div>
  );
}

/**
 * A labelled line chart for a series of named points (assessments, weeks):
 * gridlines at quarters of `max`, a dot per point with its value on hover,
 * and the first and last labels under the axis. A table copy is kept for
 * screen readers.
 */
export function LineChart({
  data,
  label,
  max = 100,
  format = (v) => `${Math.round(v)}%`,
  height = 160,
  tone = "brand",
  target,
}: {
  data: { label: string; value: number }[];
  label: string;
  max?: number;
  format?: (value: number) => string;
  height?: number;
  tone?: ChartTone;
  /** Draws a dashed line at this value, e.g. the pass mark. */
  target?: number;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-ink-muted"><Translated text="Not enough data yet." /></p>;
  }
  const width = 300;
  const y = (v: number) => height - (Math.max(0, Math.min(max, v)) / max) * height;
  const x = (i: number) => (data.length === 1 ? width / 2 : (i / (data.length - 1)) * width);
  const points = data.map((d, i) => `${x(i)},${y(d.value)}`).join(" ");
  const id = svgId(label);
  const pct = (v: number) => `${(v / width) * 100}%`;

  return (
    <figure aria-label={label} dir="ltr" className="grid grid-cols-[auto_1fr] gap-x-2">
      <div aria-hidden className="relative w-8 text-right text-[11px] tabular-nums text-ink-muted" style={{ height }}>
        {[1, 0.5, 0].map((f) => (
          <span key={f} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - f) * 100}%` }}>
            {format(max * f)}
          </span>
        ))}
      </div>
      <div className={cn("relative", strokes[tone])} style={{ height }}>
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          <defs>
            <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="currentColor" stopOpacity="0.18" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <line key={f} x1="0" x2={width} y1={height * f} y2={height * f} className="stroke-line" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          {target != null && <line x1="0" x2={width} y1={y(target)} y2={y(target)} className="stroke-ink-muted/60" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />}
          {data.length > 1 && <polygon points={`${x(0)},${height} ${points} ${x(data.length - 1)},${height}`} fill={`url(#${id})`} />}
          <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.25" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
        {data.map((d, i) => (
          <span
            key={i}
            title={`${d.label}: ${format(d.value)}`}
            className="group absolute grid h-5 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center"
            style={{ left: pct(x(i)), top: `${(y(d.value) / height) * 100}%` }}
          >
            <span className="h-2.5 w-2.5 rounded-full border-2 border-current bg-surface transition-transform group-hover:scale-125" />
            <span className="pointer-events-none absolute bottom-full mb-1 whitespace-nowrap rounded-md bg-nav px-1.5 py-0.5 text-[11px] font-semibold text-nav-ink opacity-0 transition-opacity group-hover:opacity-100">
              {format(d.value)}
            </span>
          </span>
        ))}
      </div>
      <div aria-hidden className="col-start-2 mt-2 flex justify-between gap-4 text-[11px] text-ink-muted">
        <span className="truncate">{data[0]!.label}</span>
        {data.length > 1 && <span className="truncate text-right">{data[data.length - 1]!.label}</span>}
      </div>
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>
          {data.map((d, i) => (
            <tr key={i}>
              <th scope="row">{d.label}</th>
              <td>{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
