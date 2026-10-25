import Link from "next/link";
import { CalendarCheck, GraduationCap, Play, Radio, Users, Video } from "lucide-react";
import { ArchPhoto, DoodleScatter, DoodleStar, Logo, LogoMark, Magnetic, RollingValue, RotatingWords, ScrollHighlight, ScrollProgress, Swoosh, VelocityMarquee, WordReveal, buttonClass } from "@educloud/ui";
import { Audiences, Faq, Features, Packages, Reveal, Testimonials } from "@/components/sections";
import { loadContent } from "@/lib/content";
import { getT } from "@educloud/ui/locale";
import { LOGO_ON_NAVY, LighthouseBeams } from "@/components/brand-art";
import { JsonLd, siteUrl } from "@educloud/ui/seo";

export const revalidate = 60;

function SectionTitle({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center">
      <Reveal>
        <p className="mb-3 flex flex-col items-center gap-1 text-sm font-semibold text-brand-600 dark:text-brand-300">
          {eyebrow}
          <Swoosh className="h-2 w-16" />
        </p>
      </Reveal>
      <WordReveal as="h2" text={title} className="font-display text-3xl font-bold tracking-tight sm:text-4xl" />
      {subtitle && <Reveal delay={0.15}><p className="mt-4 text-lg text-ink-muted">{subtitle}</p></Reveal>}
    </div>
  );
}

