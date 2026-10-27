"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  BarChart3,
  CalendarCheck,
  Check,
  ChevronDown,
  FolderOpen,
  Globe,
  GraduationCap,
  HeartHandshake,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  Video,
  type LucideIcon,
} from "lucide-react";
import { type MarketingContent, type Plan } from "@educloud/api-client";
import { buttonClass, cn } from "../components";
import { ArchPhoto, PhotoTile, type PhotoName } from "../imagery";
import { DoodleStar } from "../doodles";
import { StackedCards } from "../kinetic";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Switch } from "../primitives";
import { useFormat, useT } from "../i18n-provider";

const FEATURE_ICONS: Record<string, LucideIcon> = {
  video: Video,
  grades: GraduationCap,
  attendance: CalendarCheck,
  family: HeartHandshake,
  messages: MessageCircle,
  analytics: BarChart3,
  security: ShieldCheck,
  mobile: Smartphone,
  materials: FolderOpen,
  globe: Globe,
};

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "0px 0px -40px 0px" },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
};

export function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div {...reveal} transition={{ ...reveal.transition, delay }} className={className}>
      {children}
    </motion.div>
  );
}

const AUDIENCE_PHOTOS: Record<string, PhotoName> = { teacher: "teacher", school: "kidsClass", university: "university", family: "parentChild" };

