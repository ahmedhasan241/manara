"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { LearningStats, LectureNote, Playback } from "@educloud/api-client";
import { performLogin, type LoginStepState } from "@educloud/api-client/login-action";
import { clearSession, hasSession, serverClient, setSession } from "@educloud/api-client/server";
import { getCart, getCartCoupon, setCart, setCartCoupon } from "@/lib/viewer";
import { failure, needsLogin, type Result } from "@/lib/action-result";
import { getT } from "@educloud/ui/locale";

export interface AuthState extends LoginStepState {
  done?: boolean;
  info?: string;
  /** First name of whoever just signed in, for the welcome toast. */
  name?: string;
  /** First validation message per field. */
  fields?: Record<string, string>;
  /** What was typed, so a failed sign-up keeps it. */
  values?: Record<string, string>;
}

/** Sign in from the website dialog (password, then two-factor if enabled). */
export async function dialogLogin(state: AuthState, form: FormData): Promise<AuthState> {
  const result = await performLogin(state, form);
  if (!result.user) return result.state;
  revalidatePath("/", "layout");
  return { step: "password", done: true, name: result.user.name };
}

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export async function dialogRegister(_state: AuthState, form: FormData): Promise<AuthState> {
  const t = await getT();
  const values = { name: text(form, "name"), email: text(form, "email"), country: text(form, "country").toUpperCase(), city: text(form, "city"), area: text(form, "area") };
  const missing: Record<string, string> = {};
  if (!values.country) missing.country = t("Choose your country.");
  if (!values.city) missing.city = t("Enter your city.");
  if (Object.keys(missing).length) return { step: "password", error: Object.values(missing)[0], fields: missing, values };

  try {
    const result = await (await serverClient()).registerLearner({
      name: values.name,
      email: values.email,
      password: String(form.get("password") ?? ""),
      country: values.country,
      city: values.city,
      area: values.area || null,
      device_name: "web",
    });
    await setSession(result.token);
    revalidatePath("/", "layout");
    return { step: "password", done: true, name: result.user?.name ?? values.name };
  } catch (error) {
    const { error: message, fields } = await failure(error);
    return { step: "password", error: message, fields, values };
  }
}

export async function dialogForgot(_state: AuthState, form: FormData): Promise<AuthState> {
  const email = text(form, "email");
  try {
    const result = await (await serverClient()).forgotPassword(email);
    return { step: "password", info: result.message, done: true, email };
  } catch (error) {
    const { error: message, fields } = await failure(error);
    return { step: "password", error: message, fields, email };
  }
}

export async function resetPassword(_state: AuthState, form: FormData): Promise<AuthState> {
  try {
    const result = await (await serverClient()).resetPassword({
      token: String(form.get("token") ?? ""),
      email: text(form, "email"),
      password: String(form.get("password") ?? ""),
      password_confirmation: String(form.get("password_confirmation") ?? ""),
    });
    return { step: "password", done: true, info: result.message };
  } catch (error) {
    const { error: message, fields } = await failure(error);
    return { step: "password", error: message, fields };
  }
}

