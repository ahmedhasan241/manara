"use client";

import { useActionState } from "react";
import type { Plan, Subscription } from "@educloud/api-client";
import { Alert, Button, Checkbox, Field, Input, Select, useFormat, useStateToast, useT } from "@educloud/ui";
import { changePlan, type ActionResult } from "@/app/actions";

type CurrentSubscription = Pick<Subscription, "interval" | "extra_students" | "extra_staff" | "video_addon"> & { plan: Pick<Plan, "id"> };

export function ChangePlanForm({ tenantId, plans, current }: { tenantId: number; plans: Plan[]; current?: CurrentSubscription }) {
  const fmt = useFormat();
  const t = useT();
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(changePlan.bind(null, tenantId), null);
  useStateToast(state);

  return (
    <form action={action} className="space-y-4">
      {state && !state.ok && <Alert>{state.error}</Alert>}
      <Field label={t("Package")} htmlFor="plan_id">
        <Select id="plan_id" name="plan_id" defaultValue={current?.plan.id}>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {t("{price}/mo", { price: fmt.money(p.price_monthly_cents, p.currency) })}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("Status")} htmlFor="status">
          <Select id="status" name="status" defaultValue="active">
            <option value="active">{t("Active (paid)")}</option>
            <option value="trialing">{t("Trial")}</option>
            <option value="past_due">{t("Past due")}</option>
            <option value="canceled">{t("Canceled")}</option>
          </Select>
        </Field>
        <Field label={t("Billing")} htmlFor="interval">
          <Select id="interval" name="interval" defaultValue={current?.interval ?? "monthly"}>
            <option value="monthly">{t("Monthly")}</option>
            <option value="yearly">{t("Yearly")}</option>
          </Select>
        </Field>
        <Field label={t("Extra student seats")} htmlFor="extra_students">
          <Input id="extra_students" name="extra_students" type="number" min="0" step="1" defaultValue={current?.extra_students ?? 0} />
        </Field>
        <Field label={t("Extra staff seats")} htmlFor="extra_staff">
          <Input id="extra_staff" name="extra_staff" type="number" min="0" step="1" defaultValue={current?.extra_staff ?? 0} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox name="video_addon" defaultChecked={current?.video_addon ?? false} /> {t("Video meetings add-on")}
      </label>
      <Field label={t("Paid until (optional)")} htmlFor="current_period_ends_at">
        <Input id="current_period_ends_at" name="current_period_ends_at" type="date" />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? t("Saving…") : t("Apply")}
      </Button>
    </form>
  );
}