/** "Who it's for": photo tiles that switch between teachers, schools, universities and families. */
export function Audiences({ audiences }: { audiences: MarketingContent["audiences"] }) {
  const t = useT();
  const [active, setActive] = useState(audiences[0]?.key);
  const current = audiences.find((a) => a.key === active) ?? audiences[0];
  if (!current) return null;

  return (
    <div>
      <div className="-mx-4 mb-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4" role="tablist" aria-label={t("Who Manara is for")}>
        {audiences.map((a) => {
          const selected = a.key === current.key;
          return (
            <button
              key={a.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(a.key)}
              className={cn("press w-[70%] shrink-0 snap-start rounded-2xl text-start outline-offset-4 transition-shadow sm:w-auto", selected && "ring-4 ring-brand-500 ring-offset-2 ring-offset-surface-2")}
            >
              <PhotoTile photo={AUDIENCE_PHOTOS[a.key] ?? "classroom"} title={a.title} className="aspect-[4/3]">
                <span className={cn("absolute end-3 top-3 grid h-8 w-8 place-items-center rounded-full transition-colors", selected ? "bg-brand-600 text-white" : "bg-white/85 text-ink")}>
                  <Check className={cn("h-4 w-4 transition-opacity", selected ? "opacity-100" : "opacity-0")} />
                </span>
              </PhotoTile>
            </button>
          );
        })}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={current.key}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.35 }}
          className="band-peach mx-auto grid max-w-6xl items-center gap-10 rounded-[2rem] p-8 md:grid-cols-[16rem_1fr_1fr] md:p-12"
        >
          <ArchPhoto photo={AUDIENCE_PHOTOS[current.key] ?? "classroom"} alt="" className="hidden max-w-[15rem] md:block" />
          <div>
            <h3 className="font-display text-3xl font-bold">{current.title}</h3>
            <p className="mt-3 text-lg text-ink-muted">{current.subtitle}</p>
            <Link href={current.key === "family" ? "/signup" : `/signup?type=${current.key}`} className={cn(buttonClass("primary", "lg"), "mt-8")}>
              {current.key === "family" ? t("Ask your school to join") : t("Start free trial")}
            </Link>
          </div>
          <ul className="space-y-3">
            {current.benefits.map((b, i) => (
              <motion.li
                key={b}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 * i }}
                className="flex items-start gap-3 rounded-2xl bg-surface p-4 shadow-[var(--shadow-soft)]"
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-600 text-white">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span className="font-medium">{b}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function Features({ features }: { features: MarketingContent["features"] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {features.map((f, i) => {
        const Icon = FEATURE_ICONS[f.icon] ?? Globe;
        return (
          <Reveal key={f.title} delay={(i % 4) * 0.06} className="h-full">
            <div className="lift group h-full rounded-[var(--radius-card)] bg-brand-50 p-6 dark:bg-surface">
              <span className="mb-5 grid h-12 w-12 place-items-center rounded-full bg-surface text-brand-500 shadow-[var(--shadow-soft)] transition-colors duration-300 group-hover:bg-brand-600 group-hover:text-white">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{f.body}</p>
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}

/** Packages with a monthly / yearly switch. The middle plan is highlighted. */
export function Packages({ plans }: { plans: Plan[] }) {
  const fmt = useFormat();
  const t = useT();
  const [yearly, setYearly] = useState(false);
  if (plans.length === 0) return <p className="text-center text-ink-muted">{t("Packages are loading. Please try again in a moment.")}</p>;
  const featured = plans.length >= 3 ? 1 : 0;

  return (
    <div>
      <div className="mb-10 flex items-center justify-center gap-3 text-sm font-semibold">
        <span className={cn(!yearly && "text-ink", yearly && "text-ink-muted")}>{t("Monthly")}</span>
        <button
          type="button"
          role="switch"
          aria-checked={yearly}
          aria-label={t("Bill yearly")}
          onClick={() => setYearly((y) => !y)}
          className={cn("relative h-8 w-14 rounded-full transition-colors", yearly ? "bg-brand-600" : "bg-surface-3")}
        >
          <motion.span layout className={cn("absolute top-1 h-6 w-6 rounded-full bg-white shadow", yearly ? "end-1" : "start-1")} transition={{ type: "spring", stiffness: 500, damping: 32 }} />
        </button>
        <span className={cn(yearly ? "text-ink" : "text-ink-muted")}>
          {t("Yearly")}{" "}<span className="ms-1 rounded-full bg-accent-500/15 px-2 py-0.5 text-xs text-accent-600 dark:text-accent-400">{t("2 months free")}</span>
        </span>
      </div>

      <div className={cn("mx-auto grid max-w-6xl gap-6", plans.length >= 3 ? "lg:grid-cols-3" : "md:grid-cols-2")}>
        {plans.map((plan, i) => {
          const isFeatured = i === featured;
          const cents = yearly && plan.price_yearly_cents ? tidy(plan.price_yearly_cents / 12) : plan.price_monthly_cents;
          return (
            <Reveal key={plan.id} delay={i * 0.08}>
              <div
                className={cn(
                  "relative flex h-full flex-col rounded-[2rem] border p-8 transition-all duration-300 hover:-translate-y-1",
                  isFeatured ? "border-transparent bg-nav text-white shadow-[var(--shadow-glow)]" : "border-line bg-surface shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-lift)]",
                )}
              >
                {isFeatured && (
                  <>
                    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem]">
                      <DoodleStar className="absolute end-5 top-5 h-9 w-9 text-accent-400" />
                    </div>
                    <span className="absolute -top-3 start-8 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white shadow">{t("Most popular")}</span>
                  </>
                )}
                <div className="relative flex-1">
                  <h3 className="font-display text-2xl font-bold">{plan.name}</h3>
                  <p className={cn("mt-1 text-sm", isFeatured ? "text-white/70" : "text-ink-muted")}>{plan.description}</p>
                  <p className="mt-6 flex flex-wrap items-baseline gap-x-1.5">
                    <AnimatePresence mode="wait">
                      <motion.span key={`${plan.id}-${yearly}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="whitespace-nowrap font-display text-4xl font-bold tracking-tight xl:text-5xl">
                        {fmt.money(cents, plan.currency)}
                      </motion.span>
                    </AnimatePresence>
                    <span className={cn("whitespace-nowrap text-sm", isFeatured ? "text-white/70" : "text-ink-muted")}>{t("/ month")}</span>
                  </p>
                  <p className={cn("text-xs", isFeatured ? "text-white/60" : "text-ink-muted")}>
                    {yearly ? t("{price} billed yearly", { price: fmt.money(plan.price_yearly_cents, plan.currency) }) : t("Billed monthly · cancel anytime")}
                  </p>
                  <PlanExtras plan={plan} yearly={yearly} featured={isFeatured} />
                  <ul className="mt-8 space-y-3 text-sm">
                    {[
                      plan.max_students ? t("Up to {count} students", { count: plan.max_students }) : t("Unlimited students"),
                      plan.max_staff ? t("{count} staff accounts", { count: plan.max_staff }) : t("Unlimited staff"),
                      t("{count} GB for materials & recordings", { count: plan.storage_gb }),
                      ...(plan.features ?? []),
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check className={cn("mt-0.5 h-4 w-4 shrink-0", isFeatured ? "text-accent-400" : "text-accent-600")} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  href={`/signup?plan=${plan.code}${yearly ? "&interval=yearly" : ""}`}
                  className={cn("relative mt-8 w-full", isFeatured ? cn(buttonClass("secondary", "lg"), "border-white bg-white text-brand-700 hover:bg-brand-50") : buttonClass("primary", "lg"))}
                >
                  {t("Start 14-day free trial")}
                </Link>
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}

/** Rounds a price spread over months: whole units from 10 up (1,249 rather than 1,249.17), cents below. */
const tidy = (cents: number) => (cents >= 1000 ? Math.round(cents / 100) * 100 : Math.round(cents));

/** A monthly price per month: as is, or its yearly price (10 months) spread over 12. */
const perMonth = (monthlyCents: number, yearly: boolean) => (yearly ? tidy((monthlyCents * 10) / 12) : monthlyCents);

/** The video meetings add-on and extra seats under a plan's price. */
function PlanExtras({ plan, yearly, featured }: { plan: Plan; yearly: boolean; featured: boolean }) {
  const fmt = useFormat();
  const t = useT();
  const muted = featured ? "text-white/70" : "text-ink-muted";
  const money = (cents: number) => fmt.money(perMonth(cents, yearly), plan.currency);
  const seats = [
    plan.max_students != null && plan.extra_student_cents > 0 ? t("Extra student: {price} / month", { price: money(plan.extra_student_cents) }) : null,
    plan.max_staff != null && plan.extra_staff_cents > 0 ? t("Extra staff member: {price} / month", { price: money(plan.extra_staff_cents) }) : null,
  ].filter((s): s is string => !!s);

  return (
    <div className={cn("mt-5 space-y-2 rounded-2xl p-3.5 text-sm", featured ? "bg-white/10" : "bg-surface-2")}>
      <p className="flex items-start gap-2.5">
        <Video className={cn("mt-0.5 h-4 w-4 shrink-0", featured ? "text-accent-400" : "text-brand-500")} />
        {plan.video_addon_cents == null ? (
          <span className="font-medium">{t("Video meetings included")}</span>
        ) : (
          <span>
            <span className="font-medium">{t("Video meetings add-on")}</span>{" "}
            <span className="whitespace-nowrap font-semibold">{t("+{price} / month", { price: money(plan.video_addon_cents) })}</span>
            <span className={cn("block text-xs", muted)}>{t("Free during the 14-day trial")}</span>
          </span>
        )}
      </p>
      {seats.length > 0 && (
        <ul className={cn("space-y-0.5 ps-6.5 text-xs", muted)}>
          {seats.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** What a plan costs per billing interval for this many students and staff, with or without video meetings. */
export function planTotal(plan: Plan, { students, staff, video, yearly }: { students: number; staff: number; video: boolean; yearly: boolean }) {
  const extraStudents = plan.max_students == null ? 0 : Math.max(0, students - plan.max_students);
  const extraStaff = plan.max_staff == null ? 0 : Math.max(0, staff - plan.max_staff);
  const months = yearly ? 10 : 1;
  const base = yearly ? plan.price_yearly_cents : plan.price_monthly_cents;
  const studentsCents = extraStudents * plan.extra_student_cents * months;
  const staffCents = extraStaff * plan.extra_staff_cents * months;
  const videoCents = video && plan.video_addon_cents != null ? plan.video_addon_cents * months : 0;
  return { base, extraStudents, extraStaff, studentsCents, staffCents, videoCents, total: base + studentsCents + staffCents + videoCents };
}

const toCount = (value: string) => Math.max(0, Math.floor(Number(value) || 0));

/** "What would I pay?": students, staff, video meetings and billing in; the cheapest fitting package out. */
export function PriceCalculator({ plans }: { plans: Plan[] }) {
  const fmt = useFormat();
  const t = useT();
  const [students, setStudents] = useState("100");
  const [staff, setStaff] = useState("10");
  const [video, setVideo] = useState(false);
  const [yearly, setYearly] = useState(false);
  if (plans.length === 0) return null;

  const input = { students: toCount(students), staff: toCount(staff), video, yearly };
  const quotes = plans.map((plan) => ({ plan, ...planTotal(plan, input) }));
  const best = quotes.reduce((a, b) => (b.total < a.total ? b : a));
  const period = (cents: number, currency: string) =>
    yearly ? t("{price} / year", { price: fmt.money(cents, currency) }) : t("{price} / month", { price: fmt.money(cents, currency) });
  const fieldClass = "h-12 w-full rounded-xl border border-line bg-surface px-4 text-base font-semibold outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15";

  return (
    <div className="mx-auto grid max-w-5xl gap-6 rounded-[2rem] border border-line bg-surface p-6 shadow-[var(--shadow-soft)] sm:p-8 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm font-medium">
            {t("Number of students")}
            <input type="number" inputMode="numeric" min={0} value={students} onChange={(e) => setStudents(e.target.value)} className={cn(fieldClass, "mt-1.5")} />
          </label>
          <label className="block text-sm font-medium">
            {t("Number of staff")}
            <input type="number" inputMode="numeric" min={0} value={staff} onChange={(e) => setStaff(e.target.value)} className={cn(fieldClass, "mt-1.5")} />
          </label>
        </div>
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl bg-surface-2 p-4">
          <span className="flex items-start gap-3">
            <Video className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
            <span>
              <span className="block text-sm font-semibold">{t("Video meetings")}</span>
              <span className="block text-xs text-ink-muted">{t("Live lessons over Zoom or Jitsi")}</span>
            </span>
          </span>
          <Switch checked={video} onCheckedChange={setVideo} aria-label={t("Video meetings")} />
        </label>
        <div className="flex rounded-2xl bg-surface-2 p-1 text-sm font-semibold" role="radiogroup" aria-label={t("Bill yearly")}>
          {[false, true].map((y) => (
            <button
              key={String(y)}
              type="button"
              role="radio"
              aria-checked={yearly === y}
              onClick={() => setYearly(y)}
              className={cn("flex-1 rounded-xl px-4 py-2.5 transition-colors", yearly === y ? "bg-surface text-ink shadow-[var(--shadow-soft)]" : "text-ink-muted hover:text-ink")}
            >
              {y ? t("Yearly") : t("Monthly")}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col rounded-[1.5rem] bg-nav p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-400">{t("Best fit")}</p>
        <h3 className="mt-1 font-display text-2xl font-bold !text-white">{best.plan.name}</h3>
        <AnimatePresence mode="wait">
          <motion.p key={`${best.plan.id}-${best.total}-${yearly}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mt-3 font-display text-4xl font-bold tracking-tight">
            {period(best.total, best.plan.currency)}
          </motion.p>
        </AnimatePresence>
        <dl className="mt-4 space-y-1.5 text-sm text-white/75">
          <div className="flex justify-between gap-4">
            <dt>{best.plan.name}</dt>
            <dd>{fmt.money(best.base, best.plan.currency)}</dd>
          </div>
          {best.studentsCents > 0 && (
            <div className="flex justify-between gap-4">
              <dt>{t("Extra students: {count}", { count: fmt.number(best.extraStudents) })}</dt>
              <dd>{fmt.money(best.studentsCents, best.plan.currency)}</dd>
            </div>
          )}
          {best.staffCents > 0 && (
            <div className="flex justify-between gap-4">
              <dt>{t("Extra staff: {count}", { count: fmt.number(best.extraStaff) })}</dt>
              <dd>{fmt.money(best.staffCents, best.plan.currency)}</dd>
            </div>
          )}
          {video && (
            <div className="flex justify-between gap-4">
              <dt>{t("Video meetings")}</dt>
              <dd>{best.plan.video_addon_cents == null ? t("Included") : fmt.money(best.videoCents, best.plan.currency)}</dd>
            </div>
          )}
        </dl>
        {quotes.length > 1 && (
          <ul className="mt-5 space-y-1 border-t border-white/15 pt-4 text-xs text-white/60">
            {quotes
              .filter((q) => q.plan.id !== best.plan.id)
              .map((q) => (
                <li key={q.plan.id} className="flex justify-between gap-4">
                  <span>{q.plan.name}</span>
                  <span>{period(q.total, q.plan.currency)}</span>
                </li>
              ))}
          </ul>
        )}
        <Link
          href={`/signup?plan=${best.plan.code}${yearly ? "&interval=yearly" : ""}`}
          className={cn(buttonClass("secondary", "lg"), "mt-6 w-full border-white bg-white text-brand-700 hover:bg-brand-50")}
        >
          {t("Start 14-day free trial")}
        </Link>
        {video && best.plan.video_addon_cents != null && <p className="mt-2 text-center text-xs text-white/60">{t("Video meetings are free during the 14-day trial.")}</p>}
      </div>
    </div>
  );
}

/** Quotes that pin and stack like a deck of index cards as you scroll (a plain list on phones). */
export function Testimonials({ items }: { items: MarketingContent["testimonials"] }) {
  return (
    <StackedCards className="mx-auto max-w-3xl" top={110}>
      {items.map((t, i) => (
        <figure
          key={t.name}
          className={cn(
            "relative flex min-h-[18rem] flex-col overflow-hidden rounded-[2rem] border p-8 shadow-[var(--shadow-lift)] sm:p-10",
            i % 3 === 1 ? "border-transparent bg-nav text-white" : i % 3 === 2 ? "border-transparent bg-brand-700 text-white" : "border-line bg-surface",
          )}
        >
          <span aria-hidden className={cn("absolute -end-4 -top-10 font-display text-[11rem] leading-none", i % 3 ? "text-white/10" : "text-brand-100 dark:text-brand-900")}>“</span>
          <span aria-hidden className={cn("mb-6 font-mono text-xs font-semibold tracking-widest", i % 3 ? "text-white/60" : "text-ink-muted")}>
            {String(i + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
          </span>
          <blockquote className="relative flex-1 font-display text-xl font-medium leading-relaxed sm:text-2xl">{t.quote}</blockquote>
          <figcaption className="relative mt-8 flex items-center gap-3 text-sm">
            <span className={cn("grid h-10 w-10 place-items-center rounded-full font-bold", i % 3 ? "bg-white/15" : "bg-brand-600 text-white")}>{t.name.charAt(0)}</span>
            <span>
              <span className="block font-semibold">{t.name}</span>
              <span className={i % 3 ? "text-white/70" : "text-ink-muted"}>{t.role}</span>
            </span>
          </figcaption>
        </figure>
      ))}
    </StackedCards>
  );
}

export function Faq({ items }: { items: MarketingContent["faq"] }) {
  return (
    <Accordion type="single" collapsible defaultValue="faq-0" className="mx-auto max-w-3xl rounded-[var(--radius-card)] border border-line bg-surface px-4 sm:px-6">
      {items.map((item, i) => (
        <AccordionItem key={item.question} value={`faq-${i}`} className="last:border-b-0">
          <AccordionTrigger className="sm:text-base">{item.question}</AccordionTrigger>
          <AccordionContent className="sm:text-[0.9375rem]">{item.answer}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
