import { cva } from "class-variance-authority";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Link from "next/link";
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { CountUp } from "./motion";
import { LogoMark } from "./logo-mark";

export { LOGO_PATHS, LogoMark } from "./logo-mark";

/** Joins class names; later Tailwind classes win over earlier conflicting ones. */
export function cn(...classes: ClassValue[]) {
  return twMerge(clsx(classes));
}

/** "Dr. Karim Haddad" → "Karim": the first name, skipping titles. */
export function firstName(name: string) {
  return name.split(/\s+/).find((part) => !/^(mr|mrs|ms|miss|mx|dr|prof|sir)\.?$/i.test(part)) ?? name;
}

type Variant = "primary" | "secondary" | "ghost" | "danger" | "live" | "soft";
type Size = "sm" | "md" | "lg" | "icon";

/** Button styles (shadcn-style variants). Also use on links: `className={buttonClass("secondary")}`. */
const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-55 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "shine bg-brand-600 text-white shadow-[var(--shadow-glow)] hover:bg-brand-700 dark:bg-brand-400 dark:text-nav dark:hover:bg-brand-300",
        secondary: "border border-line bg-surface text-ink hover:border-ink-muted/40 hover:bg-surface-2",
        soft: "bg-brand-600/10 text-brand-700 hover:bg-brand-600/15 dark:text-brand-200",
        ghost: "text-ink-muted hover:bg-surface-3/70 hover:text-ink",
        danger: "bg-danger text-white hover:brightness-110",
        live: "shine animate-pulse-ring bg-live-500 text-white hover:bg-live-600",
      },
      size: {
        sm: "h-8 rounded-lg px-3 text-xs",
        md: "h-9 rounded-lg px-3.5 text-sm sm:h-10 sm:px-4",
        lg: "h-10 rounded-xl px-5 text-sm sm:h-11 sm:text-base",
        icon: "h-9 w-9 rounded-lg",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function buttonClass(variant: Variant = "primary", size: Size = "md") {
  return buttonVariants({ variant, size });
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={cn(buttonClass(variant, size), className)} {...props} />;
}

export function Card({ className, interactive, ...props }: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-line bg-surface p-4 sm:p-5",
        interactive && "lift press",
        className,
      )}
      {...props}
    />
  );
}

