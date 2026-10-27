"use client";

import { useActionState, useState } from "react";
import type { Billing, BillingInterval, Plan } from "@educloud/api-client";
import { Alert, Button, Card, Field, Input, Select, useFormat, useStateToast, useT } from "@educloud/ui";
import type { ActionState } from "@/app/builder-actions";
import { saveBilling } from "@/app/(app)/billing/actions";

/** What the package costs per interval: plan + extra seats + video add-on (a year is 10 months). */
export function packagePrice(plan: Plan, interval: BillingInterval, extraStudents: number, extraStaff: number, video: boolean) {
  const months = interval === "yearly" ? 10 : 1;
  const base = interval === "yearly" ? plan.price_yearly_cents : plan.price_monthly_cents;
  const extras = extraStudents * plan.extra_student_cents + extraStaff * plan.extra_staff_cents + (video && plan.video_addon_cents != null ? plan.video_addon_cents : 0);
  return base + extras * months;
}

/**
 * Owners and admins change the package here: plan, monthly or yearly, extra
 * student and staff seats, and the video meetings add-on, with the new price
 * worked out as they go.
 */
export function BillingForm({ billing }: { billing: Billing }) {
  const t = useT();
  const fmt = useFormat();
  const [state, action, pending] = useActionState(saveBilling, {} as ActionState);
  useStateToast(state);
  const errors = state.ok === false ? (state.errors ?? {}) : {};
  const error = (key: string) => errors[key]?.[0];

  const { subscription } = billing;
  const [planCode, setPlanCode] = useState(billing.plan.code);
  const [interval, setBillingInterval] = useState<BillingInterval>(subscription.interval);
  const [extraStudents, setExtraStudents] = useState(subscription.extra_students);
  const [extraStaff, setExtraStaff] = useState(subscription.extra_staff);
  const [video, setVideo] = useState(subscription.video_addon);

  const plan = billing.plans.find((p) => p.code === planCode) ?? billing.plan;
  const money = (cents: number) => fmt.exactMoney(cents, plan.currency);
  const perInterval = (cents: number, every: BillingInterval = interval) => (every === "yearly" ? t("{price} billed yearly", { price: money(cents) }) : t("{price}/mo", { price: money(cents) }));
  const total = packagePrice(plan, interval, extraStudents, extraStaff, video);
  const videoIncluded = plan.video_addon_cents == null;
  const count = (value: string) => Math.max(0, Math.floor(Number(value) || 0));

  return (
    <form action={action}>
      <Card className="p-4 sm:p-6">
        <h2 className="mb-1 font-display text-lg font-bold">{t("Change your package")}</h2>
        <p className="mb-5 text-sm text-ink-muted">{t("Changes apply right away; we'll adjust your next invoice.")}</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("Plan")} htmlFor="billing-plan" error={error("plan")}>
            <Select id="billing-plan" name="plan" value={planCode} onChange={(e) => setPlanCode(e.target.value)} required>
              {billing.plans.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name} — {fmt.exactMoney(interval === "yearly" ? p.price_yearly_cents : p.price_monthly_cents, p.currency)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("Billing")} htmlFor="billing-interval" error={error("interval")}>
            <Select id="billing-interval" name="interval" value={interval} onChange={(e) => setBillingInterval(e.target.value as BillingInterval)} searchable={false}>
              <option value="monthly">{t("Monthly")}</option>
              <option value="yearly">{t("Yearly")}</option>
            </Select>
          </Field>
          <Field
            label={t("Extra student seats")}
            htmlFor="billing-extra-students"
            error={error("extra_students")}
            hint={
              plan.max_students == null
                ? t("This plan has unlimited students.")
                : t("{included} included in the plan; each extra seat is {price}.", { included: plan.max_students, price: perInterval(plan.extra_student_cents, "monthly") })
            }
          >
            <Input id="billing-extra-students" name="extra_students" type="number" inputMode="numeric" min={0} step={1} value={extraStudents} onChange={(e) => setExtraStudents(count(e.target.value))} />
          </Field>
          <Field
            label={t("Extra staff seats")}
            htmlFor="billing-extra-staff"
            error={error("extra_staff")}
            hint={
              plan.max_staff == null
                ? t("This plan has unlimited staff.")
                : t("{included} included in the plan; each extra seat is {price}.", { included: plan.max_staff, price: perInterval(plan.extra_staff_cents, "monthly") })
            }
          >
            <Input id="billing-extra-staff" name="extra_staff" type="number" inputMode="numeric" min={0} step={1} value={extraStaff} onChange={(e) => setExtraStaff(count(e.target.value))} />
          </Field>
          <div className="sm:col-span-2">
            {videoIncluded ? (
              <p className="rounded-xl border border-line px-3 py-2.5 text-sm text-ink-muted">{t("Video meetings are included in this plan.")}</p>
            ) : (
              <label className="flex items-start gap-3 rounded-xl border border-line px-3 py-2.5 text-sm">
                <input type="hidden" name="video_addon_shown" value="1" />
                <input type="checkbox" name="video_addon" checked={video} onChange={(e) => setVideo(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-600" />
                <span>
                  <span className="block font-medium">{t("Video meetings")}</span>
                  <span className="block text-ink-muted">{t("Live lessons over Zoom or Jitsi. {price}.", { price: perInterval(plan.video_addon_cents ?? 0, "monthly") })}</span>
                </span>
              </label>
            )}
            {error("video_addon") && <p className="mt-1.5 text-sm text-danger">{error("video_addon")}</p>}
          </div>
        </div>

        {state.ok === false && !Object.keys(errors).length && state.error && (
          <div className="mt-4">
            <Alert>{state.error}</Alert>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">{t("New price")}</p>
            <p className="font-display text-2xl font-bold text-heading" aria-live="polite">
              {perInterval(total)}
            </p>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? t("Saving…") : t("Save changes")}
          </Button>
        </div>
      </Card>
    </form>
  );
}
