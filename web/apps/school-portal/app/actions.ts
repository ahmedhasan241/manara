"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { AttendanceStatus } from "@educloud/api-client";
import { performLogin, type LoginStepState } from "@educloud/api-client/login-action";
import { clearSession, serverClient, setTenant } from "@educloud/api-client/server";
import { attempt, failure, fieldErrors, type Result } from "@educloud/portal-kit/action-result";
import { isStaffRole, portalUrl } from "@educloud/portal-kit/session";
import { getT } from "@educloud/ui/locale";
import { courseStructureFields } from "@/lib/course-form";

export async function login(state: LoginStepState, form: FormData): Promise<LoginStepState> {
  const t = await getT();
  const result = await performLogin(state, form);
  if (!result.user) return result.state;
  if (!result.user.memberships?.length) {
    await clearSession();
    return { step: "password", error: t("This account isn't part of any school yet. Ask your administrator for an invite.") };
  }
  // Students and parents continue in the learner & family portal.
  redirect(isStaffRole(result.user.memberships[0]!.role) ? "/" : portalUrl("learner"));
}

export async function logout() {
  try {
    await (await serverClient()).logout();
  } catch {}
  await clearSession();
  // The login page shows "You've been signed out."
  redirect("/login?signed_out=1");
}

/** Switches school; the form then opens its dashboard (`data.href`). */
export async function switchWorkspace(form: FormData): Promise<Result<{ href: string }>> {
  await setTenant(String(form.get("tenant")));
  revalidatePath("/", "layout");
  return { ok: true, message: (await getT())("Workspace switched."), data: { href: "/" } };
}

export async function setLocale(form: FormData): Promise<Result> {
  const locale = String(form.get("locale"));
  (await cookies()).set("locale", locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  try {
    await (await serverClient()).updateMe({ locale });
  } catch {}
  revalidatePath("/", "layout");
  return { ok: true, message: (await getT())("Language saved.") };
}

/** Creates a course; the form opens it afterwards (`data.href`). */
export async function createCourse(form: FormData): Promise<Result<{ href: string }>> {
  const t = await getT();
  try {
    const course = await (await serverClient()).createCourse({
      code: String(form.get("code")),
      title: String(form.get("title")),
      term: String(form.get("term") ?? "") || undefined,
      category: String(form.get("category") ?? "") || undefined,
      description: String(form.get("description") ?? "") || undefined,
      ...courseStructureFields(form),
    } as never);
    revalidatePath("/courses");
    return { ok: true, message: t("Course “{title}” created.", { title: course.title }), data: { href: `/courses/${course.id}` } };
  } catch (error) {
    return failure(error);
  }
}

export async function createAssessment(courseId: string, form: FormData) {
  const t = await getT();
  const publish = !!form.get("publish");
  return attempt(
    (api) =>
      api.createAssessment(courseId, {
        title: String(form.get("title")),
        type: String(form.get("type")),
        max_score: String(form.get("max_score") || "100"),
        due_at: String(form.get("due_at") || "") || null,
        published_at: publish ? new Date().toISOString() : null,
      }),
    { message: publish ? t("Assessment created and published to students.") : t("Assessment created as a draft."), paths: [`/courses/${courseId}`] },
  );
}

export async function saveGrades(assessmentId: string, courseId: string, grades: { student_id: number; score: number | null }[]) {
  return attempt((api) => api.saveGrades(assessmentId, grades), { paths: [`/courses/${courseId}`] });
}

export async function createSession(courseId: string, form: FormData) {
  const t = await getT();
  return attempt(
    (api) =>
      api.createSession(courseId, {
        starts_at: String(form.get("starts_at") || new Date().toISOString()),
        topic: String(form.get("topic") ?? "") || undefined,
      }),
    { message: t("Class session added. You can take the roll call now."), paths: [`/courses/${courseId}`] },
  );
}

export interface QueuedChange {
  entity: "attendance" | "grade";
  id: string;
  client_updated_at: string;
  data: Record<string, unknown>;
}

/**
 * Pushes offline-queued changes to the API's sync endpoint. Called by the
 * client whenever it is online and has a queue (throws when it can't reach
 * the API, so the queue is kept for later).
 */
export async function pushChanges(changes: QueuedChange[]) {
  const result = await (await serverClient()).request<{ results: { id: string; status: string }[] }>("POST", "/sync/push", { changes });
  revalidatePath("/courses", "layout");
  return result.results;
}

export async function markAttendance(sessionId: string, courseId: string, records: { student_id: number; status: AttendanceStatus }[]) {
  const t = await getT();
  return attempt((api) => api.markAttendance(sessionId, records), {
    message: t("Attendance saved. Students marked: {count}.", { count: records.length }),
    paths: [`/courses/${courseId}`],
  });
}

export async function uploadMaterial(courseId: string, form: FormData) {
  const t = await getT();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) form.delete("file");
  if (!form.get("url")) form.delete("url");
  if (!form.get("file") && !form.get("url")) return { ok: false, error: t("Choose a file or paste a link.") } as const;
  return attempt((api) => api.uploadMaterial(courseId, form), { message: t("Material added to the course."), paths: [`/courses/${courseId}`] });
}

