"use client";

import { useCallback, useTransition } from "react";
import { Loader2, LogOut } from "lucide-react";
import { cn, toast, useT } from "@educloud/ui";
import { siteLogout } from "@/app/site-actions";
import { isRedirectError } from "./use-mutation";

/**
 * Signs out with a loading toast that becomes "Signed out." The sign-out
 * action redirects to the home page; the toaster lives in the root layout, so
 * the toast stays on screen there.
 */
export function useSignOut() {
  const t = useT();
  const [pending, start] = useTransition();

  const signOut = useCallback(() => {
    start(async () => {
      const id = toast.loading(t("Signing out…"));
      try {
        await siteLogout();
        toast.success(t("Signed out."), { id });
      } catch (error) {
        if (isRedirectError(error)) {
          toast.success(t("Signed out."), { id, description: t("See you soon!") });
          throw error;
        }
        toast.error(t("We couldn't sign you out. Please try again."), { id });
      }
    });
  }, [t]);

  return { signOut, pending };
}

/** A "Sign out" button for menus and page headers. */
export function SignOutButton({ className, children, iconClassName = "h-4 w-4" }: { className?: string; children?: React.ReactNode; iconClassName?: string }) {
  const t = useT();
  const { signOut, pending } = useSignOut();
  return (
    <button type="button" onClick={signOut} disabled={pending} aria-busy={pending || undefined} className={cn("disabled:opacity-70", className)}>
      {pending ? <Loader2 className={cn(iconClassName, "animate-spin")} /> : <LogOut className={iconClassName} />} {children ?? t("Sign out")}
    </button>
  );
}
