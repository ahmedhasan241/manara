"use client";

import { useActionState, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Pencil, Plus } from "lucide-react";
import { type Plan } from "@educloud/api-client";
import { Alert, Badge, Button, Card, Checkbox, Field, Input, LOCALES, TabsContent, TabsList, TabsRoot, TabsTrigger, Textarea, localeDir, useFormat, useLocale, useStateToast, useT } from "@educloud/ui";
import { savePlan, type ActionResult } from "@/app/actions";

/**
 * A package card that flips into an edit form. With no plan, it creates one.
 */
export function PlanEditor({ plan }: { plan?: Plan & { subscriptions_count?: number } }) {
  const fmt = useFormat();
  const t = useT();
  const locale = useLocale();
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(savePlan.bind(null, plan?.id ?? null), null);
  useStateToast(state);

  useEffect(() => {
    if (state?.ok) setEditing(false);
  }, [state]);

  if (!editing) {
    if (!plan) {
      return (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex h-full min-h-64 w-full flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border-2 border-dashed border-line text-ink-muted transition hover:border-brand-400 hover:text-brand-600"
        >
          <Plus className="h-8 w-8" />
          <span className="font-semibold">{t("New package")}</span>
        </button>
      );
    }
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
        <Button variant="secondary" size="sm" className="mt-5" onClick={() => setEditing(true)}>
          <Pencil className="h-4 w-4" /> {t("Edit")}
        </Button>
      </Card>
    );
  }

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
        <Card>
          <form action={action} className="space-y-3">
            {state && !state.ok && <Alert>{state.error}</Alert>}
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("Name")} htmlFor={`name-${plan?.id}`}>
                <Input id={`name-${plan?.id}`} name="name" defaultValue={plan?.name} required />
              </Field>
              <Field label={t("Code")} htmlFor={`code-${plan?.id}`}>
                <Input id={`code-${plan?.id}`} name="code" defaultValue={plan?.code} required pattern="[a-z0-9_-]+" />
              </Field>
            </div>
            <Field label={t("Description")} htmlFor={`desc-${plan?.id}`}>
              <Input id={`desc-${plan?.id}`} name="description" defaultValue={plan?.description ?? ""} />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label={t("Monthly")} htmlFor={`pm-${plan?.id}`}>
                <Input id={`pm-${plan?.id}`} name="price_monthly" type="number" step="0.01" min="0" defaultValue={plan ? plan.price_monthly_cents / 100 : ""} required />
              </Field>
              <Field label={t("Yearly")} htmlFor={`py-${plan?.id}`}>
                <Input id={`py-${plan?.id}`} name="price_yearly" type="number" step="0.01" min="0" defaultValue={plan ? plan.price_yearly_cents / 100 : ""} />
              </Field>
              <Field label={t("Currency")} htmlFor={`cur-${plan?.id}`}>
                <Input id={`cur-${plan?.id}`} name="currency" maxLength={3} defaultValue={plan?.currency ?? "USD"} />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label={t("Max students")} htmlFor={`ms-${plan?.id}`} hint={t("Empty = unlimited")}>
                <Input id={`ms-${plan?.id}`} name="max_students" type="number" min="1" defaultValue={plan?.max_students ?? ""} />
              </Field>
              <Field label={t("Max staff")} htmlFor={`mf-${plan?.id}`}>
                <Input id={`mf-${plan?.id}`} name="max_staff" type="number" min="1" defaultValue={plan?.max_staff ?? ""} />
              </Field>
              <Field label={t("Storage GB")} htmlFor={`gb-${plan?.id}`}>
                <Input id={`gb-${plan?.id}`} name="storage_gb" type="number" min="1" defaultValue={plan?.storage_gb ?? 5} />
              </Field>
            </div>
            <Field label={t("Benefits (one per line)")} htmlFor={`f-${plan?.id}`}>
              <Textarea id={`f-${plan?.id}`} name="features" rows={4} defaultValue={plan?.features?.join("\n") ?? ""} />
            </Field>
            <div>
              <p className="mb-1.5 text-sm font-medium">{t("Translations")}</p>
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
                  const id = `${l.code}-${plan?.id ?? "new"}`;
                  return (
                    <TabsContent key={l.code} value={l.code} forceMount className="mt-3 space-y-3 data-[state=inactive]:hidden" dir={l.dir} lang={l.code}>
                      <Field label={t("Name")} htmlFor={`tn-${id}`}>
                        <Input id={`tn-${id}`} name={`tr.${l.code}.name`} defaultValue={tr?.name ?? ""} />
                      </Field>
                      <Field label={t("Description")} htmlFor={`td-${id}`}>
                        <Input id={`td-${id}`} name={`tr.${l.code}.description`} defaultValue={tr?.description ?? ""} />
                      </Field>
                      <Field label={t("Benefits (one per line)")} htmlFor={`tf-${id}`}>
                        <Textarea id={`tf-${id}`} name={`tr.${l.code}.features`} rows={4} defaultValue={tr?.features?.join("\n") ?? ""} />
                      </Field>
                    </TabsContent>
                  );
                })}
              </TabsRoot>
              <p className="mt-1.5 text-xs text-ink-muted">{t("Empty fields show the English text.")}</p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox name="is_active" defaultChecked={plan?.is_active ?? true} /> {t("Show on the website")}
            </label>
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={pending}>
                {pending ? t("Saving…") : t("Save")}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                {t("Cancel")}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
