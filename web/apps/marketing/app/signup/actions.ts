"use server";

import { ApiError, createClient } from "@educloud/api-client";
import { getI18n } from "@educloud/ui/locale";

type Field = "name" | "email" | "password" | "workspace_type" | "workspace_name" | "workspace_slug" | "country" | "city" | "area";

export interface SignupState {
  ok?: boolean;
  /** Toast text: the first validation message, or the server's reason. */
  error?: string;
  /** Toast text on success. */
  message?: string;
  /** Inline errors under each field. */
  errors?: Partial<Record<Field, string>>;
  /** What the person typed (except the password), so the form keeps it after a failed attempt. */
  values?: Partial<Record<Exclude<Field, "password">, string>> & { video_addon?: boolean };
  /** Bumped on every attempt; re-mounts the form with `values`. */
  attempt?: number;
  done?: { portalUrl: string; email: string };
}

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export async function signup(prev: SignupState, form: FormData): Promise<SignupState> {
  const { t, locale } = await getI18n();
  const attempt = (prev.attempt ?? 0) + 1;

  const values = {
    name: text(form, "name"),
    email: text(form, "email"),
    workspace_type: text(form, "workspace_type") || "school",
    workspace_name: text(form, "workspace_name"),
    workspace_slug: text(form, "workspace_slug"),
    country: text(form, "country").toUpperCase(),
    city: text(form, "city"),
    area: text(form, "area"),
    video_addon: form.get("video_addon") === "1",
  };
  const interval = text(form, "interval");
  const password = String(form.get("password") ?? "");

  // Country and city are required for every new workspace; check them before the round trip.
  const local: SignupState["errors"] = {};
  if (!/^[A-Z]{2}$/.test(values.country)) local.country = t("Please choose your country.");
  if (!values.city) local.city = t("Please enter your city.");
  if (Object.keys(local).length) {
    return { ok: false, error: Object.values(local)[0], errors: local, values, attempt };
  }

  const api = createClient({ baseUrl: process.env.API_URL ?? "http://localhost:8001", locale });
  try {
    await api.register({
      name: values.name,
      email: values.email,
      password,
      workspace_name: values.workspace_name,
      workspace_slug: values.workspace_slug,
      workspace_type: values.workspace_type,
      plan: text(form, "plan") || undefined,
      interval: interval === "yearly" || interval === "monthly" ? interval : undefined,
      video_addon: values.video_addon,
      country: values.country,
      city: values.city,
      area: values.area || undefined,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      const errors = Object.fromEntries(Object.entries(error.errors).map(([k, v]) => [k, v[0] ?? ""])) as SignupState["errors"];
      const first = Object.values(errors ?? {}).find(Boolean);
      return {
        ok: false,
        error: first || error.message || t("Something went wrong. Please try again."),
        errors,
        values,
        attempt,
      };
    }
    return { ok: false, error: t("We couldn't reach the server. Please try again."), values, attempt };
  }

  const portal = process.env.NEXT_PUBLIC_PORTAL_URL ?? "http://localhost:3003";
  return {
    ok: true,
    message: t("Your workspace is ready"),
    attempt,
    done: { portalUrl: `${portal}/login?email=${encodeURIComponent(values.email)}`, email: values.email },
  };
}
