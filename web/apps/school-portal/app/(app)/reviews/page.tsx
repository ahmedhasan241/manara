import Link from "next/link";
import { MessageSquareQuote, Star } from "lucide-react";
import { Avatar, Card, CourseCover, EmptyState, PageHeader, RatingSummary, SectionHeading, Stagger, StaggerItem, Stars } from "@educloud/ui";
import { getContext } from "@educloud/portal-kit/session";
import { getI18n, getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Reviews") };
}

/**
 * What students think: every course's rating breakdown and latest comments.
 */
export default async function ReviewsPage() {
  const { api } = await getContext();
  const { t } = await getI18n();
  const courses = (await api.courses({})).data;
  const reviews = await Promise.all(courses.map((c) => api.courseReviews(c.id).then((r) => ({ course: c, ...r }))));

  const total = reviews.reduce((sum, r) => sum + r.count, 0);
  const average = total ? reviews.reduce((sum, r) => sum + (r.average ?? 0) * r.count, 0) / total : null;
  const latest = reviews
    .flatMap((r) => r.reviews.filter((x) => x.comment).map((x) => ({ ...x, course: r.course })))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 6);

  return (
    <>
      <PageHeader
        icon={<Star />}
        eyebrow={t("Reviews")}
        title={t("What students think")}
        description={t("Star ratings and comments from students enrolled in your courses.")}
        meta={
          average !== null && (
            <>
              <span className="font-display text-xl font-bold">{average.toFixed(1)}</span>
              <Stars value={average} size="md" />
              <span className="text-ink-muted">{t("{reviews} reviews across {courses} courses", { reviews: total, courses: courses.length })}</span>
            </>
          )
        }
      />

      {total === 0 ? (
        <EmptyState icon={<MessageSquareQuote className="h-6 w-6" />} title={t("No reviews yet")} description={t("Students can rate a course from its Reviews tab.")} />
      ) : (
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <section aria-labelledby="by-course">
            <SectionHeading title={<span id="by-course">{t("By course")}</span>} />
            <Stagger className="space-y-4">
              {reviews.map(({ course, average, count, breakdown }) => (
                <StaggerItem key={course.id}>
                  <Card className="p-4 sm:p-5">
                    <Link href={`/courses/${course.id}?tab=reviews`} className="group mb-4 flex items-center gap-3">
                      <CourseCover seed={course.title} category={course.category} size="sm" className="h-12 w-16 shrink-0 rounded-xl" />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-heading group-hover:text-brand-600">{course.title}</span>
                        <span className="text-xs text-ink-muted">{[course.code, course.category].filter(Boolean).join(" · ")}</span>
                      </span>
                    </Link>
                    <RatingSummary average={average} count={count} breakdown={breakdown} />
                  </Card>
                </StaggerItem>
              ))}
            </Stagger>
          </section>

          <section aria-labelledby="latest">
            <SectionHeading title={<span id="latest">{t("Latest comments")}</span>} />
            <div className="space-y-3 rounded-[1.25rem] bg-sky/60 p-3">
              {latest.length === 0 && <p className="p-3 text-sm text-ink-muted">{t("Ratings so far came without comments.")}</p>}
              {latest.map((r) => (
                <Card key={`${r.course.id}-${r.id}`} className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={r.author ?? t("Student")} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{r.author}</p>
                      <p className="truncate text-xs text-ink-muted">{r.course.title}</p>
                    </div>
                    <Stars value={r.rating} className="ms-auto" />
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-ink-muted">“{r.comment}”</p>
                </Card>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
