"use client";

import { useTransition } from "react";
import { Copy, Pause, Play, Trash2 } from "lucide-react";
import { Button, ConfirmDialog, Field, FormActions, FormSection, Input, SelectMenu, Tooltip, toast, useActionToast, useT } from "@educloud/ui";
import { ToastForm } from "@educloud/portal-kit/toast-form";
import { deleteCoupon, setCouponActive } from "@/app/builder-actions";
import { createCouponFromPage } from "@/app/(app)/coupons/actions";

/** The new-code form on its own page (/coupons/new); back to the list once it's created. */
export function CouponForm({ courses }: { courses: { id: string; title: string }[] }) {
  const t = useT();
  return (
    <ToastForm action={createCouponFromPage} loading={t("Saving…")} redirectTo="/coupons">
      <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-soft)] sm:p-6">
        <FormSection title={t("Code")} description={t("Letters, numbers, dashes. Learners type it in the cart.")}>
          <Field label={t("Code")} htmlFor="coupon-code">
            <Input id="coupon-code" name="code" required autoFocus minLength={3} maxLength={32} pattern="[A-Za-z0-9_-]+" placeholder="LAUNCH25" className="font-mono uppercase" dir="ltr" />
          </Field>
          <Field label={t("Discount (%)")} htmlFor="coupon-percent">
            <Input id="coupon-percent" name="percent_off" type="number" min={1} max={100} required defaultValue={20} />
          </Field>
          <div className="sm:col-span-2">
            <Field label={t("Course")} htmlFor="coupon-course">
              <SelectMenu id="coupon-course" name="course_id" defaultValue="all" options={[{ value: "all", label: t("All online courses") }, ...courses.map((c) => ({ value: c.id, label: c.title }))]} />
            </Field>
          </div>
        </FormSection>
        <FormSection title={t("Max uses")}>
          <Field label={t("Max uses")} htmlFor="coupon-max" hint={t("Empty = unlimited")}>
            <Input id="coupon-max" name="max_uses" type="number" min={1} />
          </Field>
          <Field label={t("Ends on")} htmlFor="coupon-ends">
            <Input id="coupon-ends" name="expires_at" type="date" />
          </Field>
        </FormSection>
      </div>
      <FormActions cancel={{ href: "/coupons", label: t("Cancel") }}>
        <Button type="submit">{t("Create code")}</Button>
      </FormActions>
    </ToastForm>
  );
}

export function CouponRowActions({ id, code, active }: { id: number; code: string; active: boolean }) {
  const t = useT();
  const notify = useActionToast();
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-1">
      <Tooltip label={t("Copy code")}>
        <Button
          size="icon"
          variant="ghost"
          aria-label={t("Copy code")}
          onClick={() => navigator.clipboard.writeText(code).then(() => toast.success(t("Copied {code}", { code })))}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </Tooltip>
      <Tooltip label={active ? t("Pause") : t("Resume")}>
        <Button size="icon" variant="ghost" disabled={pending} aria-label={active ? t("Pause") : t("Resume")} onClick={() => start(async () => void notify(await setCouponActive(id, !active)))}>
          {active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
      </Tooltip>
      <ConfirmDialog title={t("Delete the code {code}?", { code })} description={t("Learners can no longer use it. Past orders keep their discount.")} confirmLabel={t("Delete")} onConfirm={() => start(async () => void notify(await deleteCoupon(id)))}>
        <Button size="icon" variant="ghost" disabled={pending} aria-label={t("Delete")}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </ConfirmDialog>
    </div>
  );
}
