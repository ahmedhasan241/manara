import Link from "next/link";
import { ArrowRight, BarChart3, CalendarCheck, Check, GraduationCap, HeartHandshake, Lock, Minus, ShieldCheck, Video } from "lucide-react";
import { Card, buttonClass, cn } from "../components";
import { ArchPhoto, Swoosh } from "../imagery";
import { asKey } from "../translate";
import { getFormat, getT } from "../locale-server";
import { loadContent } from "./content";
import { Audiences, Faq, Features, Packages, PriceCalculator, Reveal, Testimonials } from "./sections";
import { SignupForm } from "./signup-form";

/*
 * Pages of the product website, shared by the marketing site and the learner
 * portal so both show the same packages, sign-up and policies (edited once,
 * from the platform admin).
 */

function Heading({ eyebrow, title, subtitle, as: Tag = "h2" }: { eyebrow: string; title: string; subtitle?: string; as?: "h1" | "h2" }) {
  return (
    <Reveal className="mx-auto mb-12 max-w-2xl text-center">
      <p className="mb-3 flex flex-col items-center gap-1 text-sm font-semibold text-brand-600 dark:text-brand-300">
        {eyebrow}
        <Swoosh className="h-2 w-16" />
      </p>
      <Tag className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</Tag>
      {subtitle && <p className="mt-4 text-lg text-ink-muted">{subtitle}</p>}
    </Reveal>
  );
}

export async function pricingMetadata() {
  const t = await getT();
  return { title: t("Packages & pricing") };
}

