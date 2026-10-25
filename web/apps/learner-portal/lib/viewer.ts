import { cache } from "react";
import { cookies } from "next/headers";
import { ApiError, type User } from "@educloud/api-client";
import { hasSession, serverClient } from "@educloud/api-client/server";
import { isStaffRole } from "@educloud/portal-kit/session";

export const CART_COOKIE = "edu_cart";

/**
 * Who is looking at the public website: the signed-in user, or null. Unlike the
 * portal's getContext() this never redirects and needs no workspace.
 */
export const getViewer = cache(async () => {
  const api = await serverClient();
  let me: User | null = null;
  if (await hasSession()) {
    try {
      me = await api.me();
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
    }
  }
  const role = me?.memberships?.[0]?.role;
  // Where "Dashboard" goes: the family dashboard for students and parents. Staff accounts
  // don't belong in this portal, so they get no dashboard link here.
  const dashboardUrl = role && !isStaffRole(role) ? "/dashboard" : null;
  const isStaff = role ? isStaffRole(role) : false;

  return { api, me, dashboardUrl, isStaff, cart: await getCart() };
});

export async function getCart(): Promise<string[]> {
  const raw = (await cookies()).get(CART_COOKIE)?.value ?? "";
  return raw.split(",").filter((id) => /^[0-9a-f-]{36}$/i.test(id));
}

/** A discount code the learner applied in the cart. */
export const COUPON_COOKIE = "edu_coupon";

export async function getCartCoupon(): Promise<string | null> {
  return (await cookies()).get(COUPON_COOKIE)?.value || null;
}

export async function setCartCoupon(code: string | null) {
  const jar = await cookies();
  if (code) jar.set(COUPON_COOKIE, code, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
  else jar.delete(COUPON_COOKIE);
}

export async function setCart(ids: string[]) {
  (await cookies()).set(CART_COOKIE, [...new Set(ids)].slice(0, 20).join(","), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
}

export { LEVEL_LABELS, ORG_LABELS, formatDuration } from "./format";
