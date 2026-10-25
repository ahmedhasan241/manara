"use client";

import { useFormStatus } from "react-dom";
import { LogOut } from "lucide-react";
import { cn, useT } from "@educloud/ui";
import { logout } from "@/app/actions";

/**
 * Sign out (account menu, sidebar footer or settings). The login page then
 * confirms with a "You've been signed out." toast.
 */
export function SignOutButton({ variant = "menu", className }: { variant?: "menu" | "icon" | "button"; className?: string }) {
  return (
    <form action={logout} className={className}>
      <Submit variant={variant} />
    </form>
  );
}

function Submit({ variant }: { variant: "menu" | "icon" | "button" }) {
  const t = useT();
  const { pending } = useFormStatus();
  const label = pending ? t("Signing out…") : t("Sign out");
  const icon = pending ? <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" /> : <LogOut className="h-4 w-4" />;

  if (variant === "icon") {
    return (
      <button type="submit" disabled={pending} className="grid h-9 w-9 place-items-center rounded-xl text-ink-muted transition hover:bg-danger/10 hover:text-danger disabled:opacity-60" aria-label={label} title={label}>
        {icon}
      </button>
    );
  }
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className={cn(
        "flex items-center gap-3 text-sm text-danger transition hover:bg-danger/10 disabled:opacity-60",
        variant === "menu" ? "w-full rounded-xl px-3 py-2.5" : "h-9 rounded-xl border border-line px-3 font-medium",
      )}
    >
      {icon} {label}
    </button>
  );
}
