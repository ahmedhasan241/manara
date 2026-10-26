"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { Pencil } from "lucide-react";
import { type Plan } from "@educloud/api-client";
import { Alert, Badge, Button, Card, Checkbox, Field, FormActions, FormSection, Input, LOCALES, TabsContent, TabsList, TabsRoot, TabsTrigger, Textarea, buttonClass, localeDir, useFormat, useLocale, useStateToast, useT } from "@educloud/ui";
import { savePlan, type ActionResult } from "@/app/actions";

/** A package as a card on the list: price, limits, subscribers and an Edit link. */
export function PlanCard({ plan }: { plan: Plan & { subscriptions_count?: number } }) {
  const fmt = useFormat();
  const t = useT();
  return (
    <Card interactive className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-bold">{plan.name}</h2>
          <p className="font-mono text-xs text-ink-muted">{plan.code}</p>
        </div>
        <Badge tone={plan.is_active ? "success" : "neutral"}>{plan.is_active ? t("On website") : t("Hidden")}</Badge>
      </div>
      <p className="mt-4 font-display text-3xl font-bold">
        {fmt.exactMoney(plan.price_monthly_cents, plan.currency)}
        <span className="text-sm font-normal text-ink-muted"> {t("/ month")}</span>
      </p>
      <p className="text-xs text-ink-muted">{t("{price} / year", { price: fmt.exactMoney(plan.price_yearly_cents, plan.currency) })}</p>
      <dl className="mt-4 flex-1 space-y-1 text-sm">
        {[
          [t("Active subscribers"), plan.subscriptions_count ?? 0],
          [t("Students"), plan.max_students ?? t("Unlimited")],
          [t("Staff"), plan.max_staff ?? t("Unlimited")],
          [t("Storage"), `${plan.storage_gb} GB`],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <dt className="text-ink-muted">{k}</dt>
            <dd className="font-medium tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      <Link href={`/plans/${plan.id}/edit`} className={`${buttonClass("secondary", "sm")} mt-5`}>
        <Pencil className="h-4 w-4" /> {t("Edit")}
      </Link>
    </Card>
  );
}

/**
 * The package form, on its own page for creating (/plans/new) and editing
 * (/plans/[id]/edit). Saving goes back to the package list.
 */
export function PlanForm({ plan }: { plan?: Plan }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(savePlan.bind(null, plan?.id ?? null), null);
  useStateToast(state);

  useEffect(() => {
    if (state?.ok) router.push("/plans");
  }, [state, router]);

  return (
    <form action={action}>
      <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-soft)] sm:p-6">
        {state && !state.ok && (
          <div className="mb-5">
            <Alert>{state.error}</Alert>
          </div>
        )}
        <FormSection title={t("Name")} description={t("What schools, universities and teachers can subscribe to. Prices and benefits appear on the website within a minute of saving.")}>
          <Field label={t("Name")} htmlFor="plan-name">
            <Input id="plan-name" name="name" defaultValue={plan?.name} required autoFocus={!plan} />
          </Field>
          <Field label={t("Code")} htmlFor="plan-code">
            <Input id="plan-code" name="code" defaultValue={plan?.code} required pattern="[a-z0-9_-]+" />
          </Field>
          <div className="sm:col-span-2">
            <Field label={t("Description")} htmlFor="plan-desc">
              <Input id="plan-desc" name="description" defaultValue={plan?.description ?? ""} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <Checkbox name="is_active" defaultChecked={plan?.is_active ?? true} /> {t("Show on the website")}
          </label>
        </FormSection>

        <FormSection title={t("Price")}>
          <Field label={t("Monthly")} htmlFor="plan-pm">
            <Input id="plan-pm" name="price_monthly" type="number" step="0.01" min="0" defaultValue={plan ? plan.price_monthly_cents / 100 : ""} required />
          </Field>
          <Field label={t("Yearly")} htmlFor="plan-py">
            <Input id="plan-py" name="price_yearly" type="number" step="0.01" min="0" defaultValue={plan ? plan.price_yearly_cents / 100 : ""} />
          </Field>
          <Field label={t("Currency")} htmlFor="plan-cur">
            <Input id="plan-cur" name="currency" maxLength={3} defaultValue={plan?.currency ?? "USD"} />
          </Field>
        </FormSection>

        <FormSection title={t("Storage")} description={t("Empty = unlimited")}>
          <Field label={t("Max students")} htmlFor="plan-ms">
            <Input id="plan-ms" name="max_students" type="number" min="1" defaultValue={plan?.max_students ?? ""} />
          </Field>
          <Field label={t("Max staff")} htmlFor="plan-mf">
            <Input id="plan-mf" name="max_staff" type="number" min="1" defaultValue={plan?.max_staff ?? ""} />
          </Field>
          <Field label={t("Storage GB")} htmlFor="plan-gb">
            <Input id="plan-gb" name="storage_gb" type="number" min="1" defaultValue={plan?.storage_gb ?? 5} />
          </Field>
          <div className="sm:col-span-2">
            <Field label={t("Benefits (one per line)")} htmlFor="plan-features">
              <Textarea id="plan-features" name="features" rows={5} defaultValue={plan?.features?.join("\n") ?? ""} />
            </Field>
          </div>
        </FormSection>

        <FormSection title={t("Translations")} description={t("Empty fields show the English text.")}>
          <div className="sm:col-span-2">
            <TabsRoot defaultValue="ar" dir={localeDir(locale)}>
              <TabsList className="w-full overflow-x-auto">
                {LOCALES.filter((l) => l.code !== "en").map((l) => (
                  <TabsTrigger key={l.code} value={l.code} lang={l.code}>
                    {l.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              {LOCALES.filter((l) => l.code !== "en").map((l) => {
                const tr = plan?.translations?.[l.code];
                return (
                  <TabsContent key={l.code} value={l.code} forceMount className="mt-3 space-y-3 data-[state=inactive]:hidden" dir={l.dir} lang={l.code}>
                    <Field label={t("Name")} htmlFor={`tn-${l.code}`}>
                      <Input id={`tn-${l.code}`} name={`tr.${l.code}.name`} defaultValue={tr?.name ?? ""} />
                    </Field>
                    <Field label={t("Description")} htmlFor={`td-${l.code}`}>
                      <Input id={`td-${l.code}`} name={`tr.${l.code}.description`} defaultValue={tr?.description ?? ""} />
                    </Field>
                    <Field label={t("Benefits (one per line)")} htmlFor={`tf-${l.code}`}>
                      <Textarea id={`tf-${l.code}`} name={`tr.${l.code}.features`} rows={4} defaultValue={tr?.features?.join("\n") ?? ""} />
                    </Field>
                  </TabsContent>
                );
              })}
            </TabsRoot>
          </div>
        </FormSection>
      </div>
      <FormActions cancel={{ href: "/plans", label: t("Cancel") }}>
        <Button type="submit" disabled={pending}>
          {pending ? t("Saving…") : t("Save")}
        </Button>
      </FormActions>
    </form>
  );
}
