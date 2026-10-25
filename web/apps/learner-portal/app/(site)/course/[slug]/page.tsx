import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Award, BarChart3, Building2, Check, ChevronDown, Clock3, FileText, Globe2, Infinity as InfinityIcon, Lock, PlayCircle, Smartphone, Star, Users } from "lucide-react";
import { ApiError } from "@educloud/api-client";
import { ArchPhoto, Avatar, CourseCover, FadeIn, RatingSummary, SectionHeading, Stagger, StaggerItem, Stars } from "@educloud/ui";
import { BuyBox, MobileBuyBar, PreviewButton, type PreviewItem } from "@/components/site/buy-box";
import { ExpandAllButton, SectionNav, ShareButton } from "@/components/site/course-tools";
import { WishlistButton } from "@/components/site/wishlist-button";
import { MarketCourseCard } from "@/components/site/market-card";
import { LEVEL_LABELS, ORG_LABELS, formatDuration, getViewer } from "@/lib/viewer";
import { getFormat, getT } from "@educloud/ui/locale";
import { JsonLd, pageMetadata, siteUrl } from "@educloud/ui/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { api } = await getViewer();
  const t = await getT();
  const { slug } = await params;
  const course = await api.catalogCourse(slug).catch(() => null);
  if (!course) return { title: t("Course") };
  return pageMetadata({ path: `/course/${slug}`, title: course.title, description: course.subtitle ?? course.description, image: false });
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const fmt = await getFormat();
  const t = await getT();
  const { slug } = await params;
  const { api, me, cart } = await getViewer();
  const course = await api.catalogCourse(slug).catch((error) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });
  const [status, more] = await Promise.all([
    me ? api.learningStatus(slug).catch(() => null) : null,
    course.instructor ? api.catalogCourses({ instructor: course.instructor.id, per_page: 4 }) : null,
  ]);
  const owned = Boolean(status?.owned || status?.can_watch);
  const lectures = course.curriculum.flatMap((s) => s.lectures);
  const articles = lectures.filter((l) => l.type === "article").length;
  const previews: PreviewItem[] = lectures.filter((l) => l.is_preview).map((l) => ({ id: l.id, title: l.title, duration: formatDuration(l.duration_seconds, t) }));
  const firstPreview = previews[0];
  const sections = [
    { id: "overview", label: t("Overview") },
    { id: "content", label: t("Course content") },
    ...(course.instructor ? [{ id: "instructor", label: t("Instructor") }] : []),
    { id: "reviews", label: t("Reviews") },
  ];

  // Rich results: course, provider, price (in the course's own currency) and rating.
  const structured = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.subtitle ?? course.description ?? course.title,
    inLanguage: course.language ?? undefined,
    url: new URL(`/course/${slug}`, siteUrl(3004)).toString(),
    provider: { "@type": "Organization", name: course.organization?.name ?? "Manara" },
    ...(course.instructor ? { instructor: { "@type": "Person", name: course.instructor.name } } : {}),
    offers: { "@type": "Offer", category: course.price_cents === 0 ? "Free" : "Paid", price: (course.price_cents / 100).toFixed(2), priceCurrency: course.currency, availability: "https://schema.org/InStock" },
    hasCourseInstance: { "@type": "CourseInstance", courseMode: "Online", courseWorkload: `PT${Math.max(1, Math.round(course.duration_seconds / 3600))}H` },
    ...(course.reviews_count && course.rating ? { aggregateRating: { "@type": "AggregateRating", ratingValue: course.rating, ratingCount: course.reviews_count, bestRating: 5 } } : {}),
  };

  return (
    <>
      <JsonLd data={structured} />
      {/* Banner */}
      <section className="band-peach relative overflow-hidden">
        <div aria-hidden className="absolute -end-24 -top-24 h-80 w-80 rounded-full border-2 border-dashed border-brand-200 dark:border-brand-900" />
        <div aria-hidden className="absolute -end-10 -top-10 h-52 w-52 rounded-full border-2 border-dashed border-brand-300/60 dark:border-brand-800" />
        <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:px-8 lg:pb-16 lg:pe-[26rem]">
          <Link href="/explore" className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800 dark:text-brand-300">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {course.category ?? t("All courses")}
          </Link>
          <FadeIn>
            <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">{course.title}</h1>
            {course.subtitle && <p className="mt-3 max-w-3xl text-lg text-ink-muted">{course.subtitle}</p>}
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              {course.rating !== null && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 font-semibold shadow-[var(--shadow-soft)]">
                  <span className="text-amber-600 dark:text-amber-300">{course.rating.toFixed(1)}</span> <Stars value={course.rating} /> <span className="font-normal text-ink-muted">({t("{count} ratings", { count: course.reviews_count })})</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4 text-brand-500" /> {t("{count} learners", { count: course.students_count })}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4 text-brand-500" /> {t(LEVEL_LABELS[course.level])}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Globe2 className="h-4 w-4 text-brand-500" /> {new Intl.DisplayNames(["en"], { type: "language" }).of(course.language) ?? course.language}
              </span>
            </div>
            <p className="mt-4 text-sm text-ink-muted">
              {t("Created by")}{" "}
              {course.instructor ? (
                <Link href={`/instructor/${course.instructor.id}`} className="font-semibold text-brand-700 underline underline-offset-2 dark:text-brand-300">
                  {course.instructor.name}
                </Link>
              ) : (
                <span className="font-semibold">{course.organization?.name}</span>
              )}
              {course.organization && (
                <>
                  {" · "}
                  <Link href={`/explore?organization=${course.organization.slug}`} className="underline-offset-2 hover:underline">
                    {course.organization.name}
                  </Link>{" "}
                  <span className="text-ink-muted/80">({t(ORG_LABELS[course.organization.type])})</span>
                </>
              )}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <ShareButton title={course.title} />
              {previews.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm font-semibold text-brand-700 shadow-[var(--shadow-soft)] dark:text-brand-300">
                  <PlayCircle className="h-4 w-4" /> {t("{count} free previews", { count: previews.length })}
                </span>
              )}
            </div>
          </FadeIn>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pb-24 sm:px-6 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-10 lg:px-8 lg:pb-0">
        {/* Purchase card (sticky on desktop, overlaps the banner) */}
        <aside id="buy-card" className="order-first -mt-6 lg:order-last lg:-mt-64">
          <div className="sticky top-24 overflow-hidden rounded-[1.75rem] border border-line bg-surface shadow-[var(--shadow-lift)]">
            <CourseCover seed={course.title} category={course.category} size="lg" className="h-48">
              {firstPreview && (
                <div className="absolute inset-0 grid place-items-center bg-black/10">
                  <PreviewButton lectureId={firstPreview.id} title={firstPreview.title} previews={previews} className="group flex flex-col items-center gap-2 text-white">
                    <span className="animate-pulse-ring relative grid h-16 w-16 place-items-center rounded-full bg-white/95 text-brand-600 shadow-xl transition group-hover:scale-110">
                      <PlayCircle className="h-9 w-9" />
                    </span>
                    <span className="rounded-full bg-black/40 px-3 py-1 text-xs font-semibold backdrop-blur">{t("Preview this course")}</span>
                  </PreviewButton>
                </div>
              )}
            </CourseCover>
            <div className="p-6">
              <p className="font-display text-3xl font-bold text-heading">{course.price_cents === 0 ? t("Free") : fmt.money(course.price_cents, course.currency)}</p>
              {owned && <p className="mt-1 text-sm font-semibold text-success">{t("You have this course")}</p>}
              <div className="mt-5">
                <BuyBox course={course} owned={owned} signedIn={!!me} inCart={cart.includes(course.id)} />
                {!owned && <WishlistButton courseId={course.id} saved={Boolean(status?.wishlisted)} signedIn={!!me} withLabel className="mt-3 w-full" />}
              </div>
              <p className="mt-6 text-sm font-semibold">{t("This course includes")}</p>
              <ul className="mt-3 space-y-2.5 text-sm text-ink-muted">
                <li className="flex items-center gap-3">
                  <PlayCircle className="h-4 w-4 text-brand-500" /> {t("{duration} of on-demand lessons", { duration: formatDuration(course.duration_seconds, t) })}
                </li>
                <li className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-brand-500" /> {t("{count} lectures", { count: lectures.length })}{articles ? ` · ${t("{count} articles", { count: articles })}` : ""}
                </li>
                <li className="flex items-center gap-3">
                  <InfinityIcon className="h-4 w-4 text-brand-500" /> {t("Lifetime access")}
                </li>
                <li className="flex items-center gap-3">
                  <Smartphone className="h-4 w-4 text-brand-500" /> {t("Learn on phone, tablet or computer")}
                </li>
                <li className="flex items-center gap-3">
                  <Award className="h-4 w-4 text-brand-500" /> {t("Progress tracking")}
                </li>
              </ul>
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-10 lg:py-10">
          <SectionNav sections={sections} />
          <div id="overview" className="scroll-mt-36 space-y-10">
          {course.outcomes.length > 0 && (
            <section className="rounded-[1.5rem] border border-line bg-surface p-6 shadow-[var(--shadow-soft)]">
              <h2 className="mb-4 font-display text-xl font-bold">{t("What you'll learn")}</h2>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {course.outcomes.map((o) => (
                  <li key={o} className="flex gap-3 text-sm">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    {o}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {course.requirements.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-xl font-bold">{t("Requirements")}</h2>
              <ul className="list-disc space-y-1 ps-5 text-sm text-ink-muted">
                {course.requirements.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </section>
          )}

          {course.description && (
            <section>
              <h2 className="mb-3 font-display text-xl font-bold">{t("Description")}</h2>
              <p className="whitespace-pre-line leading-relaxed text-ink-muted">{course.description}</p>
            </section>
          )}

          </div>

          <section id="content" aria-labelledby="content-heading" className="scroll-mt-36">
            <SectionHeading
              title={<span id="content-heading">{t("Course content")}</span>}
              description={`${t("{count} sections", { count: course.curriculum.length })} · ${t("{count} lectures", { count: lectures.length })} · ${t("{duration} total", { duration: formatDuration(course.duration_seconds, t) })}`}
              actions={course.curriculum.length > 1 ? <ExpandAllButton target="curriculum" /> : undefined}
            />
            <div id="curriculum" className="space-y-3">
              {course.curriculum.map((section, i) => (
                <details key={section.id} open={i === 0} className="group overflow-hidden rounded-2xl border border-line bg-surface open:shadow-[var(--shadow-soft)]">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 transition-colors hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">{i + 1}</span>
                    <span className="flex-1 font-semibold">{section.title}</span>
                    <span className="text-xs text-ink-muted">
                      {t("{count} lectures", { count: section.lectures.length })} · {formatDuration(section.lectures.reduce((s, l) => s + l.duration_seconds, 0), t)}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-ink-muted transition-transform duration-300 group-open:rotate-180" />
                  </summary>
                  <ul className="border-t border-line">
                    {section.lectures.map((l) => (
                      <li key={l.id} className="flex items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-surface-2">
                        {l.type === "article" ? <FileText className="h-4 w-4 shrink-0 text-ink-muted" /> : <PlayCircle className="h-4 w-4 shrink-0 text-ink-muted" />}
                        <span className="min-w-0 flex-1 truncate">{l.title}</span>
                        {l.is_preview ? <PreviewButton lectureId={l.id} title={l.title} previews={previews} /> : !owned && <Lock className="h-3.5 w-3.5 text-ink-muted/60" aria-label={t("Locked")} />}
                        <span className="w-12 shrink-0 text-end text-xs tabular-nums text-ink-muted">{formatDuration(l.duration_seconds, t)}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </section>

          {course.instructor && (
            <section id="instructor" className="band-peach grid scroll-mt-36 grid-cols-1 items-center gap-8 rounded-[1.5rem] p-6 sm:grid-cols-[9rem_1fr] sm:p-8">
              <ArchPhoto photo="teacherPortrait" alt="" className="max-w-[9rem]" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">{t("Your instructor")}</p>
                <Link href={`/instructor/${course.instructor.id}`} className="mt-1 flex items-center gap-3 font-display text-xl font-bold text-heading hover:underline">
                  <Avatar name={course.instructor.name} size="sm" /> {course.instructor.name}
                </Link>
                {course.organization && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
                    <Building2 className="h-4 w-4" /> {course.organization.name}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                  <span className="inline-flex items-center gap-1.5">
                    <Star className="h-4 w-4 text-amber-400" /> {t("{count} reviews", { count: course.instructor_stats.reviews })}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-brand-500" /> {t("{count} learners", { count: course.instructor_stats.students })}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 className="h-4 w-4 text-accent-500" /> {t("{count} courses", { count: course.instructor_stats.courses })}
                  </span>
                </div>
              </div>
            </section>
          )}

          <section id="reviews" aria-labelledby="reviews-heading" className="scroll-mt-36">
            <SectionHeading title={<span id="reviews-heading">{t("Learner reviews")}</span>} />
            <div className="rounded-[1.5rem] border border-line bg-surface p-6 shadow-[var(--shadow-soft)]">
              <RatingSummary average={course.reviews.average} count={course.reviews.count} breakdown={course.reviews.breakdown} />
            </div>
            {course.reviews.latest.length > 0 && (
              <Stagger className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {course.reviews.latest.map((r) => (
                  <StaggerItem key={r.id} className="rounded-2xl border border-line bg-surface p-5">
                    <div className="flex items-center gap-3">
                      <Avatar name={r.author ?? t("Learner")} size="sm" />
                      <div>
                        <p className="text-sm font-semibold">{r.author ?? t("Learner")}</p>
                        <Stars value={r.rating} />
                      </div>
                      <span className="ms-auto text-xs text-ink-muted">{fmt.date(r.created_at)}</span>
                    </div>
                    {r.comment && <p className="mt-3 text-sm leading-relaxed text-ink-muted">{r.comment}</p>}
                  </StaggerItem>
                ))}
              </Stagger>
            )}
          </section>

          {more && more.data.filter((c) => c.id !== course.id).length > 0 && (
            <section>
              <SectionHeading title={t("More from {name}", { name: course.instructor?.name ?? "" })} href={`/instructor/${course.instructor?.id}`} linkLabel={t("View profile")} />
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {more.data
                  .filter((c) => c.id !== course.id)
                  .slice(0, 3)
                  .map((c) => (
                    <MarketCourseCard key={c.id} course={c} />
                  ))}
              </div>
            </section>
          )}
        </div>
      </div>
      <MobileBuyBar course={course} owned={owned} signedIn={!!me} price={course.price_cents === 0 ? t("Free") : fmt.money(course.price_cents, course.currency)} />
    </>
  );
}
