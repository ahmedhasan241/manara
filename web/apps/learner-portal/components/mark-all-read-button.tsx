"use client";

import { CheckCheck, Loader2 } from "lucide-react";
import { Button, useT } from "@educloud/ui";
import { markAllRead } from "@/app/actions";
import { useMutation } from "@/components/use-mutation";

export function MarkAllReadButton() {
  const t = useT();
  const { run, pending } = useMutation();
  return (
    <Button variant="secondary" size="sm" disabled={pending} aria-busy={pending || undefined} onClick={() => run(() => markAllRead(), { success: t("All notifications marked as read.") })}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />} {t("Mark all as read")}
    </Button>
  );
}
