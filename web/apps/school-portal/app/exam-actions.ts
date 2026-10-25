"use server";

import { revalidatePath } from "next/cache";
import { type ExamDefinition, type ExamQuestion, type ExamResultsVisibility } from "@educloud/api-client";
import { serverClient } from "@educloud/api-client/server";
import { failure as baseFailure } from "@educloud/portal-kit/action-result";

export type ExamActionResult<T> = { ok: true; data: T } | { ok: false; error: string; errors: Record<string, string[]> };

async function failure(error: unknown): Promise<{ ok: false; error: string; errors: Record<string, string[]> }> {
  const result = await baseFailure(error);
  return { ...result, errors: result.errors ?? {} };
}

/** Saves the exam settings and its whole question list (the API replaces them). */
export async function saveExam(
  courseId: string,
  assessmentId: string,
  data: { time_limit_minutes: number | null; max_attempts: number; shuffle_questions: boolean; results_visibility: ExamResultsVisibility; instructions: string | null; questions: ExamQuestion[] },
): Promise<ExamActionResult<ExamDefinition>> {
  try {
    const exam = await (await serverClient()).saveExam(assessmentId, data);
    revalidatePath(`/courses/${courseId}`);
    revalidatePath(`/courses/${courseId}/exams/${assessmentId}`);
    return { ok: true, data: exam };
  } catch (error) {
    return failure(error);
  }
}

/** Marks essays (or adjusts any question) on one attempt and leaves feedback. */
export async function reviewExamAttempt(
  courseId: string,
  assessmentId: string,
  attemptId: string,
  data: { points: Record<string, number>; feedback: string | null },
): Promise<ExamActionResult<null>> {
  try {
    await (await serverClient()).reviewExamAttempt(attemptId, data);
    revalidatePath(`/courses/${courseId}`);
    revalidatePath(`/courses/${courseId}/exams/${assessmentId}`);
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}
