"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, FlaskConical, Loader2, Lock } from "lucide-react";
import { Alert, Button, ConfirmDialog, Field, Input, cn, useT } from "@educloud/ui";
import { cancelOrder, checkout, payOrder } from "@/app/site-actions";
import { useMutation } from "@/components/use-mutation";
import { useAuthHref } from "./auth-dialog";

/** "Checkout" in the cart: signs in first if needed, then creates the order. */
export function CheckoutButton({ signedIn }: { signedIn: boolean }) {
  const t = useT();
  const router = useRouter();
  const authHref = useAuthHref();
  const { run, pending } = useMutation({ dialog: true });

  return (
    <Button
      size="lg"
      className="w-full !rounded-full"
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={() => {
        if (!signedIn) return router.push(authHref("login"), { scroll: false });
        run(() => checkout(), {
          loading: t("Preparing your order…"),
          redirected: (target) => (target.startsWith("/checkout") ? t("Order created. Complete your payment.") : t("Added to your learning. Enjoy!")),
        });
      }}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} {pending ? t("Preparing…") : t("Checkout")}
    </Button>
  );
}

const BRANDS = ["Visa", "Mastercard", "Amex", "PayPal"] as const;

/**
 * The payment step, laid out like the Campus checkout. Card details are only
 * checked here in the browser and never sent anywhere: payments run in test
 * mode until a payment provider is connected.
 */
export function PaymentForm({ orderId, total }: { orderId: string; total: string }) {
  const t = useT();
  const [brand, setBrand] = useState<(typeof BRANDS)[number]>("Visa");
  const [error, setError] = useState<string | null>(null);
  const { run, pending } = useMutation();

  function submit(form: FormData) {
    const number = String(form.get("number") ?? "").replace(/\s/g, "");
    const expiry = String(form.get("expiry") ?? "");
    if (brand !== "PayPal" && (!/^\d{12,19}$/.test(number) || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry))) {
      setError(t("Check the card number and expiry date (MM/YY)."));
      return;
    }
    setError(null);
    run(() => payOrder(orderId), {
      loading: t("Confirming your payment…"),
      redirected: t("Payment complete. Your courses are ready!"),
      quietError: true,
      onError: (result) => setError(result.error ?? null),
    });
  }

  return (
    <form action={submit} className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl bg-peach px-4 py-3 text-sm text-brand-700 dark:text-brand-300">
        <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <strong>{t("Test mode.")}</strong> {t("No real payment is taken and card details never leave this page. Use any test card, e.g. 4242 4242 4242 4242.")}
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">{t("Payment method")}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {BRANDS.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBrand(b)}
              aria-pressed={brand === b}
              className={cn("h-12 rounded-xl border text-sm font-bold transition", brand === b ? "border-brand-500 bg-brand-500/10 text-brand-700 ring-4 ring-brand-500/15 dark:border-brand-400 dark:text-brand-200" : "border-line bg-surface text-ink-muted hover:text-ink")}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {brand !== "PayPal" ? (
        <>
          <Field label={t("Name on card")} htmlFor="card-name">
            <Input id="card-name" name="name" autoComplete="off" placeholder={t("Enter name on card")} className="h-12" />
          </Field>
          <Field label={t("Card number")} htmlFor="card-number">
            <div className="relative">
              <CreditCard className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <Input id="card-number" name="number" inputMode="numeric" autoComplete="off" placeholder="4242 4242 4242 4242" className="h-12 ps-11" />
            </div>
          </Field>
          <div className="grid grid-cols-2 items-end gap-4">
            <Field label={t("Expiry (MM/YY)")} htmlFor="card-expiry">
              <Input id="card-expiry" name="expiry" autoComplete="off" placeholder="12/29" className="h-12" />
            </Field>
            <Field label={t("CVC")} htmlFor="card-cvc">
              <Input id="card-cvc" name="cvc" inputMode="numeric" autoComplete="off" placeholder="123" maxLength={4} className="h-12" />
            </Field>
          </div>
        </>
      ) : (
        <p className="rounded-2xl bg-sky px-4 py-3 text-sm text-ink-muted">{t("In test mode, PayPal confirms straight away.")}</p>
      )}

      {error && <Alert>{error}</Alert>}
      <Button type="submit" size="lg" className="w-full !rounded-full" disabled={pending} aria-busy={pending || undefined}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} {pending ? t("Confirming…") : t("Confirm payment · {total}", { total })}
      </Button>
    </form>
  );
}

/** "Cancel this order" on the checkout page, with a confirmation first. */
export function CancelOrderButton({ orderId }: { orderId: string }) {
  const t = useT();
  const { run, pending } = useMutation();
  return (
    <ConfirmDialog
      title={t("Cancel this order?")}
      description={t("The courses go back to the shop. You can buy them again any time.")}
      confirmLabel={t("Cancel order")}
      onConfirm={() => run(() => cancelOrder(orderId), { loading: t("Cancelling…"), redirected: t("Order cancelled.") })}
    >
      <button type="button" disabled={pending} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-danger disabled:opacity-60">
        {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {t("Cancel this order")}
      </button>
    </ConfirmDialog>
  );
}
