"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { Button, Card, Field, Input, Select, cn, useStateToast, useT } from "@educloud/ui";
import { uploadRecording, type FormState } from "./actions/lessons";

/**
 * Upload a recording (video file) or link one. Used for Jitsi lessons, lectures
 * recorded elsewhere, or anything else worth keeping on the course page.
 */
export function RecordingUploadForm({ courseId, lessons, defaultLessonId }: { courseId: string; lessons: { id: string; title: string }[]; defaultLessonId?: string }) {
  const t = useT();
  const [state, action, pending] = useActionState<FormState, FormData>(uploadRecording.bind(null, courseId), {});
  const [mode, setMode] = useState<"file" | "link">("file");
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  useStateToast(state);

  useEffect(() => {
    if (state.ok) {
      form.current?.reset();
      setFileName(null);
    }
  }, [state]);

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold">{t("Add a recording")}</h2>
        <div className="inline-flex rounded-xl bg-surface-3 p-1 text-sm font-semibold" role="radiogroup" aria-label={t("Recording source")}>
          {(["file", "link"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={cn("rounded-lg px-3 py-1.5 transition", mode === m ? "bg-surface text-ink shadow" : "text-ink-muted")}
            >
              {m === "file" ? t("Upload video") : t("Paste a link")}
            </button>
          ))}
        </div>
      </div>

      <form ref={form} action={action} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("Title")} htmlFor="rec-title">
            <Input id="rec-title" name="title" required placeholder={t("Lecture 5 — recording")} />
          </Field>
          <Field label={t("Lesson (optional)")} htmlFor="rec-lesson">
            <Select id="rec-lesson" name="live_lesson_id" defaultValue={defaultLessonId ?? ""}>
              <option value="">{t("Not linked to a lesson")}</option>
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {mode === "file" ? (
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={() => setDragging(false)}
            className={cn(
              "relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition",
              dragging ? "border-brand-500 bg-brand-500/5" : "border-line hover:border-brand-300 hover:bg-surface-3/40",
            )}
          >
            <UploadCloud className={cn("h-8 w-8 text-brand-500 transition-transform", dragging && "scale-110")} />
            <span className="font-semibold">{fileName ?? t("Drop a video here or click to choose")}</span>
            <span className="text-xs text-ink-muted">{t("MP4, WebM, MOV or audio · up to 2 GB")}</span>
            <input
              type="file"
              name="file"
              accept="video/mp4,video/webm,video/quicktime,audio/mpeg,audio/mp4"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
          </label>
        ) : (
          <Field label={t("Link")} htmlFor="rec-url" hint={t("YouTube, Vimeo, Google Drive, or any https link students can open.")}>
            <Input id="rec-url" name="url" type="url" placeholder="https://" />
          </Field>
        )}

        <Button type="submit" disabled={pending}>
          {pending ? t("Uploading…") : t("Add recording")}
        </Button>
      </form>
    </Card>
  );
}
