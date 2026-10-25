"use server";

import { revalidatePath } from "next/cache";
import { serverClient } from "@educloud/api-client/server";
import { getT } from "@educloud/ui/locale";
import { attempt, failure, type Result } from "../action-result";
import { planFromForm } from "../lesson-plan";

/** Local datetime-local value + the browser's offset → ISO string the API understands. */
function toIso(local: string, offsetMinutes: number) {
  const utc = new Date(`${local}:00Z`).getTime() + offsetMinutes * 60_000;
  return new Date(utc).toISOString();
}

/** State of the lesson forms (`useActionState`): empty at first, then a result. */
export type FormState = Partial<Result> & { at?: number };

export async function scheduleLesson(_prev: FormState, form: FormData): Promise<FormState> {
  const t = await getT();
  const courseId = String(form.get("course_id"));
  try {
    await (await serverClient()).scheduleLesson(courseId, {
      title: String(form.get("title")),
      description: String(form.get("description") ?? "") || undefined,
      scheduled_at: toIso(String(form.get("scheduled_at")), Number(form.get("tz_offset") ?? 0)),
      duration_minutes: Number(form.get("duration_minutes") || 60),
      auto_record: form.get("auto_record") === "on",
      ...planFromForm(form),
    });
  } catch (error) {
    return { ...(await failure(error)), at: Date.now() };
  }
  revalidatePath("/live");
  revalidatePath(`/courses/${courseId}`);
  return { ok: true, message: t("Lesson scheduled. Students have been notified."), at: Date.now() };
}

export async function joinLesson(id: string) {
  return attempt((api) => api.joinLesson(id));
}

export async function startLesson(id: string) {
  const t = await getT();
  return attempt((api) => api.startLesson(id), { message: t("Lesson started. Opening the meeting…"), paths: [["/", "layout"]] });
}

export async function endLesson(id: string) {
  const t = await getT();
  return attempt((api) => api.endLesson(id), { message: t("Lesson ended. Attendance has been taken."), paths: [["/", "layout"]] });
}

export async function cancelLesson(id: string) {
  const t = await getT();
  return attempt((api) => api.cancelLesson(id), { message: t("Lesson cancelled. Students have been notified."), paths: [["/", "layout"]] });
}

export async function uploadRecording(courseId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const t = await getT();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) form.delete("file");
  if (!form.get("url")) form.delete("url");
  if (!form.get("live_lesson_id")) form.delete("live_lesson_id");
  try {
    await (await serverClient()).uploadRecording(courseId, form);
  } catch (error) {
    return { ...(await failure(error)), at: Date.now() };
  }
  revalidatePath(`/courses/${courseId}`);
  revalidatePath("/live", "layout");
  return { ok: true, message: t("Recording added. Students have been notified."), at: Date.now() };
}

export async function setRecordingPublished(id: string, courseId: string, published: boolean) {
  const t = await getT();
  return attempt((api) => api.updateRecording(id, { published }), {
    message: published ? t("Recording is now visible to students.") : t("Recording hidden from students."),
    paths: [`/courses/${courseId}`],
  });
}

export async function deleteRecording(id: string, courseId: string) {
  const t = await getT();
  return attempt((api) => api.deleteRecording(id), { message: t("Recording deleted."), paths: [`/courses/${courseId}`] });
}
