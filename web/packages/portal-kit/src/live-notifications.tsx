"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getEcho } from "./echo";

interface LiveNotification {
  id: string;
  title: string;
  body: string;
  category?: string;
  priority?: string;
}

/**
 * Listens on the user's private channel and shows a toast for new grades,
 * announcements and system alerts as they happen, then refreshes server data.
 */
export function LiveNotifications({ userId }: { userId: number }) {
  const router = useRouter();
  const [toasts, setToasts] = useState<LiveNotification[]>([]);

  useEffect(() => {
    const channel = getEcho()?.private(`users.${userId}`);
    channel?.notification((n: LiveNotification) => {
      setToasts((t) => [...t.slice(-2), n]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== n.id)), 8000);
      router.refresh();
    });
    return () => {
      channel?.stopListening(".Illuminate\\Notifications\\Events\\BroadcastNotificationCreated");
    };
  }, [router, userId]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 end-4 z-50 w-80 max-w-[calc(100vw-2rem)] space-y-2" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-xl border bg-surface p-4 shadow-[var(--shadow-soft)] ${toast.priority === "urgent" || toast.category === "system" ? "border-danger" : "border-line"}`}
        >
          <p className="text-sm font-semibold">{toast.title}</p>
          <p className="mt-1 text-sm text-ink-muted">{toast.body}</p>
        </div>
      ))}
    </div>
  );
}
