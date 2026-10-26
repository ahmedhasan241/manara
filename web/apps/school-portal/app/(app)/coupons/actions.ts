"use server";

import type { ActionResult } from "@educloud/ui";
import { createCoupon } from "@/app/builder-actions";

/** createCoupon for a form page (ToastForm passes only the form). */
export async function createCouponFromPage(form: FormData) {
  return (await createCoupon({}, form)) as ActionResult;
}
