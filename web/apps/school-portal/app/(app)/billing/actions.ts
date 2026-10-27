"use server";

import type { BillingChange, BillingInterval } from "@educloud/api-client";
import { attempt } from "@educloud/portal-kit/action-result";
import { getT } from "@educloud/ui/locale";
import type { ActionState } from "@/app/builder-actions";

/**
 * Changes the workspace's package (plan, interval, extra seats, video
 * meetings). There is no payment step yet: it applies at once and the next
 * invoice is adjusted by hand.
 */
export async function saveBilling(_state: ActionState, form: FormData): Promise<ActionState> {
  const t = await getT();
  const seats = (key: string) => Math.max(0, Math.floor(Number(form.get(key) ?? 0) || 0));
  const change: BillingChange = {
    plan: String(form.get("plan") ?? "") || undefined,
    interval: (String(form.get("interval") ?? "") || undefined) as BillingInterval | undefined,
    extra_students: seats("extra_students"),
    extra_staff: seats("extra_staff"),
  };
  // Left out when the chosen plan already includes video meetings.
  if (form.has("video_addon_shown")) change.video_addon = form.get("video_addon") === "on";

  return attempt((api) => api.updateBilling(change), {
    message: t("Package updated. Changes apply right away; we'll adjust your next invoice."),
    paths: [["/", "layout"]],
  });
}
