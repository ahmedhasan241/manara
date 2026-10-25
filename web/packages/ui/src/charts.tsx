import { Translated } from "./i18n-provider";
/**
 * Small dependency-free SVG charts. They scale to their container and use
 * currentColor / theme tokens so they work in light and dark mode.
 */

export function BarChart({
  data,
  max,
  label,
  format = (v) => String(v),
}: {
  data: { label: string; value: number }[];
  max?: number;
  label: string;
  format?: (value: number) => string;
}) {
  const top = max ?? Math.max(1, ...data.map((d) => d.value));

  return (
    <figure aria-label={label}>
      <ul className="space-y-2">
        {data.map((d) => (
          <li key={d.label} className="grid grid-cols-[minmax(6rem,10rem)_1fr_3.5rem] items-center gap-3 text-sm">
            <span className="truncate text-ink-muted" title={d.label}>
              {d.label}
            </span>
            <span className="h-2.5 overflow-hidden rounded-full bg-surface-2">
              <span className="block h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, (d.value / top) * 100)}%` }} />
            </span>
            <span className="text-end tabular-nums">{format(d.value)}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

export function Sparkline({ values, label, height = 48 }: { values: number[]; label: string; height?: number }) {
  const width = 240;
  if (values.length < 2) {
    return <p className="text-sm text-ink-muted"><Translated text="Not enough data yet." /></p>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - 4 - ((v - min) / span) * (height - 8)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-12 w-full text-brand-500" role="img" aria-label={label} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}