export default async function HomePage() {
  const t = await getT();
  const content = await loadContent();
  const { hero } = content;
  const base = siteUrl(3000);

  // Rich results: the company, the product with its package prices, and the FAQ.
  const structured = [
    { "@context": "https://schema.org", "@type": "Organization", name: "Manara", url: base.toString(), logo: new URL("/icon.svg", base).toString() },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Manara",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web, iOS, Android",
      description: hero.subtitle,
      offers: content.plans.map((p) => ({ "@type": "Offer", name: p.name, price: (p.price_monthly_cents / 100).toFixed(2), priceCurrency: p.currency })),
    },
    ...(content.faq.length
      ? [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: content.faq.map((q) => ({ "@type": "Question", name: q.question, acceptedAnswer: { "@type": "Answer", text: q.answer } })) }]
      : []),
  ];

  return (
    <>
      <JsonLd data={structured} />
      <ScrollProgress />
      <section className="relative overflow-hidden">
        <div className="banner-brand relative isolate overflow-hidden text-white">
          <LighthouseBeams className="-z-10" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-12 sm:pt-16 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:pb-20 lg:pt-20">
            <Reveal className="text-center lg:text-start">
              <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-300/30 bg-white/5 px-4 py-1.5 text-sm font-semibold text-brand-200">
                <span className="h-2 w-2 rounded-full bg-brand-400 shadow-[0_0_10px_2px_rgb(224_181_95/0.6)]" /> {hero.eyebrow}
              </p>
              <h1 className="text-display-xl font-display font-bold !text-white [&_.text-marked]:!text-brand-300">
                <HighlightLast text={hero.title} />
              </h1>
              <p className="mt-5 text-lg font-semibold text-nav-ink sm:text-xl">
                {t("Built for")}{" "}
                <RotatingWords className="text-brand-300" words={[t("teachers"), t("lecturers & doctors"), t("schools"), t("universities"), t("families")]} />
              </p>
              <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-nav-muted lg:mx-0">{hero.subtitle}</p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
                <Magnetic>
                  <Link href="/signup" className={`${buttonClass("primary", "lg")} rounded-full !bg-brand-400 px-7 !text-nav hover:!bg-brand-300`}>
                    {hero.primary_cta}
                  </Link>
                </Magnetic>
                <Link href="/pricing" className={`${buttonClass("secondary", "lg")} rounded-full !border-white/25 !bg-white/5 px-7 !text-white hover:!border-white/45 hover:!bg-white/10`}>
                  {hero.secondary_cta}
                </Link>
              </div>
              <p className="mt-4 text-sm text-nav-muted">{t("No credit card · Free for students and families · 6 languages")}</p>
            </Reveal>

            <Reveal delay={0.1} className="relative px-6 sm:px-10">
              <ArchPhoto
                photo="student"
                alt={t("Students & parents")}
                badge={{ icon: <GraduationCap className="h-4 w-4" />, title: t("Grade posted"), body: t("Quiz 4 · 18/20") }}
              />
              <FloatingChip className="start-0 top-[12%]" icon="video" title={t("Live now")} body={t("Calculus II · 32 joined")} tone="bg-live-500" />
              <FloatingChip className="bottom-[6%] start-[2%] [animation-delay:-3s]" icon="attendance" title={t("Attendance")} body={t("96% this week")} tone="bg-brand-600" />
            </Reveal>
          </div>
        </div>

        <VelocityMarquee className="relative border-y border-line bg-surface/60 py-4 backdrop-blur">
          {[t("Gradebook"), t("Live lectures"), t("Cloud recordings"), t("Attendance"), t("Family portal"), t("Encrypted chat"), t("Analytics"), t("Mobile apps"), t("Two-factor sign-in"), t("6 languages"), t("Offline mode"), t("Dark mode")].map((item) => (
            <span key={item} className="flex shrink-0 items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-semibold text-ink-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> {item}
            </span>
          ))}
        </VelocityMarquee>

        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-14">
          <Reveal className="mx-auto max-w-5xl">
            <HeroPreview />
          </Reveal>
        </div>
      </section>

      {content.stats.length > 0 && (
        <section className="border-y border-line bg-surface">
          <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-10 md:grid-cols-4">
            {content.stats.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.06} className="text-center">
                <dt className="sr-only">{s.label}</dt>
                <dd className="font-display text-4xl font-bold text-brand-600 dark:text-brand-300"><RollingValue value={s.value} /></dd>
                <dd className="mt-1 text-sm text-ink-muted">{s.label}</dd>
              </Reveal>
            ))}
          </dl>
        </section>
      )}

      {content.audiences.length > 0 && (
        <section id="who" className="mx-auto max-w-6xl px-4 py-24">
          <SectionTitle eyebrow={t("Built for everyone in education")} title={t("One platform, made for you")} />
          <ScrollHighlight text={t("Teachers and lecturers, schools, universities — and the students and families they serve.")} className="mx-auto -mt-4 mb-16 max-w-4xl text-center font-display text-2xl font-semibold leading-snug text-heading sm:text-4xl" />
          <Audiences audiences={content.audiences} />
        </section>
      )}

      {content.features.length > 0 && (
        <section id="features" className="app-canvas border-y border-line py-24">
          <div className="mx-auto max-w-6xl px-4">
            <SectionTitle eyebrow={t("Features")} title={t("Everything a classroom needs")} />
            <Features features={content.features} />
          </div>
        </section>
      )}

      <section id="packages" className="mx-auto max-w-6xl px-4 py-24">
        <SectionTitle eyebrow={t("Packages")} title={t("Simple, honest pricing")} subtitle={t("Every package includes the student & family portal, mobile apps and live lessons.")} />
        <Packages plans={content.plans} />
        <p className="mt-8 text-center text-sm text-ink-muted">
          {t("Need something bigger?")}{" "}<Link href="mailto:sales@manara.app" className="font-semibold text-brand-600 underline dark:text-brand-300">{t("Talk to us")}</Link>
        </p>
      </section>

      {content.testimonials.length > 0 && (
        <section className="app-canvas border-y border-line py-24">
          <div className="mx-auto max-w-6xl px-4">
            <SectionTitle eyebrow={t("Loved by educators and families")} title={t("Less paperwork, more learning")} />
            <Testimonials items={content.testimonials} />
          </div>
        </section>
      )}

      {content.faq.length > 0 && (
        <section id="faq" className="mx-auto max-w-6xl px-4 py-24">
          <SectionTitle eyebrow={t("FAQ")} title={t("Questions, answered")} />
          <Faq items={content.faq} />
        </section>
      )}

      <section className="px-4 pb-24">
        <Reveal className="banner-brand relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] px-6 py-16 text-center text-white sm:px-16">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <LighthouseBeams />
            <DoodleScatter className="absolute start-6 top-6 text-brand-300/30" />
            <DoodleStar className="absolute bottom-8 end-10 h-12 w-12 text-brand-300/40" />
          </div>
          <div className="relative">
            <LogoMark className="mx-auto mb-6 h-14 w-14 rounded-[0.9rem] shadow-[0_0_40px_-6px_rgb(224_181_95/0.55)]" />
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-brand-300">{t("Guiding every learner")}</p>
            <WordReveal as="h2" text={content.cta.title} className="font-display text-3xl font-bold !text-white sm:text-5xl" />
            <p className="mx-auto mt-4 max-w-xl text-lg text-nav-muted">{content.cta.subtitle}</p>
            <Link href="/signup" className="shine press mt-10 inline-flex h-14 items-center rounded-2xl bg-white px-8 font-bold text-brand-700 shadow-[var(--shadow-lift)] transition hover:-translate-y-0.5 hover:bg-brand-50">
              {content.cta.button}
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}

