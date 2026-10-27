"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CirclePlay, LogIn, Square, XCircle } from "lucide-react";
import type { LiveLesson } from "@educloud/api-client";
import { Button, ConfirmDialog, Countdown, cn, useActionToast, useT } from "@educloud/ui";
import { cancelLesson, endLesson, joinLesson, startLesson } from "./actions/lessons";
import { UpgradeNotice, upgradeCode } from "./upgrade-notice";

/**
 * Join for students; start / end / cancel for the teacher. Meetings open in a new
 * tab so Manara stays open for chat and notes.
 */
export function LessonActions({ lesson, canHost, size = "md", className }: { lesson: LiveLesson; canHost: boolean; size?: "sm" | "md"; className?: string }) {
  const t = useT();
  const router = useRouter();
  const notify = useActionToast();
  const [pending, start] = useTransition();
  // e.g. no video meetings in the package: the reason stays here with a link to add them.
  const [upgrade, setUpgrade] = useState<string | null>(null);

  /** Runs an action with a toast (joining only toasts on failure); `open` picks the meeting URL to open. */
  function run<D>(action: () => Promise<{ ok: true; message?: string; data?: D } | { ok: false; error: string; code?: string }>, open?: (data: D) => string | undefined, quiet = false) {
    // Open the tab synchronously so pop-up blockers allow it, then point it at the meeting.
    const tab = open ? window.open("about:blank", "_blank") : null;
    start(async () => {
      const result = await action();
      setUpgrade(!result.ok && upgradeCode(result) ? result.error : null);
      if (!result.ok) {
        tab?.close();
        notify(result);
        return;
      }
      if (!quiet) notify(result);
      const url = result.data !== undefined ? open?.(result.data) : undefined;
      if (tab && url) {
        tab.opener = null;
        tab.location.href = url;
      } else tab?.close();
      router.refresh();
    });
  }

  const upcoming = lesson.status === "scheduled";
  const live = lesson.status === "live";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {canHost && (upcoming || live) && (
          <>
            <Button
              size={size}
              variant={live ? "live" : "primary"}
              disabled={pending}
              onClick={() => run(() => startLesson(lesson.id), (data) => data.host_url)}
            >
              <CirclePlay className="h-4 w-4" /> {live ? t("Rejoin as host") : t("Start lesson")}
            </Button>
            {live && (
              <ConfirmDialog title={t("End this lesson for everyone? Attendance will be taken.")} confirmLabel={t("End")} onConfirm={() => run(() => endLesson(lesson.id))}>
                <Button size={size} variant="secondary" disabled={pending}>
                  <Square className="h-4 w-4" /> {t("End")}
                </Button>
              </ConfirmDialog>
            )}
            {upcoming && (
              <ConfirmDialog title={t("Cancel this lesson? Students will be notified.")} confirmLabel={t("Cancel lesson")} onConfirm={() => run(() => cancelLesson(lesson.id))}>
                <Button size={size} variant="ghost" disabled={pending}>
                  <XCircle className="h-4 w-4" /> {t("Cancel")}
                </Button>
              </ConfirmDialog>
            )}
          </>
        )}

        {!canHost && (live || upcoming) && (
          lesson.joinable ? (
            <Button size={size} variant={live ? "live" : "primary"} disabled={pending} onClick={() => run(() => joinLesson(lesson.id), (data) => data.join_url, true)}>
              <LogIn className="h-4 w-4" /> {live ? t("Join now") : t("Join waiting room")}
            </Button>
          ) : (
            <span className="rounded-xl bg-surface-3 px-3 py-2 text-sm font-medium text-ink-muted">
              {t("Opens")}{" "}<Countdown to={new Date(new Date(lesson.scheduled_at).getTime() - 10 * 60_000).toISOString()} />
            </span>
          )
        )}
      </div>
      {upgrade && <UpgradeNotice message={upgrade} />}
    </div>
  );
}
