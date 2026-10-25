import { cache } from "react";
import { redirect } from "next/navigation";
import { ApiError, type Role, type Workspace } from "@educloud/api-client";
import { clearSession, hasSession, serverClient } from "@educloud/api-client/server";

export type Audience = "staff" | "learner";

const STAFF_ROLES: Role[] = ["owner", "admin", "teacher"];

export const isStaffRole = (role: Role) => STAFF_ROLES.includes(role);

/** Where each audience's portal lives. */
export const portalUrl = (audience: Audience) =>
  audience === "staff"
    ? (process.env.NEXT_PUBLIC_STAFF_PORTAL_URL ?? "http://localhost:3003")
    : (process.env.NEXT_PUBLIC_LEARNER_PORTAL_URL ?? "http://localhost:3004");

/**
 * The signed-in user and current workspace, loaded once per request.
 */
export const getContext = cache(async () => {
  if (!(await hasSession())) redirect("/login");
  const api = await serverClient();

  try {
    const [me, workspace] = await Promise.all([api.me(), api.workspace()]);
    return { api, me, workspace, can: (permission: string) => workspace.permissions.includes(permission), isStaff: isStaff(workspace) };
  } catch (error) {
    // Expired or revoked token: the login page explains why (cookies can't be cleared while rendering; signing in replaces it).
    if (error instanceof ApiError && error.status === 401) redirect("/login?expired=1");
    if (error instanceof ApiError && error.code === "account_suspended") {
      await clearSession();
      redirect("/login?suspended=1");
    }
    if (error instanceof ApiError && error.code === "mfa_setup_required") redirect("/settings?mfa=required");
    // Signed in, but not as someone who belongs to this workspace (e.g. a session from
    // another app, or a workspace they were removed from): ask them to sign in again.
    if (error instanceof ApiError && (error.status === 403 || error.status === 404)) redirect("/login?switch=1");
    throw error;
  }
});

/**
 * Keeps each portal to its own people: teachers and admins in the staff
 * portal, students and parents in the learner & family portal. Someone in the
 * wrong one is sent to the right portal, or to `elsewhere` (a page in this
 * app) when the app should not link out to the other one.
 */
export async function requireAudience(audience: Audience, elsewhere?: string) {
  const context = await getContext();
  if (context.isStaff !== (audience === "staff")) {
    redirect(elsewhere ?? portalUrl(context.isStaff ? "staff" : "learner"));
  }
  return context;
}

function isStaff(workspace: Workspace) {
  return isStaffRole(workspace.role);
}
