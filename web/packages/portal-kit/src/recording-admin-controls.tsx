"use client";

import { useTransition } from "react";
import { EyeOff, Eye, Trash2 } from "lucide-react";
import type { Recording } from "@educloud/api-client";
import { deleteRecording, setRecordingPublished } from "./actions/lessons";
import { ConfirmDialog, useActionToast, useT } from "@educloud/ui";

export function RecordingAdminControls({ recording }: { recording: Recording }) {
  const t = useT();
  const notify = useActionToast();
  const [pending, start] = useTransition();
  const published = !!recording.published_at;

  return (
    <div className="flex shrink-0 gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => void notify(await setRecordingPublished(recording.id, recording.course_id, !published)))}
        className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-surface-3 hover:text-ink"
        title={published ? t("Hide from students") : t("Show to students")}
        aria-label={published ? t("Hide from students") : t("Show to students")}
      >
        {published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </button>
      <ConfirmDialog title={t("Delete “{title}”?", { title: recording.title })} description={t("Students will no longer be able to watch it.")} confirmLabel={t("Delete")} onConfirm={() => start(async () => void notify(await deleteRecording(recording.id, recording.course_id)))}>
        <button
          type="button"
          disabled={pending}
          className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-danger/10 hover:text-danger"
          title={t("Delete")}
          aria-label={t("Delete recording")}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </ConfirmDialog>
    </div>
  );
}