/**
 * The top of a page, in one panel: a back link (on create, edit and detail
 * pages), the title with its icon and description, the page's actions beside
 * it, and the list's search and filters underneath, so nothing floats loose on
 * the page.
 */
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  icon,
  back,
  toolbar,
  meta,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
  icon?: ReactNode;
  /** Where "back" goes, e.g. { href: "/courses", label: "Courses" }. */
  back?: { href: string; label: string };
  /** Search, filters and chips (a FilterBar) shown under the title row. */
  toolbar?: ReactNode;
  /** Small facts under the description (status badges, counts). */
  meta?: ReactNode;
}) {
  return (
    <header className="mb-6 overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-soft)] sm:mb-8">
      <div className="flex flex-col gap-4 p-4 sm:p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          {icon && <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-600/10 text-brand-700 dark:text-brand-300 [&_svg]:h-5 [&_svg]:w-5">{icon}</span>}
          <div className="min-w-0">
            {back && (
              <Link href={back.href} className="group mb-1 inline-flex items-center gap-1 text-xs font-semibold text-ink-muted transition hover:text-brand-700 dark:hover:text-brand-300">
                <svg viewBox="0 0 16 16" aria-hidden className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5 rtl:rotate-180 rtl:group-hover:translate-x-0.5">
                  <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {back.label}
              </Link>
            )}
            {eyebrow && !back && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand-600 dark:text-brand-300">{eyebrow}</p>}
            <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
            {description && <p className="mt-1 max-w-2xl text-sm text-ink-muted">{description}</p>}
            {meta && <div className="mt-2.5 flex flex-wrap items-center gap-2 text-sm">{meta}</div>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 max-md:[&>*]:flex-1">{actions}</div>}
      </div>
      {toolbar && <div className="border-t border-line bg-surface-2/60 px-4 py-3.5 sm:px-5 [&>*]:mb-0">{toolbar}</div>}
    </header>
  );
}

/**
 * One block of a create or edit form: what it's about on the side, the
 * fields beside it (stacked on phones).
 */
export function FormSection({ title, description, children, className }: { title: ReactNode; description?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("grid gap-4 border-b border-line py-6 first:pt-0 last:border-0 last:pb-0 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-8", className)}>
      <div>
        <h2 className="font-display font-bold">{title}</h2>
        {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      </div>
      <div className="grid content-start gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

/** The bar at the bottom of a form page: cancel and save, kept in view while scrolling. */
export function FormActions({ children, cancel }: { children: ReactNode; cancel?: { href: string; label: string } }) {
  return (
    <div className="sticky bottom-[calc(var(--bottom-bar,0px)+0.75rem)] z-20 mt-6 flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-line bg-surface/95 p-3 shadow-[var(--shadow-lift)] backdrop-blur">
      {cancel && (
        <Link href={cancel.href} className={buttonClass("ghost")}>
          {cancel.label}
        </Link>
      )}
      {children}
    </div>
  );
}

const fieldClass =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink transition placeholder:text-ink-muted/60 hover:border-ink-muted/40 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/15";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClass, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldClass, className)} {...props} />;
}

/** Dropdowns are searchable, with × to clear an optional choice; see select.tsx. */
export { Select, type SelectItem } from "./select";

export function Field({ label, htmlFor, error, hint, children }: { label: string; htmlFor: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-ink-muted">{hint}</p>}
      {error && (
        <p className="text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

type Tone = "neutral" | "brand" | "accent" | "success" | "warning" | "danger" | "live";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-3 text-ink-muted",
  brand: "bg-brand-500/12 text-brand-700 dark:text-brand-200",
  accent: "bg-brand-500/12 text-brand-700 dark:text-brand-200",
  success: "bg-success/12 text-success",
  warning: "bg-warning/12 text-warning",
  danger: "bg-danger/12 text-danger",
  live: "bg-live-500 text-white",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium", tones[tone], className)}>
      {tone === "live" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden />}
      {children}
    </span>
  );
}

/** Kept for callers that pass `accent`; only "live" stands out, the rest use the brand tint. */
const statAccents = {
  brand: "",
  accent: "",
  live: "bg-live-500/10 text-live-600",
  amber: "",
} as const;

const meterTones: Partial<Record<Tone, string>> = { danger: "bg-danger", warning: "bg-warning", success: "bg-success" };

/**
 * A headline number. Cards in a row stretch to the same height; `meter`
 * (0–100) draws a thin bar under rates, and `href` makes the whole card a link
 * to the page behind the number.
 */
export function StatCard({
  label,
  value,
  hint,
  tone,
  icon,
  accent = "brand",
  meter,
  href,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  accent?: keyof typeof statAccents;
  meter?: number | null;
  href?: string;
}) {
  return (
    <Card className={cn("relative flex h-full flex-col overflow-hidden", href && "lift press hover:border-brand-300/70")}>
      <div className="flex items-center gap-2.5">
        {icon && <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-600/10 text-brand-700 dark:text-brand-300 [&_svg]:h-4 [&_svg]:w-4", statAccents[accent])}>{icon}</span>}
        <p className="min-w-0 text-xs font-medium leading-snug text-ink-muted sm:text-sm">{label}</p>
      </div>
      <p className={cn("mt-3 font-display text-2xl font-semibold tabular-nums tracking-tight sm:text-[1.75rem] sm:leading-9", tone === "danger" && "text-danger", tone === "success" && "text-success", tone === "warning" && "text-warning")}>
        {typeof value === "number" ? <CountUp value={value} /> : value}
      </p>
      {meter != null && (
        <span aria-hidden className="mt-2.5 block h-1.5 overflow-hidden rounded-full bg-surface-3">
          <span className={cn("block h-full rounded-full", (tone && meterTones[tone]) ?? "bg-brand-500")} style={{ width: `${Math.max(0, Math.min(100, meter))}%` }} />
        </span>
      )}
      {hint && <p className="mt-auto pt-2 text-xs text-ink-muted">{hint}</p>}
      {href && <Link href={href} aria-label={label} className="absolute inset-0 rounded-[inherit]" />}
    </Card>
  );
}

export function EmptyState({ title, description, action, icon }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-line bg-surface/50 px-5 py-9 text-center sm:py-12">
      {icon && <span className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-brand-600/10 text-brand-700 dark:text-brand-300">{icon}</span>}
      <p className="font-display font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Alert({ tone = "danger", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div role="alert" className={cn("rounded-lg px-3 py-2.5 text-sm font-medium", tones[tone])}>
      {children}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-xl", className)} />;
}

export function Avatar({ name, size = "md", className }: { name: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
  // One brand tint for everyone; two shades so neighbours still read apart.
  const shade = [...name].reduce((h, c) => h + c.charCodeAt(0), 0) % 2;
  const sizes = { sm: "h-8 w-8 text-xs", md: "h-9 w-9 text-xs", lg: "h-12 w-12 text-base" };

  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-semibold",
        shade ? "bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-100" : "bg-brand-700 text-white dark:bg-brand-300 dark:text-brand-900",
        sizes[size],
        className,
      )}
    >
      {initials}
    </span>
  );
}

/** Mark plus the bilingual wordmark: "MANARA" (gold MAN) over "منارة". */
export function Logo({ className, mark = false }: { className?: string; mark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="h-9 w-9" />
      {!mark && (
        <span className="flex flex-col items-start leading-none" translate="no">
          <span className="font-display text-[1.02rem] font-bold tracking-[0.16em]" dir="ltr">
            <span className="text-brand-600 dark:text-brand-400">MAN</span>
            <span className="text-heading">ARA</span>
          </span>
          <span lang="ar" dir="rtl" className="mt-1 text-[0.8rem] font-semibold text-brand-600 dark:text-brand-300">
            منارة
          </span>
        </span>
      )}
    </span>
  );
}