export async function deleteMaterial(courseId: string, materialId: string) {
  const t = await getT();
  return attempt((api) => api.deleteMaterial(materialId), { message: t("Material removed."), paths: [`/courses/${courseId}`] });
}

export async function createAnnouncement(form: FormData) {
  const t = await getT();
  return attempt(
    (api) =>
      api.createAnnouncement({
        title: String(form.get("title")),
        body: String(form.get("body")),
        priority: String(form.get("priority") || "normal") as "normal",
        deadline_at: String(form.get("deadline_at") || "") || null,
        course_id: String(form.get("course_id") || "") || undefined,
      }),
    { message: t("Announcement posted. Everyone it's for has been notified."), paths: ["/announcements"] },
  );
}

export async function markAllRead() {
  const t = await getT();
  return attempt((api) => api.markAllNotificationsRead(), { message: t("All notifications marked as read."), paths: [["/", "layout"]] });
}

export async function startMfa() {
  return attempt((api) => api.mfaSetup());
}

export async function confirmMfa(code: string) {
  const t = await getT();
  return attempt(async (api) => (await api.mfaConfirm(code)).recovery_codes, { message: t("Two-factor authentication is on."), paths: ["/settings"] });
}

export async function revokeDevice(id: number) {
  const t = await getT();
  return attempt((api) => api.revokeDevice(id), { message: t("That device has been signed out."), paths: ["/settings"] });
}

/** Profile form state: the result plus one message per invalid field. */
export type ProfileState = Partial<Result> & { fields?: Record<string, string> };

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export async function saveProfile(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const t = await getT();
  try {
    await (await serverClient()).updateMe({
      name: text(form, "name"),
      headline: text(form, "headline") || null,
      bio: text(form, "bio") || null,
      phone: text(form, "phone") || null,
      country: text(form, "country") || null,
      city: text(form, "city") || null,
      area: text(form, "area") || null,
    });
  } catch (error) {
    const result = await failure(error);
    return { ...result, fields: fieldErrors(result.errors) };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: t("Profile saved.") };
}

export async function changePassword(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const t = await getT();
  const password = String(form.get("password") ?? "");
  if (password !== String(form.get("password_confirmation") ?? "")) {
    const error = t("The new passwords don't match.");
    return { ok: false, error, fields: { password_confirmation: error } };
  }
  try {
    await (await serverClient()).changePassword({
      current_password: String(form.get("current_password") ?? ""),
      password,
      password_confirmation: password,
    });
  } catch (error) {
    const result = await failure(error);
    return { ...result, fields: fieldErrors(result.errors) };
  }
  revalidatePath("/settings");
  return { ok: true, message: t("Password changed. Other devices were signed out.") };
}