/** The headline with its last word marked in gold with the hand-drawn swoosh. */
function HighlightLast({ text }: { text: string }) {
  const words = text.trim().split(/\s+/);
  const last = words.pop();
  return (
    <>
      {words.join(" ")} <span className="text-marked">{last}</span>
    </>
  );
}

const CHIP_ICONS = { video: Video, grade: GraduationCap, attendance: CalendarCheck };

/** Small update cards floating beside the hero portrait. */
function FloatingChip({ className, icon, title, body, tone }: { className: string; icon: keyof typeof CHIP_ICONS; title: string; body: string; tone: string }) {
  const Icon = CHIP_ICONS[icon];
  return (
    <div className={`animate-float absolute z-10 hidden items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-2.5 shadow-[var(--shadow-lift)] sm:flex ${className}`}>
      <span className={`grid h-9 w-9 place-items-center rounded-xl text-white ${tone}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-start">
        <span className="block text-sm font-bold">{title}</span>
        <span className="block text-xs text-ink-muted">{body}</span>
      </span>
    </div>
  );
}

/** A stylised product preview: the dashboard with a live lesson and progress. */
async function HeroPreview() {
  const t = await getT();
  return (
    <div className="relative rounded-[2rem] border border-line bg-surface/80 p-3 shadow-[var(--shadow-soft)] backdrop-blur">
      <div className="grid overflow-hidden rounded-[1.5rem] border border-line md:grid-cols-[13rem_1fr]">
        <div className="hidden bg-nav p-5 text-start text-sm text-nav-muted md:block">
          <Logo className={`mb-6 ${LOGO_ON_NAVY}`} />
          {[t("Dashboard"), t("Courses"), t("Live lessons"), t("Messages"), t("Analytics")].map((item, i) => (
            <div key={item} className={`mb-1.5 rounded-xl px-3 py-2 ${i === 2 ? "bg-brand-600 text-white" : ""}`}>
              {item}
            </div>
          ))}
        </div>
        <div className="app-canvas p-5 text-start sm:p-7">
          <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl bg-live-500 px-4 py-3 text-sm font-semibold text-white">
            <span className="flex items-center gap-2">
              <Radio className="h-4 w-4 animate-pulse" /> {t("Live now: Calculus II — Integration by parts")}
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-live-600">{t("Join")}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: GraduationCap, label: t("Average"), value: "86%", tone: "bg-brand-600" },
              { icon: CalendarCheck, label: t("Attendance"), value: "96%", tone: "bg-brand-600" },
              { icon: Users, label: t("Students"), value: "1,248", tone: "bg-brand-600" },
            ].map(({ icon: Icon, label, value, tone }) => (
              <div key={label} className="flex items-center justify-between rounded-2xl border border-line bg-surface p-4">
                <div>
                  <p className="text-xs text-ink-muted">{label}</p>
                  <p className="font-display text-2xl font-bold">{value}</p>
                </div>
                <span className={`grid h-10 w-10 place-items-center rounded-xl text-white ${tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {[t("Physics 101 — Week 6 lecture"), t("Literature — Poetry seminar")].map((title, i) => (
              <div key={title} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
                <span className={`relative grid h-14 w-20 shrink-0 place-items-center rounded-xl ${i ? "bg-brand-800" : "bg-brand-600"}`}>
                  <Play className="h-5 w-5 fill-white text-white" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-xs text-ink-muted">{t("Recording · 48 min")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
