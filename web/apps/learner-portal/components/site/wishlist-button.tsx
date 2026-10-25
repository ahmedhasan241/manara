"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { cn, useT } from "@educloud/ui";
import { setWishlisted } from "@/app/site-actions";
import { AuthLink } from "./auth-dialog";
import { useMutation } from "@/components/use-mutation";

/**
 * Heart toggle that saves a course for later. Guests are asked to sign in
 * first (the dialog brings them back here).
 */
export function WishlistButton({ courseId, saved: initial, signedIn, withLabel = false, className }: { courseId: string; saved: boolean; signedIn: boolean; withLabel?: boolean; className?: string }) {
  const t = useT();
  const [saved, setSaved] = useState(initial);
  const { run, pending } = useMutation({ dialog: true });
  const label = saved ? t("Saved to wishlist") : t("Save for later");
  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-full border font-semibold transition active:scale-95",
    withLabel ? "h-11 px-4 text-sm" : "h-11 w-11",
    saved ? "border-brand-500/40 bg-brand-500/10 text-brand-700 dark:text-brand-300" : "border-line bg-surface text-ink-muted hover:text-ink",
    className,
  );
  const icon = <Heart className={cn("h-5 w-5 transition", saved && "fill-current", pending && "animate-pulse")} />;

  if (!signedIn) {
    return (
      <AuthLink mode="login" className={classes}>
        {icon}
        {withLabel ? <span>{t("Save for later")}</span> : <span className="sr-only">{t("Save for later")}</span>}
      </AuthLink>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={withLabel ? undefined : label}
      disabled={pending}
      className={classes}
      onClick={() => {
        const next = !saved;
        setSaved(next);
        // Optimistic: the heart fills at once and goes back if saving fails.
        run(() => setWishlisted(courseId, next), {
          success: next ? t("Saved to your wishlist.") : t("Removed from your wishlist."),
          onError: () => setSaved(!next),
        });
      }}
    >
      {icon}
      {withLabel && <span>{label}</span>}
    </button>
  );
}
