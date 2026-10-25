import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { Character, CourseCover, FadeIn, Stars, buttonClass, cn } from "@educloud/ui";
import { CheckoutButton } from "@/components/site/checkout-form";
import { getCartCoupon, getViewer } from "@/lib/viewer";
import { CouponForm, RemoveFromCartButton } from "@/components/site/coupon-form";
import { getFormat, getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Cart") };
}

export default async function CartPage() {
  const fmt = await getFormat();
  const t = await getT();
  const { api, me, cart } = await getViewer();
  // The cart holds at most 20 ids; one catalog page covers them.
  const catalog = cart.length ? (await api.catalogCourses({ per_page: 48 })).data : [];
  const unique = catalog.filter((c) => cart.includes(c.id));
  const currency = unique[0]?.currency ?? "USD";
  // A code applied earlier: re-checked on every visit (it may have run out).
  const code = unique.length ? await getCartCoupon() : null;
  const coupon = code ? await api.checkCoupon(code, unique.map((c) => c.id)).catch(() => null) : null;
  const priceOf = (c: (typeof unique)[number]) => coupon?.prices[c.id] ?? c.price_cents;
  const subtotal = unique.reduce((s, c) => s + c.price_cents, 0);
  const total = unique.reduce((s, c) => s + priceOf(c), 0);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-bold">{t("Shopping cart")}</h1>
      <p className="mt-1 text-ink-muted">
        {t("{count} courses in cart", { count: unique.length })}
      </p>

      {unique.length === 0 ? (
        <FadeIn className="mt-8 flex flex-col items-center rounded-[2rem] bg-surface px-6 py-14 text-center shadow-[var(--shadow-soft)]">
          <div className="w-40">
            <Character variant="reader" tone={0} hair={4} hairStyle="long" backdrop="peach" />
          </div>
          <p className="mt-6 font-display text-xl font-bold">{t("Your cart is empty")}</p>
          <p className="mt-1 text-ink-muted">{t("Keep exploring to find a course you'll love.")}</p>
          <Link href="/explore" className={cn(buttonClass("primary", "lg"), "mt-6 !rounded-full")}>
            <ShoppingCart className="h-5 w-5" /> {t("Explore courses")}
          </Link>
        </FadeIn>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <ul className="space-y-4">
            {unique.map((c) => (
              <li key={c.id} className="flex flex-wrap gap-3 rounded-[1.25rem] border border-line bg-surface p-3 shadow-[var(--shadow-soft)] sm:flex-nowrap sm:gap-4">
                <CourseCover seed={c.title} category={c.category} size="sm" className="h-20 w-24 shrink-0 rounded-xl sm:h-24 sm:w-40" />
                <div className="min-w-0 flex-1">
                  <Link href={`/course/${c.slug}`} className="line-clamp-2 font-semibold text-heading hover:underline">
                    {c.title}
                  </Link>
                  <p className="text-xs text-ink-muted">{c.instructor?.name ?? c.organization?.name}</p>
                  {c.rating !== null && (
                    <p className="mt-1 flex items-center gap-1 text-xs">
                      <span className="font-semibold">{c.rating.toFixed(1)}</span> <Stars value={c.rating} /> <span className="text-ink-muted">({c.reviews_count})</span>
                    </p>
                  )}
                  <div className="mt-2">
                    <RemoveFromCartButton courseId={c.id} title={c.title} />
                  </div>
                </div>
                <div className="w-full shrink-0 text-end sm:w-auto">
                  <p className="font-display text-lg font-bold text-brand-600 dark:text-brand-300">{c.price_cents ? (priceOf(c) === 0 ? t("Free") : fmt.money(priceOf(c), c.currency)) : t("Free")}</p>
                  {priceOf(c) !== c.price_cents && <p className="text-xs text-ink-muted line-through">{fmt.money(c.price_cents, c.currency)}</p>}
                </div>
              </li>
            ))}
          </ul>
          <aside className="h-fit rounded-[1.5rem] border border-line bg-surface p-6 shadow-[var(--shadow-soft)] lg:sticky lg:top-24">
            {coupon && (
              <dl className="mb-3 space-y-1 border-b border-line pb-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-muted">{t("Subtotal")}</dt>
                  <dd>{fmt.money(subtotal, currency)}</dd>
                </div>
                <div className="flex justify-between text-success">
                  <dt>{t("Discount")}</dt>
                  <dd>−{fmt.money(subtotal - total, currency)}</dd>
                </div>
              </dl>
            )}
            <p className="text-sm font-semibold text-ink-muted">{t("Total")}</p>
            <p className="font-display text-3xl font-bold text-heading">{fmt.money(total, currency)}</p>
            <div className="mt-5">
              <CouponForm applied={coupon ? { code: coupon.code, percent: coupon.percent_off } : null} />
            </div>
            <div className="mt-5">
              <CheckoutButton signedIn={!!me} />
            </div>
            <p className="mt-4 text-center text-xs text-ink-muted">{t("Free courses in your cart are added to your learning straight away.")}</p>
          </aside>
        </div>
      )}
    </div>
  );
}
