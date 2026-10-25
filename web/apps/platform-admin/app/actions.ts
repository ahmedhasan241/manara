"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { MarketingContent, Plan } from "@educloud/api-client";
import { performLogin, type LoginStepState } from "@educloud/api-client/login-action";
import { clearSession, serverClient } from "@educloud/api-client/server";
import type { ActionResult } from "@educloud/ui";
import { getT } from "@educloud/ui/locale";
import { failure, fieldErrors } from "@/lib/action-result";

export type { ActionResult };

export async function login(state: LoginStepState, form: FormData): Promise<LoginStepState> {
  const t = await getT();
  const result = await performLogin(state, form);
  if (!result.user) return result.state;
  if (!result.user.is_platform_admin) {
    await clearSession();
    return { step: "password", error: t("This account is not a Manara staff account.") };
  }
  redirect("/");
}

export async function logout() {
  try {
    await (await serverClient()).logout();
  } catch {}
  await clearSession();
  redirect("/login?signed_out=1");
}

export async function setTenantStatus(id: number, status: "active" | "suspended"): Promise<ActionResult> {
  const t = await getT();
  try {
    await (await serverClient()).platformUpdateTenant(id, { status });
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/tenants");
  revalidatePath(`/tenants/${id}`);
  return { ok: true, message: status === "suspended" ? t("Workspace suspended. Nobody in it can sign in.") : t("Workspace reactivated.") };
}

export async function changePlan(tenantId: number, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const t = await getT();
  try {
    await (await serverClient()).platformChangePlan(tenantId, {
      plan_id: Number(form.get("plan_id")),
      status: String(form.get("status")),
      interval: String(form.get("interval") || "monthly"),
      current_period_ends_at: String(form.get("current_period_ends_at") || "") || null,
    });
  } catch (error) {
    return failure(error);
  }
  revalidatePath(`/tenants/${tenantId}`);
  revalidatePath("/subscriptions");
  return { ok: true, message: t("Subscription updated.") };
}

export async function setUserSuspended(userId: number, suspended: boolean, reason?: string): Promise<ActionResult> {
  const t = await getT();
  try {
    await (await serverClient()).platformSuspendUser(userId, suspended, reason);
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/users");
  revalidatePath(`/users/${userId}`);
  return { ok: true, message: suspended ? t("Account suspended and signed out everywhere.") : t("Account reactivated.") };
}

export async function resetUserMfa(userId: number): Promise<ActionResult> {
  const t = await getT();
  try {
    await (await serverClient()).platformResetMfa(userId);
  } catch (error) {
    return failure(error);
  }
  revalidatePath(`/users/${userId}`);
  return { ok: true, message: t("Two-factor authentication turned off.") };
}

export async function updateSubscription(id: number, data: { status?: string; trial_ends_at?: string | null }): Promise<ActionResult> {
  const t = await getT();
  try {
    await (await serverClient()).platformUpdateSubscription(id, data);
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/subscriptions");
  const message =
    data.status === "active" ? t("Subscription marked as paid.") : data.status === "canceled" ? t("Subscription canceled.") : data.trial_ends_at ? t("Trial extended by 14 days.") : t("Subscription updated.");
  return { ok: true, message };
}

export async function savePlan(id: number | null, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const t = await getT();
  const num = (key: string) => (form.get(key) === "" || form.get(key) === null ? null : Number(form.get(key)));
  const lines = (key: string) =>
    String(form.get(key) ?? "")
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);
  // Fields named tr.{locale}.{field}; empty ones fall back to English on the site.
  const translations: NonNullable<Plan["translations"]> = {};
  for (const code of ["ar", "fr", "es", "pt", "zh"] as const) {
    const name = String(form.get(`tr.${code}.name`) ?? "").trim();
    const description = String(form.get(`tr.${code}.description`) ?? "").trim();
    const features = lines(`tr.${code}.features`);
    if (name || description || features.length) translations[code] = { name, description, features };
  }
  const data: Partial<Plan> = {
    translations,
    code: String(form.get("code")),
    name: String(form.get("name")),
    description: String(form.get("description") ?? "") || null,
    price_monthly_cents: Math.round(Number(form.get("price_monthly")) * 100),
    price_yearly_cents: Math.round(Number(form.get("price_yearly") || 0) * 100),
    currency: String(form.get("currency") || "USD").toUpperCase(),
    max_students: num("max_students"),
    max_staff: num("max_staff"),
    storage_gb: Number(form.get("storage_gb") || 5),
    features: lines("features"),
    is_active: form.get("is_active") === "on",
  };
  try {
    const api = await serverClient();
    if (id) await api.platformUpdatePlan(id, data);
    else await api.platformCreatePlan(data);
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/plans");
  return { ok: true, message: id ? t("Package saved.") : t("Package created.") };
}

export async function saveWebsiteSection<K extends keyof MarketingContent>(key: K, content: MarketingContent[K]): Promise<ActionResult> {
  const t = await getT();
  try {
    await (await serverClient()).platformUpdateWebsite(key, content);
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/website");
  return { ok: true, message: t("Saved. The website updates within a minute.") };
}

export async function resetWebsiteSection(key: keyof MarketingContent): Promise<ActionResult> {
  const t = await getT();
  try {
    await (await serverClient()).platformResetWebsite(key);
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/website");
  return { ok: true, message: t("Restored to default. Reload to see it.") };
}

/** Pause a marketplace course (e.g. after a complaint) or put it back. */
export async function setCourseStatus(courseId: string, status: "published" | "suspended"): Promise<ActionResult> {
  const t = await getT();
  try {
    await (await serverClient()).platformCourseStatus(courseId, status);
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/marketplace");
  return { ok: true, message: status === "suspended" ? t("Course paused. It's hidden from the website.") : t("Course restored to the website.") };
}

/* ---------- Your account ---------- */

export interface ProfileState {
  ok?: boolean;
  error?: string;
  message?: string;
  fields?: Record<string, string>;
}

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export async function saveProfile(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const t = await getT();
  const locale = text(form, "locale");
  try {
    await (await serverClient()).updateMe({
      name: text(form, "name"),
      headline: text(form, "headline") || null,
      bio: text(form, "bio") || null,
      phone: text(form, "phone") || null,
      country: text(form, "country") || null,
      city: text(form, "city") || null,
      area: text(form, "area") || null,
      ...(locale ? { locale } : {}),
    });
  } catch (error) {
    const result = await failure(error);
    return { ok: false, error: result.error, fields: fieldErrors(result.errors) };
  }
  if (locale) (await cookies()).set("locale", locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
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
      password_confirmation: String(form.get("password_confirmation") ?? ""),
    });
  } catch (error) {
    const result = await failure(error);
    return { ok: false, error: result.error, fields: fieldErrors(result.errors) };
  }
  return { ok: true, message: t("Password changed. Other devices were signed out.") };
}
