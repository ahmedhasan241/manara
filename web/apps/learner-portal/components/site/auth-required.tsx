"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { Character, buttonClass, cn, useT } from "@educloud/ui";
import { AuthLink, useAuthHref } from "./auth-dialog";

/**
 * Shown instead of a page that needs an account. Opens the sign-in dialog
 * straight away; after signing in, the page reloads with the person's data.
 */
export function AuthRequired({ title, description }: { title: string; description: string }) {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const href = useAuthHref();

  useEffect(() => {
    if (!params.get("auth")) router.replace(href("login", `${pathname}${params.size ? `?${params}` : ""}`), { scroll: false });
    // Only once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
      <div className="w-44">
        <Character variant="reader" tone={2} hair={0} hairStyle="long" backdrop="sky" />
      </div>
      <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-200">
        <Lock className="h-3.5 w-3.5" /> {t("Sign in needed")}
      </p>
      <h1 className="mt-3 font-display text-3xl font-bold">{title}</h1>
      <p className="mt-2 text-ink-muted">{description}</p>
      <div className="mt-6 flex gap-3">
        <AuthLink mode="login" className={cn(buttonClass("primary", "lg"), "!rounded-full")}>
          {t("Login")}
        </AuthLink>
        <AuthLink mode="register" className={cn(buttonClass("secondary", "lg"), "!rounded-full")}>
          {t("Create account")}
        </AuthLink>
      </div>
    </div>
  );
}
