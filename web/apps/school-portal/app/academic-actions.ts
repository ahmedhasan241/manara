"use server";

import { revalidatePath } from "next/cache";
import { type AcademicSettings, type AcademicStage, type LessonPlan } from "@educloud/api-client";
import { serverClient } from "@educloud/api-client/server";
import { getT } from "@educloud/ui/locale";
import { failure } from "@educloud/portal-kit/action-result";
import { courseStructureFields } from "@/lib/course-form";
import type { ActionResult } from "@educloud/ui";
import type { ActionState } from "./builder-actions";

export type AcademicResult = { ok: true } | { ok: false; error: string };

/** Runs one API call and refreshes the structure pages. */
async function run(call: (api: Awaited<ReturnType<typeof serverClient>>) => Promise<unknown>, paths: string[] = []): Promise<AcademicResult> {
  try {
    await call(await serverClient());
  } catch (error) {
    return failure(error);
  }
  for (const path of ["/classes", "/teaching", "/rankings", "/attendance", ...paths]) revalidatePath(path);
  return { ok: true };
}

const text = (value: FormDataEntryValue | null) => String(value ?? "").trim();

export interface LevelInput {
  stage: AcademicStage;
  name: string;
  department?: string | null;
  position?: number;
}

export async function createLevel(data: LevelInput) {
  return run((api) => api.createLevel(data));
}

export async function updateLevel(id: string, data: Partial<LevelInput>) {
  return run((api) => api.updateLevel(id, { ...data, department: data.department ?? null }));
}

export async function deleteLevel(id: string) {
  return run((api) => api.deleteLevel(id));
}

export interface ClassInput {
  name: string;
  advisor_id: number | null;
  room: string | null;
  capacity: number | null;
}

export async function createClassGroup(levelId: string, data: ClassInput) {
  return run((api) => api.createClassGroup(levelId, data));
}

export async function updateClassGroup(id: string, data: Partial<ClassInput>) {
  return run((api) => api.updateClassGroup(id, data), [`/classes/${id}`]);
}

export async function deleteClassGroup(id: string) {
  return run((api) => api.deleteClassGroup(id));
}

export async function saveAcademicSettings(data: Partial<AcademicSettings>) {
  return run((api) => api.updateAcademicSettings(data), ["/students", "/"]);
}

/** Sets who is in a class; `enroll` also enrolls them in the class's subjects. */
export async function setClassStudents(id: string, studentIds: number[], enroll: boolean) {
  return run((api) => api.setClassStudents(id, studentIds, enroll), [`/classes/${id}`, "/courses"]);
}

/** Course details and its place in the school structure (edit dialog). */
export async function saveCourse(courseId: string, _state: ActionState, form: FormData): Promise<ActionState> {
  const t = await getT();
  try {
    await (await serverClient()).updateCourse(courseId, {
      code: text(form.get("code")),
      title: text(form.get("title")),
      term: text(form.get("term")) || null,
      category: text(form.get("category")) || null,
      description: text(form.get("description")) || null,
      ...courseStructureFields(form),
    });
  } catch (error) {
    return failure(error);
  }
  revalidatePath(`/courses/${courseId}`);
  revalidatePath("/courses");
  revalidatePath("/teaching");
  return { ok: true, message: t("Course saved.") };
}

/** saveCourse for the edit page's form (ToastForm passes only the form). */
export async function saveCourseFromPage(courseId: string, form: FormData) {
  return (await saveCourse(courseId, {}, form)) as ActionResult;
}

/** Edits a live lesson's plan (unit, objectives, homework, resources, summary). */
export async function saveLessonPlan(lessonId: string, plan: Partial<LessonPlan>) {
  try {
    await (await serverClient()).saveLessonPlan(lessonId, plan);
  } catch (error) {
    return failure(error);
  }
  revalidatePath(`/live/${lessonId}`);
  revalidatePath("/teaching");
  return { ok: true } as const;
}
