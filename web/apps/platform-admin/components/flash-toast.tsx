"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "@educloud/ui";

/**
 * Shows a one-off toast handed over by a redirect (e.g. `/login?signed_out=1`),
 * then drops the query so a reload doesn't show it again.
 */
export function FlashToast({ message, tone = "success" }: { message: string; tone?: "success" | "info" | "error" }) {
  const router = useRouter();
  const pathname = usePathname();
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    toast[tone](message);
    router.replace(pathname);
  }, [message, tone, router, pathname]);

  return null;
}
