"use server";

import { ApiError, createClient } from "@educloud/api-client";
import { getI18n } from "../locale-server";

export interface SignupState {
  errors?: Record<string, string>;
  message?: string;
  done?: { portalUrl: string; email: string };
}

export async function signup(_prev: SignupState, form: FormData): Promise<SignupState> {
  const { t, locale } = await getI18n();
  const api = createClient({ baseUrl: process.env.API_URL ?? "http://localhost:8001", locale });
  const email = String(form.get("email") ?? "");

  try {
    await api.register({
      name: String(form.get("name") ?? ""),
      email,
      password: String(form.get("password") ?? ""),
      workspace_name: String(form.get("workspace_name") ?? ""),
      workspace_slug: String(form.get("workspace_slug") ?? ""),
      workspace_type: String(form.get("workspace_type") ?? "school"),
      plan: String(form.get("plan") ?? "") || undefined,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        message: error.status === 422 ? t("Please fix the highlighted fields.") : error.message,
        errors: Object.fromEntries(Object.entries(error.errors).map(([k, v]) => [k, v[0] ?? ""])),
      };
    }
    return { message: t("We couldn't reach the server. Please try again.") };
  }

  const portal = process.env.NEXT_PUBLIC_PORTAL_URL ?? "http://localhost:3003";
  return { done: { portalUrl: `${portal}/login?email=${encodeURIComponent(email)}`, email } };
}
