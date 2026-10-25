"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ApiError } from "@educloud/api-client";
import { serverClient } from "@educloud/api-client/server";
import { getT } from "@educloud/ui/locale";

/*
 * Online exam actions. They return plain results instead of throwing, so the
 * exam player can tell "already handed in" (422) apart from a network blip
 * and keep the student's answers safe either way.
 */

async function message(error: unknown) {
  if (error instanceof ApiError) return Object.values(error.errors ?? {})[0]?.[0] ?? error.message;
  return (await getT())("Something went wrong. Please try again.");
}

/** Starts (or resumes) an attempt and opens it; returns a failure otherwise. */
export async function startExamAction(assessmentId: string): Promise<{ ok: false; error: string; login?: boolean; expired?: boolean }> {
  let attemptId: string;
  try {
    attemptId = (await (await serverClient()).startExam(assessmentId)).id;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return { ok: false, error: (await getT())("Your session has expired. Please sign in again."), login: true, expired: true };
    }
    return { ok: false, error: await message(error) };
  }
  redirect(`/exams/attempt/${attemptId}`);
}

export type SaveResult =
  | { ok: true; savedAt: string; deadlineAt: string | null }
  /** The time ran out and the server handed the attempt in. */
  | { ok: true; finished: true }
  | { ok: false; status: number; error: string };

export async function saveExamAnswersAction(attemptId: string, answers: Record<string, unknown>): Promise<SaveResult> {
  try {
    const result = await (await serverClient()).saveExamAnswers(attemptId, answers);
    if ("status" in result && "questions" in result) return { ok: true, finished: true };
    return { ok: true, savedAt: result.saved_at, deadlineAt: result.deadline_at };
  } catch (error) {
    return { ok: false, status: error instanceof ApiError ? error.status : 0, error: await message(error) };
  }
}

export type SubmitResult = { ok: true } | { ok: false; status: number; error: string };

export async function submitExamAction(attemptId: string, answers: Record<string, unknown>, assessmentId: string, courseId: string): Promise<SubmitResult> {
  try {
    await (await serverClient()).submitExam(attemptId, answers);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 0;
    // 422: it was already handed in (another tab, or the time ran out): show the results.
    if (status !== 422) return { ok: false, status, error: await message(error) };
  }
  revalidatePath(`/exams/${assessmentId}`);
  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/exams/attempt/${attemptId}`);
  return { ok: true };
}
