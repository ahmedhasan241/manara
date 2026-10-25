import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, Building2, CalendarDays, Clock3, FileText, PlayCircle, Star, Users } from "lucide-react";
import { ApiError } from "@educloud/api-client";
import { Avatar, FadeIn, SectionHeading, Stagger, StaggerItem, Stars, asKey, buttonClass, cn } from "@educloud/ui";
import { getI18n } from "@educloud/ui/locale";
import { JsonLd, siteUrl } from "@educloud/ui/seo";
import { PreviewButton, type PreviewItem } from "@/components/site/buy-box";
import { SectionNav } from "@/components/site/course-tools";
import { InstructorAvatar } from "@/components/site/instructor-card";
import { MarketCourseCard } from "@/components/site/market-card";
import { ORG_LABELS, formatDuration, getViewer } from "@/lib/viewer";

async function load(id: string) {
  const { api } = await getViewer();
  return api.catalogInstructor(Number(id)).catch((error) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const instructor = await load((await params).id).catch(() => null);
  if (!instructor) return {};
  return { title: instructor.name, description: instructor.headline ?? instructor.bio?.slice(0, 160) };
}

/**
 * A teacher's or doctor's page: who they are, their numbers, what they
 * teach, every course, free lessons anyone can watch and what learners say.
 */
export default async function InstructorPage({ params }: { params: Promise<{ id: string }> }) {
  const { t, fmt } = await getI18n();
  const { id } = await params;
  const instructor = await load(id);
  const previews: PreviewItem[] = instructor.previews.map((p) => ({ id: p.id, title: p.title, duration: formatDuration(p.duration_seconds, t) }));
  const home = instructor.organizations[0];
  const sections = [
    { id: "about", label: t("Overview") },
    { id: "courses", label: t("Courses") },
    ...(previews.length ? [{ id: "free-lessons", label: t("Free preview") }] : []),
    ...(instructor.reviews.length ? [{ id: "reviews", label: t("Reviews") }] : []),
  ];

  const stats = [
    { icon: BookOpen, value: fmt.number(instructor.courses.length), label: t("Courses") },
    { icon: Users, value: fmt.number(instructor.students), label: t("Learners") },
    { icon: PlayCircle, value: fmt.number(instructor.lectures_count), label: t("Video lessons") },
    { icon: Clock3, value: fmt.number(Math.max(1, Math.round(instructor.duration_seconds / 3600))), label: t("Hours of learning") },
    { icon: Star, value: instructor.rating !== null ? fmt.number(instructor.rating, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : t("New"), label: t("Rating") },
  ];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: instructor.name,
          jobTitle: instructor.headline ?? undefined,
          description: instructor.bio ?? undefined,
          url: new URL(`/instructor/${instructor.id}`, siteUrl(3004)).toString(),
          ...(home ? { worksFor: { "@type": "Organization", name: home.name } } : {}),
        }}
      />

      {/* Who they are */}
      <section className="band-peach relative overflow-hidden">
        <div aria-hidden className="absolute -end-24 -top-24 h-80 w-80 rounded-full border-2 border-dashed border-brand-200 dark:border-brand-900" />
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 px-4 pb-24 pt-12 sm:px-6 md:grid-cols-[auto_1fr] md:gap-12 lg:px-8">
          <FadeIn className="mx-auto">
            <InstructorAvatar name={instructor.name} size="lg" />
          </FadeIn>
          <FadeIn delay={0.08} className="text-center md:text-start">
            <Link href="/instructors" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300">
              {t("Teachers & doctors")}
            </Link>
            <h1 className="text-display-lg font-display font-bold">{instructor.name}</h1>
            {instructor.headline && <p className="mt-2 text-lg text-ink-muted">{instructor.headline}</p>}
            <div className="mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
              {instructor.organizations.map((o) => (
                <Link key={o.slug} href={`/explore?organization=${o.slug}`} className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm shadow-[var(--shadow-soft)] transition-colors hover:text-brand-700 dark:hover:text-brand-300">
                  <Building2 className="h-4 w-4 text-brand-500" /> {o.name} <span className="text-ink-muted">· {t(ORG_LABELS[o.type])}</span>
                </Link>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-3 md:justify-start">
              <a href="#courses" className={cn(buttonClass("primary", "lg"), "rounded-full px-6")}>
                <BookOpen className="h-4 w-4" /> {t("Courses by {name}", { name: instructor.name })}
              </a>
              {previews[0] && (
                <PreviewButton lectureId={previews[0].id} title={previews[0].title} previews={previews} className={cn(buttonClass("secondary", "lg"), "rounded-full px-6")}>
                  <PlayCircle className="h-4 w-4 text-brand-500" /> {t("Watch a free lesson")}
                </PreviewButton>
              )}
            </div>
          </FadeIn>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Numbers */}
        <Stagger className="relative z-10 -mt-12 grid grid-cols-2 gap-3 rounded-[1.75rem] border border-line bg-surface p-4 shadow-[var(--shadow-lift)] sm:grid-cols-3 sm:p-6 lg:grid-cols-5">
          {stats.map(({ icon: Icon, value, label }) => (
            <StaggerItem key={label} className="flex items-center gap-3 rounded-2xl p-2">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                <Icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-display text-xl font-bold text-heading">{value}</span>
                <span className="text-xs text-ink-muted">{label}</span>
              </span>
            </StaggerItem>
          ))}
        </Stagger>

        <div className="mt-10 space-y-14 pb-6">
          <SectionNav sections={sections} />

          {/* About */}
          <section id="about" className="grid scroll-mt-36 grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
            <div className="rounded-[1.5rem] border border-line bg-surface p-6 sm:p-8">
              <h2 className="font-display text-xl font-bold">{t("About {name}", { name: instructor.name })}</h2>
              {instructor.bio ? <p className="mt-3 whitespace-pre-line leading-relaxed text-ink-muted">{instructor.bio}</p> : instructor.headline && <p className="mt-3 text-ink-muted">{instructor.headline}</p>}
              {instructor.teaching_since && (
                <p className="mt-5 inline-flex items-center gap-2 text-sm text-ink-muted">
                  <CalendarDays className="h-4 w-4 text-brand-500" /> {t("Teaching on Manara since {date}", { date: fmt.date(instructor.teaching_since) })}
                </p>
              )}
            </div>
            <div className="band-peach rounded-[1.5rem] p-6 sm:p-8">
              <h2 className="font-display text-lg font-bold">{t("Teaches")}</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {instructor.categories.map((c) => (
                  <Link key={c} href={`/explore?category=${encodeURIComponent(c)}`} className="press rounded-full bg-surface px-4 py-2 text-sm font-semibold shadow-[var(--shadow-soft)] transition-colors hover:text-brand-700 dark:hover:text-brand-300">
                    {t(asKey(c))}
                  </Link>
                ))}
              </div>
              {instructor.rating !== null && (
                <p className="mt-6 flex items-center gap-2 text-sm">
                  <Stars value={instructor.rating} /> <span className="text-ink-muted">{t("{count} reviews", { count: instructor.reviews_count })}</span>
                </p>
              )}
            </div>
          </section>

          {/* Courses */}
          <section id="courses" className="scroll-mt-36">
            <SectionHeading
              title={t("Courses by {name}", { name: instructor.name })}
              description={`${t("{count} courses", { count: instructor.courses.length })} · ${t("{duration} total", { duration: formatDuration(instructor.duration_seconds, t) })}`}
              href={home ? `/explore?organization=${home.slug}` : undefined}
              linkLabel={home ? t("See all courses from {name}", { name: home.name }) : undefined}
            />
            <Stagger className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {instructor.courses.map((course) => (
                <StaggerItem key={course.id}>
                  <MarketCourseCard course={course} />
                </StaggerItem>
              ))}
            </Stagger>
          </section>

          {/* Free lessons */}
          {previews.length > 0 && (
            <section id="free-lessons" className="scroll-mt-36">
              <SectionHeading title={t("Free lessons from {name}", { name: instructor.name })} description={t("Watch these lessons for free, no account needed.")} />
              <ol className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {instructor.previews.map((p, i) => (
                  <li key={p.id} className="lift flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-600 font-display font-bold text-white">{p.type === "article" ? <FileText className="h-5 w-5" /> : i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{p.title}</p>
                      {p.course.slug && (
                        <Link href={`/course/${p.course.slug}`} className="truncate text-sm text-ink-muted hover:text-brand-700 dark:hover:text-brand-300">
                          {p.course.title}
                        </Link>
                      )}
                    </div>
                    <span className="hidden text-xs tabular-nums text-ink-muted sm:block">{formatDuration(p.duration_seconds, t)}</span>
                    <PreviewButton lectureId={p.id} title={p.title} previews={previews} />
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Reviews */}
          {instructor.reviews.length > 0 && (
            <section id="reviews" className="scroll-mt-36">
              <SectionHeading title={t("What learners say")} description={instructor.rating !== null ? t("{rating} average rating", { rating: fmt.number(instructor.rating, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) }) : undefined} />
              <Stagger className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {instructor.reviews.map((r) => (
                  <StaggerItem key={r.id} className="flex h-full flex-col rounded-2xl border border-line bg-surface p-5">
                    <div className="flex items-center gap-3">
                      <Avatar name={r.author ?? t("Learner")} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{r.author ?? t("Learner")}</p>
                        <Stars value={r.rating} />
                      </div>
                      <span className="ms-auto shrink-0 text-xs text-ink-muted">{fmt.date(r.created_at)}</span>
                    </div>
                    {r.comment && <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-muted">“{r.comment}”</p>}
                    {r.course && <p className="mt-3 truncate text-xs font-medium text-brand-700 dark:text-brand-300">{r.course}</p>}
                  </StaggerItem>
                ))}
              </Stagger>
            </section>
          )}

          <div className="text-center">
            <Link href="/instructors" className={cn(buttonClass("secondary", "lg"), "rounded-full px-6")}>
              {t("All teachers")} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
