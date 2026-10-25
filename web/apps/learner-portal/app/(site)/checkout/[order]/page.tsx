import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ApiError } from "@educloud/api-client";
import { CourseCover, FadeIn } from "@educloud/ui";
import { AuthRequired } from "@/components/site/auth-required";
import { CancelOrderButton, PaymentForm } from "@/components/site/checkout-form";
import { getViewer } from "@/lib/viewer";
import { getFormat, getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Checkout") };
}

export default async function CheckoutPage({ params }: { params: Promise<{ order: string }> }) {
  const fmt = await getFormat();
  const t = await getT();
  const { order: id } = await params;
  const { api, me } = await getViewer();
  if (!me) return <AuthRequired title={t("Sign in to check out")} description={t("Your purchases are linked to your account so you can learn on any device.")} />;

  const order = await api.order(id).catch((error) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });
  if (order.status === "paid") redirect(`/my-learning?purchased=${order.id}`);
  if (order.status !== "pending") redirect("/cart");
  const total = fmt.money(order.total_cents, order.currency);
  const charged = fmt.exactMoney(order.total_cents, order.currency);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <FadeIn className="rounded-[1.75rem] border border-line bg-surface p-6 shadow-[var(--shadow-soft)] sm:p-8">
          <h1 className="mb-6 font-display text-2xl font-bold">{t("Checkout")}</h1>
          <PaymentForm orderId={order.id} total={charged} />
        </FadeIn>

        <FadeIn delay={0.05} className="order-first h-fit rounded-[1.75rem] bg-sky/80 p-6 sm:p-8 lg:order-none">
          <h2 className="font-display text-lg font-bold">{t("Summary")}</h2>
          <ul className="mt-4 space-y-3">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 rounded-2xl bg-surface p-2.5">
                <CourseCover seed={item.title} size="sm" className="h-14 w-20 shrink-0 rounded-xl" />
                <span className="min-w-0 flex-1 text-sm font-semibold">{item.title}</span>
                <span className="shrink-0 text-sm font-bold text-brand-600 dark:text-brand-300">{fmt.money(item.price_cents, order.currency)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-6 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-muted">{t("Subtotal")}</dt>
              <dd>{fmt.money(order.subtotal_cents, order.currency)}</dd>
            </div>
            {(order.discount_cents ?? 0) > 0 && (
              <div className="flex justify-between text-success">
                <dt>
                  {t("Discount")} <span className="font-mono text-xs" dir="ltr">{order.coupon_code}</span>
                </dt>
                <dd>−{fmt.money(order.discount_cents ?? 0, order.currency)}</dd>
              </div>
            )}
            <div className="flex justify-between text-base font-bold">
              <dt>{t("Total")}</dt>
              <dd>{total}</dd>
            </div>
          </dl>
          {total !== charged && <p className="mt-2 text-xs text-ink-muted">{t("Prices are shown in your currency. You'll be charged {amount}.", { amount: charged })}</p>}
          <p className="mt-4 text-xs text-ink-muted">{t("Order")}{" "}{order.number}</p>
          <div className="mt-4">
            <CancelOrderButton orderId={order.id} />
          </div>
          <Link href="/explore" className="mt-2 block text-sm font-semibold text-brand-600 hover:underline dark:text-brand-300">
            {t("Keep shopping")}
          </Link>
        </FadeIn>
      </div>
    </div>
  );
}
