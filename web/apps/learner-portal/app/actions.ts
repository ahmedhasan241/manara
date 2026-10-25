"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { User } from "@educloud/api-client";
import { clearSession, serverClient, setStudent } from "@educloud/api-client/server";
import { isLocale } from "@educloud/ui";
import { getT } from "@educloud/ui/locale";
import { failure, type Result } from "@/lib/action-result";

export async function logout() {
  try {
    await (await serverClient()).logout();
  } catch {}
  await clearSession();
  revalidatePath("/", "layout");
  redirect("/");
}

/** Parents: switch which child the whole portal shows. */
export async function selectChild(studentId: number): Promise<Result> {
  try {
    await setStudent(studentId);
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function markAllRead(): Promise<Result> {
  try {
    await (await serverClient()).markAllNotificationsRead();
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function revokeDevice(id: number): Promise<Result> {
  try {
    await (await serverClient()).revokeDevice(id);
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/settings");
  return { ok: true };
}

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

/** Name, phone, where they live and the language of their emails and the app. */
export async function updateProfile(form: FormData): Promise<Result<{ user?: User }>> {
  const t = await getT();
  const data = {
    name: text(form, "name"),
    phone: text(form, "phone") || null,
    country: text(form, "country").toUpperCase() || null,
    city: text(form, "city") || null,
    area: text(form, "area") || null,
    locale: text(form, "locale"),
  };
  if (!data.name) return { ok: false, error: t("Enter your name."), fields: { name: t("Enter your name.") } };
  try {
    const { user } = await (await serverClient()).updateMe({ ...data, locale: isLocale(data.locale) ? data.locale : undefined });
    revalidatePath("/", "layout");
    return { ok: true, user };
  } catch (error) {
    return failure(error);
  }
}

/** Changes the password; the API signs out every other device. */
export async function changePassword(form: FormData): Promise<Result> {
  const t = await getT();
  const data = {
    current_password: String(form.get("current_password") ?? ""),
    password: String(form.get("password") ?? ""),
    password_confirmation: String(form.get("password_confirmation") ?? ""),
  };
  if (data.password !== data.password_confirmation) {
    return { ok: false, error: t("The two new passwords don't match."), fields: { password_confirmation: t("The two new passwords don't match.") } };
  }
  try {
    await (await serverClient()).changePassword(data);
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/settings");
  return { ok: true };
}
