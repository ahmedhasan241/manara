"use client";

import { Loader2, LogOut } from "lucide-react";
import { Button, ConfirmDialog, useT } from "@educloud/ui";
import { revokeDevice } from "@/app/actions";
import { useMutation } from "@/components/use-mutation";

/** Signs one other device out, after asking. */
export function RevokeDeviceButton({ id, name }: { id: number; name: string }) {
  const t = useT();
  const { run, pending } = useMutation();
  return (
    <ConfirmDialog
      title={t("Sign out “{name}”?", { name })}
      description={t("That device will need your password to sign in again.")}
      confirmLabel={t("Sign out")}
      onConfirm={() => run(() => revokeDevice(id), { success: t("Signed out on “{name}”.", { name }) })}
    >
      <Button size="sm" variant="ghost" type="button" disabled={pending} aria-busy={pending || undefined}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} {t("Sign out")}
      </Button>
    </ConfirmDialog>
  );
}
