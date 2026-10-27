import type { Plan, Subscription } from "@educloud/api-client";
import type { Formatters, Translate } from "@educloud/ui";

type Priced = Pick<Subscription, "interval" | "amount_cents" | "currency"> & { plan: Pick<Plan, "price_monthly_cents" | "price_yearly_cents" | "currency"> };

/**
 * What the workspace pays per billing interval: the agreed amount (seats and
 * add-ons included) when known, otherwise the plan's list price.
 */
export function subscriptionPrice(s: Priced, fmt: Formatters, t: Translate): string {
  const yearly = s.interval === "yearly";
  const price =
    s.amount_cents != null
      ? fmt.exactMoney(s.amount_cents, s.currency ?? s.plan.currency)
      : fmt.money(yearly ? s.plan.price_yearly_cents : s.plan.price_monthly_cents, s.plan.currency);
  return yearly ? t("{price} / year", { price }) : t("{price}/mo", { price });
}

/** Extra seats bought beyond the plan, e.g. "Extra students: 20 · Extra staff: 2". */
export function subscriptionSeats(s: Pick<Subscription, "extra_students" | "extra_staff">, t: Translate): string {
  return [s.extra_students > 0 && t("Extra students: {number}", { number: s.extra_students }), s.extra_staff > 0 && t("Extra staff: {number}", { number: s.extra_staff })]
    .filter(Boolean)
    .join(" · ");
}
