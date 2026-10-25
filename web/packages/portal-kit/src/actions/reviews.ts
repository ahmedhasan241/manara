"use server";

import { revalidatePath } from "next/cache";
import { serverClient } from "@educloud/api-client/server";
import { getT } from "@educloud/ui/locale";
import { attempt, failure, type Result } from "../action-result";

export type ReviewFormState = Partial<Result> & { at?: number };

export async function saveReview(_prev: ReviewFormState, form: FormData): Promise<ReviewFormState> {
  const t = await getT();
  const courseId = String(form.get("course_id"));
  const rating = Number(form.get("rating"));
  if (!rating) return { ok: false, error: t("Pick a star rating first."), at: Date.now() };

  try {
    await (await serverClient()).saveReview(courseId, { rating, comment: String(form.get("comment") ?? "").trim() || null });
  } catch (error) {
    return { ...(await failure(error)), at: Date.now() };
  }

  revalidatePath(`/courses/${courseId}`);
  return { ok: true, message: t("Thanks! Your review is saved."), at: Date.now() };
}

export async function deleteReview(courseId: string) {
  const t = await getT();
  return attempt((api) => api.deleteReview(courseId), { message: t("Review deleted."), paths: [`/courses/${courseId}`] });
}
