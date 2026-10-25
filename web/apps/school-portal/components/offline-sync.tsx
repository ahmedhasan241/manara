"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Alert, toast, useT } from "@educloud/ui";
import { pushChanges } from "@/app/actions";
import { QUEUE_EVENT, readQueue, removeFromQueue } from "@/lib/offline-queue";

/**
 * Shows connection state and flushes the offline queue whenever we're online.
 */
export function OfflineSync({ offlineMessage }: { offlineMessage: string }) {
  const t = useT();
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, startSync] = useTransition();
  // Set while offline, so coming back online confirms the sync once.
  const wasOffline = useRef(false);

  useEffect(() => {
    const refresh = () => {
      setOnline(navigator.onLine);
      if (!navigator.onLine) wasOffline.current = true;
      setPending(readQueue().length);
    };
    const flush = () => {
      const queue = readQueue();
      if (!navigator.onLine || queue.length === 0) return;
      startSync(async () => {
        try {
          const results = await pushChanges(queue);
          // Every returned change is settled: applied, lost to a newer edit, or
          // rejected by validation (retrying would fail the same way).
          removeFromQueue(results.map((r) => r.id));
          const rejected = results.filter((r) => r.status === "rejected").length;
          const conflicts = results.filter((r) => r.status === "conflict").length;
          if (rejected) toast.error(t("Some offline changes couldn't be saved: {count}. Please check them and try again.", { count: rejected }));
          if (conflicts) toast.warning(t("Some offline changes were older than edits made elsewhere and were skipped: {count}.", { count: conflicts }));
          if (wasOffline.current && results.length > rejected + conflicts) toast.success(t("Back online. Your offline changes are synced."));
          wasOffline.current = false;
        } catch {
          // Still offline or server unavailable: keep the queue and retry later.
        }
      });
    };

    refresh();
    flush();
    const onOnline = () => {
      refresh();
      flush();
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", refresh);
    window.addEventListener(QUEUE_EVENT, () => {
      refresh();
      flush();
    });
    const timer = setInterval(flush, 30_000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", refresh);
      clearInterval(timer);
    };
  }, []);

  if (online && pending === 0) return null;

  return (
    <div className="mb-4" aria-live="polite">
      <Alert tone={online ? "brand" : "warning"}>
        {online ? (syncing ? t("Syncing {count} changes…", { count: pending }) : t("{count} changes waiting to sync.", { count: pending })) : offlineMessage}
      </Alert>
    </div>
  );
}
