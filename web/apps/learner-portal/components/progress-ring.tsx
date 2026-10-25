"use client";

import { motion } from "motion/react";

/**
 * Animated circular progress for a percentage (grade average, attendance).
 * Colour follows the value: green from 80, amber from 60, red below.
 */
export function ProgressRing({ value, size = 64, label }: { value: number | null; size?: number; label: string }) {
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = value ?? 0;
  const color = value == null ? "var(--line)" : pct >= 80 ? "var(--success)" : pct >= 60 ? "var(--warning)" : "var(--danger)";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${value == null ? "no data yet" : `${value}%`}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - pct / 100) }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-display text-sm font-bold tabular-nums" style={size > 80 ? { fontSize: Math.round(size * 0.2) } : undefined}>{value == null ? "—" : `${Math.round(value)}%`}</span>
    </div>
  );
}
