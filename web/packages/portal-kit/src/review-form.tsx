"use client";

import { useActionState } from "react";
import { Button, StarRatingInput, Textarea, useStateToast, useT } from "@educloud/ui";
import { saveReview, type ReviewFormState } from "./actions/reviews";

export function ReviewForm({ courseId, rating, comment }: { courseId: string; rating?: number; comment?: string | null }) {
  const t = useT();
  const [state, action, pending] = useActionState<ReviewFormState, FormData>(saveReview, {});
  useStateToast(state);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="course_id" value={courseId} />
      <StarRatingInput name="rating" defaultValue={rating ?? 0} />
      <Textarea name="comment" rows={3} maxLength={2000} defaultValue={comment ?? ""} placeholder={t("What did you like? What could be better?")} aria-label={t("Your review")} />
      <Button type="submit" disabled={pending}>
        {pending ? t("Saving…") : rating ? t("Update review") : t("Post review")}
      </Button>
    </form>
  );
}