/** Signs out on every page of this portal. The client shows "Signed out." as it leaves. */
export async function siteLogout() {
  try {
    await (await serverClient()).logout();
  } catch {}
  await clearSession();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function addToCart(courseId: string): Promise<Result> {
  await setCart([...(await getCart()), courseId]);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Save a course for later, or take it off the wishlist. */
export async function setWishlisted(courseId: string, saved: boolean): Promise<Result<{ saved: boolean }>> {
  if (!(await hasSession())) return needsLogin();
  try {
    const api = await serverClient();
    await (saved ? api.addToWishlist(courseId) : api.removeFromWishlist(courseId));
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/wishlist");
  return { ok: true, saved };
}

/** Checks a discount code against the cart and keeps it for checkout. */
export async function applyCoupon(raw: string): Promise<Result> {
  const t = await getT();
  const code = raw.trim();
  if (!code) return { ok: false, error: t("Enter a discount code first.") };
  try {
    const result = await (await serverClient()).checkCoupon(code, await getCart());
    await setCartCoupon(result.code);
    revalidatePath("/cart");
    return { ok: true, message: t("Code {code} applied: {percent}% off.", { code: result.code, percent: result.percent_off }) };
  } catch (error) {
    return failure(error);
  }
}

export async function removeCoupon(): Promise<Result> {
  await setCartCoupon(null);
  revalidatePath("/cart");
  return { ok: true };
}

export async function removeFromCart(courseId: string): Promise<Result> {
  await setCart((await getCart()).filter((id) => id !== courseId));
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Turns the cart (or one "Buy now" course) into an order and goes to payment.
 * Free courses are added straight to My learning.
 */
export async function checkout(courseIds?: string[]): Promise<Result> {
  const t = await getT();
  if (!(await hasSession())) return needsLogin();
  const ids = courseIds ?? (await getCart());
  if (ids.length === 0) return { ok: false, error: t("Your cart is empty.") };

  let target: string;
  try {
    const { order } = await (await serverClient()).createOrder(ids, courseIds ? undefined : ((await getCartCoupon()) ?? undefined));
    if (!courseIds) {
      await setCart([]);
      await setCartCoupon(null);
    } else await setCart((await getCart()).filter((id) => !ids.includes(id)));
    target = order ? `/checkout/${order.id}` : "/my-learning?added=1";
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/", "layout");
  redirect(target);
}

export async function payOrder(orderId: string): Promise<Result> {
  try {
    await (await serverClient()).payOrder(orderId);
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/", "layout");
  redirect(`/my-learning?purchased=${orderId}`);
}

export async function cancelOrder(orderId: string): Promise<Result> {
  try {
    await (await serverClient()).cancelOrder(orderId);
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/", "layout");
  redirect("/cart");
}

export async function enrollFree(slug: string): Promise<Result> {
  if (!(await hasSession())) return needsLogin();
  try {
    await (await serverClient()).enrollFree(slug);
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/", "layout");
  redirect(`/learn/${slug}`);
}

export async function previewLecture(id: string): Promise<Playback | { error: string }> {
  try {
    return await (await serverClient()).previewLecture(id);
  } catch (error) {
    return { error: (await failure(error)).error };
  }
}

export async function playLecture(id: string): Promise<Playback | { error: string }> {
  try {
    return await (await serverClient()).playLecture(id);
  } catch (error) {
    return { error: (await failure(error)).error };
  }
}

/** Progress pings from the player: silent, never throws. */
export async function saveProgress(lectureId: string, data: { completed?: boolean; position_seconds?: number }) {
  try {
    return await (await serverClient()).saveLectureProgress(lectureId, data);
  } catch {
    return null;
  }
}

export async function reviewCourse(form: FormData): Promise<Result> {
  const t = await getT();
  const slug = String(form.get("slug"));
  const rating = Number(form.get("rating"));
  if (!rating) return { ok: false, error: t("Pick a star rating first."), fields: { rating: t("Pick a star rating first.") } };
  try {
    await (await serverClient()).reviewLearningCourse(slug, { rating, comment: String(form.get("comment") ?? "").trim() || null });
  } catch (error) {
    return failure(error);
  }
  revalidatePath(`/learn/${slug}`);
  revalidatePath(`/course/${slug}`);
  return { ok: true };
}

export async function addNote(lectureId: string, body: string, positionSeconds: number | null): Promise<Result<{ note: LectureNote }>> {
  try {
    return { ok: true, note: await (await serverClient()).addNote(lectureId, { body, position_seconds: positionSeconds }) };
  } catch (error) {
    return failure(error);
  }
}

export async function updateNote(id: number, body: string): Promise<Result<{ note: LectureNote }>> {
  try {
    return { ok: true, note: await (await serverClient()).updateNote(id, body) };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteNote(id: number): Promise<Result> {
  try {
    await (await serverClient()).deleteNote(id);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function setWeeklyGoal(minutes: number): Promise<Result<{ stats: LearningStats }>> {
  try {
    return { ok: true, stats: await (await serverClient()).setWeeklyGoal(minutes) };
  } catch (error) {
    return failure(error);
  }
}
