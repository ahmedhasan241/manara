"use server";

import type { Role } from "@educloud/api-client";
import { attempt, type Result } from "@educloud/portal-kit/action-result";
import { getT } from "@educloud/ui/locale";

/** State of `ActionForm` forms: empty at first, then the last result. */
export type ActionState = Partial<Result<unknown>> & { at?: number };

const lines = (value: FormDataEntryValue | null) =>
  String(value ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

/** Landing-page details, price and visibility of a course. */
export async function saveMarketplace(courseId: string, _state: ActionState, form: FormData): Promise<ActionState> {
  const t = await getT();
  return attempt(
    (api) =>
      api.updateMarketplace(courseId, {
        is_public: form.get("is_public") === "on",
        slug: String(form.get("slug") ?? "").trim() || null,
        subtitle: String(form.get("subtitle") ?? "").trim() || null,
        category: String(form.get("category") ?? "").trim() || null,
        description: String(form.get("description") ?? "").trim() || null,
        level: String(form.get("level") ?? "all") as "all",
        language: String(form.get("language") ?? "en"),
        price_cents: Math.round(Number(form.get("price") || 0) * 100),
        ...(form.get("currency") ? { currency: String(form.get("currency")) } : {}),
        outcomes: lines(form.get("outcomes")),
        requirements: lines(form.get("requirements")),
      }),
    { message: t("Landing page and price saved."), paths: [`/courses/${courseId}`] },
  );
}

export async function setPublished(courseId: string, publish: boolean, _state: ActionState): Promise<ActionState> {
  const t = await getT();
  // Publishing lists the course too, so it's one click instead of tick, save, publish.
  return attempt((api) => api.updateMarketplace(courseId, publish ? { is_public: true, publish } : { publish }), {
    message: publish ? t("Published! Learners can now find and buy this course.") : t("Moved back to draft."),
    paths: [`/courses/${courseId}`],
  });
}

export async function addSection(courseId: string, _state: ActionState, form: FormData): Promise<ActionState> {
  const t = await getT();
  return attempt((api) => api.createSection(courseId, String(form.get("title") ?? "")), { message: t("Section added."), paths: [`/courses/${courseId}`] });
}

export async function renameSection(courseId: string, sectionId: string, form: FormData) {
  const t = await getT();
  return attempt((api) => api.updateSection(sectionId, String(form.get("title") ?? "")), { message: t("Section renamed."), paths: [`/courses/${courseId}`] });
}

export async function removeSection(courseId: string, sectionId: string) {
  const t = await getT();
  return attempt((api) => api.deleteSection(sectionId), { message: t("Section and its lectures deleted."), paths: [`/courses/${courseId}`] });
}

export async function addLecture(courseId: string, sectionId: string, _state: ActionState, form: FormData): Promise<ActionState> {
  const t = await getT();
  const payload = new FormData();
  for (const key of ["title", "type", "video_url", "body", "duration_minutes"]) {
    const value = form.get(key);
    if (value && String(value).trim()) payload.set(key, String(value));
  }
  const file = form.get("file");
  if (file instanceof File && file.size > 0) payload.set("file", file);
  payload.set("is_preview", form.get("is_preview") === "on" ? "1" : "0");

  return attempt((api) => api.createLecture(sectionId, payload), { message: t("Lecture added."), paths: [`/courses/${courseId}`] });
}

export async function toggleLecturePreview(courseId: string, lectureId: string, isPreview: boolean) {
  const t = await getT();
  return attempt((api) => api.updateLecture(lectureId, { is_preview: isPreview }), {
    message: isPreview ? t("Free preview on. Anyone can watch this lecture.") : t("Free preview off."),
    paths: [`/courses/${courseId}`],
  });
}

export async function removeLecture(courseId: string, lectureId: string) {
  const t = await getT();
  return attempt((api) => api.deleteLecture(lectureId), { message: t("Lecture deleted."), paths: [`/courses/${courseId}`] });
}

export async function moveItem(courseId: string, kind: "sections" | "lectures", id: string, direction: "up" | "down") {
  const t = await getT();
  return attempt((api) => api.moveCurriculumItem(kind, id, direction), { message: direction === "up" ? t("Moved up.") : t("Moved down."), paths: [`/courses/${courseId}`] });
}

/** Adds one person to the workspace; new accounts get an email to set a password. */
export async function addPerson(_state: ActionState, form: FormData): Promise<ActionState> {
  const t = await getT();
  const name = String(form.get("name") ?? "");
  return attempt(
    (api) =>
      api.addMember({
        name,
        email: String(form.get("email") ?? ""),
        role: String(form.get("role") ?? "student") as Role,
        student_number: String(form.get("student_number") ?? "") || undefined,
      }),
    { message: t("{name} added. They'll get an email to set their password.", { name }), paths: ["/people"] },
  );
}

/**
 * Paste from a spreadsheet: one person per line, "Name, email" (optionally a
 * third column with a student number), separated by commas or tabs.
 */
export async function importPeople(_state: ActionState, form: FormData): Promise<ActionState> {
  const t = await getT();
  const people = lines(form.get("people"))
    .map((line) => line.split(/[,\t;]/).map((part) => part.trim()))
    .filter(([name, email]) => name && email?.includes("@"))
    .map(([name, email, student_number]) => ({ name: name!, email: email!, student_number: student_number || undefined }));
  if (people.length === 0) return { ok: false, error: t("Paste at least one line like: Sara Ali, sara@school.edu") };

  return attempt(
    (api) =>
      api.addMembersBulk({
        role: String(form.get("role") ?? "student") as Role,
        people,
        course_id: String(form.get("course_id") ?? "") || undefined,
      }),
    {
      message: (result) =>
        result.existing
          ? t("People added: {added}. Already members: {existing}. New people get an email to set their password.", { added: result.added, existing: result.existing })
          : t("People added: {added}. They'll get an email to set their password.", { added: result.added }),
      paths: ["/people"],
    },
  );
}

export async function removePerson(membershipId: number) {
  const t = await getT();
  return attempt((api) => api.removeMember(membershipId), { message: t("Removed from the workspace."), paths: ["/people"] });
}

/** A new discount code (percent off one course or all of them). */
export async function createCoupon(_state: ActionState, form: FormData): Promise<ActionState> {
  const t = await getT();
  const number = (key: string) => (form.get(key) ? Number(form.get(key)) : null);
  const code = String(form.get("code") ?? "");
  return attempt(
    (api) =>
      api.createCoupon({
        code,
        percent_off: Number(form.get("percent_off") ?? 0),
        course_id: [null, "", "all"].includes(form.get("course_id") as string | null) ? null : String(form.get("course_id")),
        max_uses: number("max_uses"),
        expires_at: form.get("expires_at") ? new Date(String(form.get("expires_at"))).toISOString() : null,
      }),
    { message: t("Code {code} created. Share it with your learners.", { code: code.toUpperCase() }), paths: ["/coupons"] },
  );
}

export async function setCouponActive(id: number, active: boolean) {
  const t = await getT();
  return attempt((api) => api.setCouponActive(id, active), { message: active ? t("Code resumed. Learners can use it again.") : t("Code paused."), paths: ["/coupons"] });
}

export async function deleteCoupon(id: number) {
  const t = await getT();
  return attempt((api) => api.deleteCoupon(id), { message: t("Code deleted."), paths: ["/coupons"] });
}
