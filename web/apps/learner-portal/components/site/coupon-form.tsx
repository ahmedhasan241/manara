"use client";

import { useState } from "react";
import { Loader2, TicketPercent, Trash2, X } from "lucide-react";
import { Button, Input, useT } from "@educloud/ui";
import { applyCoupon, removeCoupon, removeFromCart } from "@/app/site-actions";
import { useMutation } from "@/components/use-mutation";

/** "Have a code?" field in the cart, or the applied code with a remove button. */
export function CouponForm({ applied }: { applied: { code: string; percent: number } | null }) {
  const t = useT();
  const { run, pending } = useMutation();
  const [error, setError] = useState<string | null>(null);

  if (applied) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-brand-500/50 bg-brand-600/5 px-3 py-2 text-sm">
        <span className="inline-flex min-w-0 items-center gap-2 font-medium text-brand-700 dark:text-brand-200">
          <TicketPercent className="h-4 w-4 shrink-0" />
          <span className="truncate font-mono" dir="ltr">{applied.code}</span> · {t("{percent}% off", { percent: applied.percent })}
        </span>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => removeCoupon(), { success: t("Discount code removed.") })}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-ink-muted hover:bg-surface-3 hover:text-ink disabled:opacity-60"
          aria-label={t("Remove code")}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const code = String(new FormData(e.currentTarget).get("code") ?? "");
        setError(null);
        // The error stays under the field; success gets a toast ("Code X applied: 20% off.").
        run(() => applyCoupon(code), { quietError: true, onError: (result) => setError(result.error ?? null) });
      }}
      className="space-y-1.5"
    >
      <label htmlFor="coupon-code" className="text-sm font-medium">
        {t("Have a discount code?")}
      </label>
      <div className="flex gap-2">
        <Input
          id="coupon-code"
          name="code"
          placeholder={t("Enter code")}
          autoComplete="off"
          className="font-mono uppercase"
          dir="ltr"
          maxLength={32}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? "coupon-error" : undefined}
          onChange={() => error && setError(null)}
        />
        <Button type="submit" variant="secondary" disabled={pending} aria-busy={pending || undefined}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} {t("Apply")}
        </Button>
      </div>
      {error && (
        <p id="coupon-error" role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </form>
  );
}

/** "Remove" under a course in the cart. */
export function RemoveFromCartButton({ courseId, title }: { courseId: string; title: string }) {
  const t = useT();
  const { run, pending } = useMutation();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => run(() => removeFromCart(courseId), { success: t("“{title}” removed from your cart.", { title }) })}
      className="inline-flex items-center gap-1 text-xs font-semibold text-danger hover:underline disabled:opacity-60"
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} {t("Remove")}
    </button>
  );
}
