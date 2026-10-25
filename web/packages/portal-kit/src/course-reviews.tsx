import { MessageSquareQuote, Star } from "lucide-react";
import { Avatar, Card, EmptyState, RatingSummary, Stagger, StaggerItem, Stars } from "@educloud/ui";
import { getContext } from "./session";
import { ReviewForm } from "./review-form";
import { getFormat, getT } from "@educloud/ui/locale";

/**
 * Ratings breakdown and reviews for one course. Enrolled students also get
 * a form to rate the course (or change their rating).
 */
export async function CourseReviews({ courseId }: { courseId: string }) {
  const fmt = await getFormat();
  const t = await getT();
  const { api } = await getContext();
  const data = await api.courseReviews(courseId);
  const mine = data.reviews.find((r) => r.mine);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <RatingSummary average={data.average} count={data.count} breakdown={data.breakdown} />
      </Card>

      {data.can_review && (
        <Card className="p-6">
          <h3 className="mb-1 flex items-center gap-2 font-display text-lg font-bold">
            <Star className="h-5 w-5 text-amber-400" /> {mine ? t("Your review") : t("Rate this course")}
          </h3>
          <p className="mb-4 text-sm text-ink-muted">{t("Your teacher sees your name with your review. Be kind and specific.")}</p>
          <ReviewForm courseId={courseId} rating={mine?.rating} comment={mine?.comment} />
        </Card>
      )}

      {data.reviews.length === 0 ? (
        <EmptyState icon={<MessageSquareQuote className="h-6 w-6" />} title={t("No reviews yet")} description={t("Reviews from students will appear here.")} />
      ) : (
        <div className="rounded-[1.25rem] bg-sky/60 p-4 sm:p-6">
          <Stagger as="ul" className="space-y-3">
            {data.reviews.map((review) => (
              <StaggerItem as="li" key={review.id}>
                <Card className="p-5">
                  <div className="flex items-start gap-3">
                    <Avatar name={review.author ?? t("Student")} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold">
                          {review.author ?? t("Student")}
                          {review.mine && <span className="ms-2 rounded-full bg-brand-500/10 px-2 py-0.5 text-xs font-semibold text-brand-700 dark:text-brand-200">{t("You")}</span>}
                        </p>
                        <span className="text-xs text-ink-muted">{fmt.date(review.updated_at)}</span>
                      </div>
                      <Stars value={review.rating} className="mt-1" />
                      {review.comment && <p className="mt-2 text-sm leading-relaxed text-ink-muted">{review.comment}</p>}
                    </div>
                  </div>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      )}
    </div>
  );
}
