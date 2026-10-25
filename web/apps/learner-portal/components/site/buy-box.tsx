"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Check, Loader2, PlayCircle, ShoppingCart, Zap } from "lucide-react";
import type { Playback } from "@educloud/api-client";
import { Button, Dialog, DialogContent, DialogTitle, buttonClass, cn, useT } from "@educloud/ui";
import { addToCart, checkout, enrollFree, previewLecture } from "@/app/site-actions";
import { useAuthHref } from "./auth-dialog";
import { useMutation } from "@/components/use-mutation";
import { LectureMedia } from "./lecture-media";

/**
 * The purchase buttons on a course page: Go to course (owned), Enroll for
 * free, or Add to cart / Buy now. Anything needing an account opens the
 * sign-in dialog first and comes back here.
 */
export function BuyBox({ course, owned, signedIn, inCart, compact = false }: { course: { id: string; slug: string; price_cents: number }; owned: boolean; signedIn: boolean; inCart: boolean; compact?: boolean }) {
  const t = useT();
  const router = useRouter();
  const authHref = useAuthHref();
  const { run, pending } = useMutation({ dialog: true });
  const [added, setAdded] = useState(inCart);
  const spinner = <Loader2 className="h-5 w-5 animate-spin" />;

  if (owned) {
    return (
      <Link href={`/learn/${course.slug}`} className={cn(buttonClass("primary", "lg"), "w-full !rounded-full")}>
        <PlayCircle className="h-5 w-5" /> {t("Go to course")}
      </Link>
    );
  }

  return (
    <div className="space-y-3">
      {course.price_cents === 0 ? (
        <Button size="lg" className="w-full !rounded-full" disabled={pending} onClick={() => (signedIn ? run(() => enrollFree(course.slug), { loading: t("Enrolling…"), redirected: t("You're enrolled. Enjoy the course!") }) : router.push(authHref("register"), { scroll: false }))}>
          {pending ? spinner : <Zap className="h-5 w-5" />} {pending ? t("Enrolling…") : t("Enroll for free")}
        </Button>
      ) : (
        <>
          <Button size="lg" className="w-full !rounded-full" disabled={pending} onClick={() =>
              signedIn
                ? run(() => checkout([course.id]), {
                    loading: t("Preparing your order…"),
                    redirected: (target) => (target.startsWith("/checkout") ? t("Order created. Complete your payment.") : t("Added to your learning. Enjoy!")),
                  })
                : router.push(authHref("login"), { scroll: false })
            }
          >
            {pending ? spinner : <Zap className="h-5 w-5" />} {pending ? t("One moment…") : t("Buy now")}
          </Button>
          {compact ? null : added ? (
            <Link href="/cart" className={cn(buttonClass("secondary", "lg"), "w-full !rounded-full")}>
              <Check className="h-5 w-5 text-success" /> {t("In your cart, view cart")}
            </Link>
          ) : (
            <Button
              variant="secondary"
              size="lg"
              className="w-full !rounded-full"
              disabled={pending}
              onClick={() => run(() => addToCart(course.id), { success: t("Added to cart."), onSuccess: () => setAdded(true) })}
            >
              {pending ? spinner : <ShoppingCart className="h-5 w-5" />} {t("Add to cart")}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Phones: once the purchase card scrolls away, a bar with the price and the
 * main button stays at the bottom of the screen.
 */
export function MobileBuyBar({ price, ...props }: { course: { id: string; slug: string; price_cents: number }; owned: boolean; signedIn: boolean; price: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const card = document.getElementById("buy-card");
    if (!card) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry!.isIntersecting), { threshold: 0 });
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          data-bottom-bar
          className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_30px_-18px_rgb(15_27_51_/_0.35)] backdrop-blur-xl lg:hidden"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 380, damping: 34 }}
        >
          <div className="mx-auto flex max-w-lg items-center gap-4">
            <p className="shrink-0 font-display text-xl font-bold text-heading">{props.owned ? "" : price}</p>
            <div className="min-w-0 flex-1">
              <BuyBox {...props} inCart={false} compact />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** A free lecture someone can watch without an account. */
export interface PreviewItem {
  id: string;
  title: string;
  duration?: string;
}

/**
 * "Preview" on a free lecture: plays it in a dialog, no account needed. When
 * the course has other free lectures, they're listed beside the player so
 * visitors can hop between them without closing it.
 */
export function PreviewButton({ lectureId, title, previews = [], className, children }: { lectureId: string; title: string; previews?: PreviewItem[]; className?: string; children?: React.ReactNode }) {
  const t = useT();
  const [playback, setPlayback] = useState<Playback | null>(null);
  const [current, setCurrent] = useState({ id: lectureId, title });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function load(item: { id: string; title: string }) {
    setError(null);
    start(async () => {
      const result = await previewLecture(item.id);
      if ("error" in result) setError(result.error);
      else {
        setCurrent(item);
        setPlayback(result);
      }
    });
  }

  const others = previews.length > 1 ? previews : [];

  return (
    <>
      <button type="button" onClick={() => load({ id: lectureId, title })} disabled={pending && !playback} className={className ?? "inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100 dark:bg-brand-900/40 dark:text-brand-200"}>
        {children ?? (
          <>
            <PlayCircle className="h-3.5 w-3.5" /> {pending && !playback ? t("Loading…") : t("Preview")}
          </>
        )}
      </button>
      {error && !playback && <span className="text-xs text-danger">{error}</span>}
      <Dialog open={!!playback} onOpenChange={(open) => !open && setPlayback(null)}>
        <DialogContent
          className={cn("border-0 bg-nav p-3 text-white sm:p-4 [&>button:last-child]:text-white/80 [&>button:last-child]:hover:bg-white/10", others.length ? "sm:w-[min(72rem,calc(100vw-2rem))]" : "sm:w-[min(56rem,calc(100vw-2rem))]")}
          aria-describedby={undefined}
        >
          <DialogTitle className="mb-3 truncate pe-10 text-base text-white">
            <span className="me-2 rounded-md bg-brand-400 px-2 py-0.5 text-xs font-semibold text-nav">{t("Free preview")}</span>
            {current.title}
          </DialogTitle>
          <div className={cn("grid gap-4", others.length && "lg:grid-cols-[minmax(0,1fr)_17rem]")}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={current.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                {playback && <LectureMedia playback={playback} autoPlay />}
              </motion.div>
            </AnimatePresence>
            {others.length > 0 && (
              <div className="min-w-0">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/60">{t("More free previews")}</p>
                <ol className="max-h-[50vh] space-y-1.5 overflow-y-auto pe-1" data-lenis-prevent>
                  {others.map((item, i) => {
                    const active = item.id === current.id;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => !active && load(item)}
                          aria-current={active || undefined}
                          className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm transition-colors", active ? "bg-brand-400 text-nav" : "bg-white/5 text-white/85 hover:bg-white/10")}
                        >
                          <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold", active ? "bg-nav text-brand-300" : "bg-white/10")}>
                            {active ? <PlayCircle className="h-4 w-4" /> : i + 1}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{item.title}</span>
                          {item.duration && <span className="shrink-0 text-xs tabular-nums opacity-70">{item.duration}</span>}
                        </button>
                      </li>
                    );
                  })}
                </ol>
                {pending && <p className="mt-2 text-xs text-white/60">{t("Loading…")}</p>}
                {error && <p className="mt-2 text-xs text-danger">{error}</p>}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
