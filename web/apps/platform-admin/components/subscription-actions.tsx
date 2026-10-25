"use client";

import { useTransition } from "react";
import type { PlatformSubscription } from "@educloud/api-client";
import { Button, ConfirmDialog, useActionToast, useT } from "@educloud/ui";
import { updateSubscription } from "@/app/actions";

export function SubscriptionActions({ subscription }: { subscription: PlatformSubscription }) {
  const t = useT();
  const notify = useActionToast();
  const [pending, start] = useTransition();
  const run = (data: Parameters<typeof updateSubscription>[1]) =>
    start(async () => void notify(await updateSubscription(subscription.id, data)));

  const base = subscription.trial_ends_at && new Date(subscription.trial_ends_at) > new Date() ? new Date(subscription.trial_ends_at) : new Date();
  const plus14 = new Date(base.getTime() + 14 * 86_400_000).toISOString();

  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {subscription.status === "trialing" && (
        <Button size="sm" variant="soft" disabled={pending} onClick={() => run({ trial_ends_at: plus14 })}>
          {t("+14 days trial")}
        </Button>
      )}
      {subscription.status !== "active" && (
        <ConfirmDialog title={t("Mark this subscription as active (paid)?")} confirmLabel={t("Activate")} tone="primary" onConfirm={() => run({ status: "active" })}>
          <Button size="sm" variant="secondary" disabled={pending}>
            {t("Activate")}
          </Button>
        </ConfirmDialog>
      )}
      {subscription.status !== "canceled" && (
        <ConfirmDialog title={t("Cancel {name}'s subscription?", { name: subscription.tenant.name })} confirmLabel={t("Cancel subscription")} onConfirm={() => run({ status: "canceled" })}>
          <Button size="sm" variant="ghost" disabled={pending}>
            {t("Cancel")}
          </Button>
        </ConfirmDialog>
      )}
    </div>
  );
}