/** Packages, a feature comparison table and the FAQ. */
export async function PricingView() {
  const fmt = await getFormat();
  const t = await getT();
  const content = await loadContent();
  const plans = content.plans;

  const rows: { label: string; value: (p: (typeof plans)[number]) => string | boolean }[] = [
    { label: t("Students"), value: (p) => (p.max_students ? fmt.number(p.max_students) : t("Unlimited")) },
    { label: t("Staff accounts"), value: (p) => (p.max_staff ? fmt.number(p.max_staff) : t("Unlimited")) },
    { label: t("Storage for materials & recordings"), value: (p) => `${p.storage_gb} GB` },
    { label: t("Student & family portal"), value: () => true },
    {
      label: t("Live lessons (Zoom or Jitsi)"),
      value: (p) => (p.video_addon_cents == null ? true : t("Add-on · {price} / month", { price: fmt.money(p.video_addon_cents, p.currency) })),
    },
    ...(plans.some((p) => p.max_students != null && p.extra_student_cents > 0)
      ? [{ label: t("Extra student seat"), value: (p: (typeof plans)[number]) => (p.max_students == null ? t("Unlimited") : t("{price} / month", { price: fmt.money(p.extra_student_cents, p.currency) })) }]
      : []),
    ...(plans.some((p) => p.max_staff != null && p.extra_staff_cents > 0)
      ? [{ label: t("Extra staff seat"), value: (p: (typeof plans)[number]) => (p.max_staff == null ? t("Unlimited") : t("{price} / month", { price: fmt.money(p.extra_staff_cents, p.currency) })) }]
      : []),
    { label: t("Encrypted messaging"), value: () => true },
    ...[...new Set(plans.flatMap((p) => p.features ?? []))]
      // "Everything in School" lines describe tiers, not features.
      .filter((f) => !plans.some((p) => p.includes_previous && p.features?.[0] === f))
      .map((feature) => ({ label: feature, value: (p: (typeof plans)[number]) => plans.indexOf(p) >= plans.findIndex((q) => q.features?.includes(feature)) })),
  ];

  return (
    <>
      <section className="band-peach">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <Heading as="h1" eyebrow={t("Packages")} title={t("Pick the package that fits")} subtitle={t("Every package starts with a 14-day free trial. Students and families always use Manara for free.")} />
          <Packages plans={plans} />
        </div>
      </section>

      {plans.length > 0 && (
        <section id="calculator" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-20">
          <Heading eyebrow={t("Estimate your price")} title={t("What would you pay?")} subtitle={t("Enter your number of students and staff. Extra seats and video meetings are added to the package price.")} />
          <PriceCalculator plans={plans} />
        </section>
      )}

      {plans.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="mb-6 text-center font-display text-2xl font-bold">{t("Compare packages")}</h2>
          <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-soft)]">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-2">
                  <th className="px-6 py-4 text-start font-semibold text-ink-muted">{t("Feature")}</th>
                  {plans.map((p) => (
                    <th key={p.id} className="px-6 py-4 text-center font-display text-base font-bold">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-b border-line transition-colors last:border-0 hover:bg-brand-50/50 dark:hover:bg-surface-3/40">
                    <td className="px-6 py-3.5 font-medium">{row.label}</td>
                    {plans.map((p) => {
                      const v = row.value(p);
                      return (
                        <td key={p.id} className="px-6 py-3.5 text-center">
                          {v === true ? (
                            <Check className="mx-auto h-5 w-5 text-brand-500" aria-label={t("Included")} />
                          ) : v === false ? (
                            <Minus className="mx-auto h-5 w-5 text-ink-muted/40" aria-label={t("Not included")} />
                          ) : (
                            v
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {content.faq.length > 0 && (
        <section id="faq" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-24">
          <h2 className="mb-8 text-center font-display text-2xl font-bold">{t("Questions")}</h2>
          <Faq items={content.faq} />
        </section>
      )}
    </>
  );
}

export async function signupMetadata() {
  const t = await getT();
  return { title: t("Start your free trial") };
}

/** Workspace sign-up for teachers, schools and universities, beside a photo and what's included. */
export async function SignupView({ plan, type, interval }: { plan?: string; type?: string; interval?: string }) {
  const t = await getT();
  const { plans } = await loadContent();
  const chosen = plans.find((p) => p.code === plan) ?? plans[0];
  const videoAddon = chosen ? { cents: chosen.video_addon_cents, currency: chosen.currency } : null;
  const billing = interval === "yearly" || interval === "monthly" ? interval : undefined;
  return (
    <section className="band-peach">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-[1fr_28rem] lg:py-20">
        <Reveal className="hidden lg:block">
          <h1 className="font-display text-4xl font-bold tracking-tight">{t("Start your free trial")}</h1>
          <p className="mt-3 text-lg text-ink-muted">{t("14 days free. No credit card needed.")}</p>
          <ul className="mt-8 grid grid-cols-2 gap-3 text-sm">
            {[
              { icon: GraduationCap, text: t("Gradebook & attendance") },
              { icon: Video, text: t("Live lectures & recordings") },
              { icon: HeartHandshake, text: t("Parent portal") },
              { icon: BarChart3, text: t("Analytics") },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-[var(--shadow-soft)]">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
          <ArchPhoto photo="teacher" alt="" className="mt-10 max-w-[16rem]" badge={{ icon: <CalendarCheck className="h-4 w-4" />, title: t("Set up your classroom in five minutes") }} />
        </Reveal>
        <div>
          <div className="mb-6 text-center lg:hidden">
            <h1 className="font-display text-3xl font-bold tracking-tight">{t("Start your free trial")}</h1>
            <p className="mt-2 text-ink-muted">{t("14 days free. No credit card needed.")}</p>
          </div>
          <SignupForm plan={plan} type={type} interval={billing} videoAddon={videoAddon} />
        </div>
      </div>
    </section>
  );
}

const SECURITY_POINTS = [
  ["Two-factor sign-in", "Authenticator-app codes with one-time recovery codes. Schools can require it for all staff. The mobile app adds fingerprint and Face ID unlock."],
  ["Role-based access", "Owners, admins, teachers, students and parents each see only what their role allows. Students and parents only ever see their own records."],
  ["Encryption", "All traffic uses TLS. Sensitive fields such as feedback and phone numbers are encrypted in the database, and storage is encrypted at rest."],
  ["Private messages (coming soon)", "Messages between teachers, students and parents will be end-to-end encrypted: only the people in the conversation can read them."],
  ["Audit trail", "Every change to grades and attendance is logged with who, when and from where. Users can review their own sign-in activity."],
  ["Your data, your rights", "Export your data at any time, and delete your account. We follow GDPR and local data protection laws, and offer data residency on the University plan."],
  ["Backups and uptime", "Automatic daily backups with point-in-time recovery, and redundant servers across availability zones."],
] as const;

export async function securityMetadata() {
  const t = await getT();
  return { title: t("Security & privacy") };
}

export async function SecurityView() {
  const t = await getT();
  return (
    <>
      <section className="band-peach">
        <div className="mx-auto flex max-w-4xl flex-col items-center px-4 py-16 text-center">
          <span className="mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-brand-600 text-white shadow-[var(--shadow-glow)]">
            <ShieldCheck className="h-8 w-8" />
          </span>
          <h1 className="font-display text-4xl font-bold tracking-tight">{t("Security & privacy")}</h1>
          <p className="mt-4 max-w-xl text-lg text-ink-muted">{t("Academic records are sensitive. Here is how we protect them.")}</p>
        </div>
      </section>
      <section className="mx-auto max-w-4xl px-4 py-16">
        <div className="reveal-children grid gap-4 sm:grid-cols-2">
          {SECURITY_POINTS.map(([title, body]) => (
            <Card key={title} interactive className="flex gap-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                <Lock className="h-4 w-4" />
              </span>
              <div>
                <h2 className="font-semibold">{t(asKey(title))}</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t(asKey(body))}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}

export async function aboutMetadata() {
  const t = await getT();
  const { hero } = await loadContent();
  return { title: t("About"), description: hero.subtitle };
}

/**
 * The product story for the learner portal: the website hero, numbers, who
 * it's for, features, what people say, the FAQ and a call to action.
 * `signupHref` is where "start" buttons go in this app.
 */
export async function AboutView({ signupHref = "/signup", pricingHref = "/pricing" }: { signupHref?: string; pricingHref?: string }) {
  const t = await getT();
  const content = await loadContent();
  const { hero } = content;

  return (
    <>
      <section className="band-peach relative overflow-hidden">
        <div aria-hidden className="absolute -end-24 -top-24 h-80 w-80 rounded-full border-2 border-dashed border-brand-200 dark:border-brand-900" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-[1.1fr_1fr] lg:py-20">
          <Reveal>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-surface px-4 py-1.5 text-sm font-semibold text-brand-700 shadow-[var(--shadow-soft)] dark:text-brand-200">
              <span className="h-2 w-2 rounded-full bg-brand-500" /> {hero.eyebrow}
            </p>
            <h1 className="text-display-xl font-display font-bold">{hero.title}</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-muted">{hero.subtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={signupHref} className={cn(buttonClass("primary", "lg"), "rounded-full px-7")}>
                {hero.primary_cta}
              </Link>
              <Link href={pricingHref} className={cn(buttonClass("secondary", "lg"), "rounded-full px-7")}>
                {hero.secondary_cta}
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.1} className="px-8">
            <ArchPhoto photo="classroom" alt="" badge={{ icon: <GraduationCap className="h-4 w-4" />, title: t("Grade posted"), body: t("Quiz 4 · 18/20") }} />
          </Reveal>
        </div>
      </section>

      {content.stats.length > 0 && (
        <section className="border-b border-line bg-surface">
          <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-10 md:grid-cols-4">
            {content.stats.map((s) => (
              <div key={s.label} className="reveal text-center">
                <dt className="sr-only">{s.label}</dt>
                <dd className="font-display text-4xl font-bold text-brand-500 dark:text-brand-400">{s.value}</dd>
                <dd className="mt-1 text-sm text-ink-muted">{s.label}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {content.audiences.length > 0 && (
        <section id="who" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20">
          <Heading eyebrow={t("Built for everyone in education")} title={t("One platform, made for you")} subtitle={t("Teachers and lecturers, schools, universities — and the students and families they serve.")} />
          <Audiences audiences={content.audiences} />
        </section>
      )}

      {content.features.length > 0 && (
        <section id="features" className="border-y border-line bg-surface py-20">
          <div className="mx-auto max-w-6xl px-4">
            <Heading eyebrow={t("Features")} title={t("Everything a classroom needs")} />
            <Features features={content.features} />
          </div>
        </section>
      )}

      {content.testimonials.length > 0 && (
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-4">
            <Heading eyebrow={t("Loved by educators and families")} title={t("Less paperwork, more learning")} />
            <Testimonials items={content.testimonials} />
          </div>
        </section>
      )}

      {content.faq.length > 0 && (
        <section id="faq" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-20">
          <Heading eyebrow={t("FAQ")} title={t("Questions, answered")} />
          <Faq items={content.faq} />
        </section>
      )}

      <section className="px-4 pb-24">
        <Reveal className="banner-brand relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] px-6 py-16 text-center text-white sm:px-16">
          <h2 className="font-display text-3xl font-bold !text-white sm:text-4xl">{content.cta.title}</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/85">{content.cta.subtitle}</p>
          <Link href={signupHref} className="press mt-10 inline-flex h-14 items-center gap-2 rounded-2xl bg-white px-8 font-bold text-brand-700 shadow-[var(--shadow-lift)] transition hover:bg-brand-50">
            {content.cta.button} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </Link>
        </Reveal>
      </section>
    </>
  );
}
