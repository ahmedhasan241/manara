"use client";

import { useEffect, useState } from "react";
import { Clock3, Loader2, NotebookPen, Pencil, Trash2 } from "lucide-react";
import type { LectureNote } from "@educloud/api-client";
import { Button, ConfirmDialog, EmptyState, Textarea, cn, useT } from "@educloud/ui";
import { addNote, deleteNote, updateNote } from "@/app/site-actions";
import { useMutation } from "@/components/use-mutation";

/** "1:05" / "1:02:09" for a position in seconds. */
export function clock(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/**
 * Private notes for this course. New notes are pinned to the current moment of
 * the video; clicking a note's time jumps back to it (switching lecture if needed).
 */
export function NotesPanel({
  initial,
  lectureId,
  lectureTitle,
  currentTime,
  onJump,
  onCountChange,
}: {
  onCountChange?: (count: number) => void;
  initial: LectureNote[];
  lectureId: string | null;
  lectureTitle: string | null;
  currentTime: () => number | null;
  onJump: (lectureId: string, seconds: number | null) => void;
}) {
  const t = useT();
  const [notes, setNotes] = useState(initial);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const { run, pending } = useMutation();
  const [thisLectureOnly, setThisLectureOnly] = useState(false);
  useEffect(() => onCountChange?.(notes.length), [notes.length, onCountChange]);
  const shown = thisLectureOnly ? notes.filter((n) => n.lecture_id === lectureId) : notes;

  function save() {
    if (!lectureId || !draft.trim()) return;
    const at = currentTime();
    run(() => addNote(lectureId, draft.trim(), at), {
      success: at !== null ? t("Note saved at {time}.", { time: clock(Math.floor(at)) }) : t("Note saved."),
      onSuccess: (result) => {
        if (!result.ok) return;
        setNotes((list) => [...list, result.note]);
        setDraft("");
      },
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-surface p-3 sm:p-4">
        <label htmlFor="note-draft" className="mb-1.5 flex items-center justify-between gap-2 text-sm font-medium">
          <span>{t("New note")}</span>
          {lectureTitle && <span className="truncate text-xs font-normal text-ink-muted">{lectureTitle}</span>}
        </label>
        <Textarea
          id="note-draft"
          rows={3}
          value={draft}
          maxLength={2000}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && save()}
          placeholder={t("Write what you want to remember. It's saved at the current moment of the video.")}
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-xs text-ink-muted">{t("Only you can see your notes.")}</p>
          <Button size="sm" onClick={save} disabled={pending || !draft.trim()}>
            {pending ? <Loader2 className="animate-spin" /> : <NotebookPen />} {t("Save note")}
          </Button>
        </div>
      </div>

      {notes.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          {[false, true].map((only) => (
            <button
              key={String(only)}
              type="button"
              onClick={() => setThisLectureOnly(only)}
              aria-pressed={thisLectureOnly === only}
              className={cn("rounded-lg px-3 py-1.5 font-medium transition", thisLectureOnly === only ? "bg-brand-600/10 text-brand-700 dark:text-brand-200" : "text-ink-muted hover:text-ink")}
            >
              {only ? t("This lecture") : t("All notes ({count})", { count: notes.length })}
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <EmptyState icon={<NotebookPen className="h-5 w-5" />} title={t("No notes yet")} description={t("Notes you take here stay with the course, ready for revision.")} />
      ) : (
        <ul className="space-y-2.5">
          {shown.map((note) => (
            <li key={note.id} className="rounded-xl border border-line bg-surface p-3">
              <div className="mb-1.5 flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => onJump(note.lecture_id, note.position_seconds)}
                  className="inline-flex items-center gap-1 rounded-md bg-brand-600/10 px-1.5 py-0.5 font-mono font-medium text-brand-700 hover:bg-brand-600/15 dark:text-brand-200"
                  title={t("Jump to this moment")}
                  dir="ltr"
                >
                  <Clock3 className="h-3 w-3" /> {note.position_seconds !== null ? clock(note.position_seconds) : "—"}
                </button>
                <span className="min-w-0 flex-1 truncate text-ink-muted">{note.lecture?.title}</span>
                <button type="button" onClick={() => { setEditing(note.id); setEditText(note.body); }} className="grid h-7 w-7 place-items-center rounded-md text-ink-muted hover:bg-surface-3 hover:text-ink" aria-label={t("Edit")}>
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <ConfirmDialog
                  title={t("Delete this note?")}
                  confirmLabel={t("Delete")}
                  onConfirm={() =>
                    run(() => deleteNote(note.id), {
                      success: t("Note deleted."),
                      onSuccess: () => setNotes((list) => list.filter((n) => n.id !== note.id)),
                    })
                  }
                >
                  <button type="button" disabled={pending} className="grid h-7 w-7 place-items-center rounded-md text-ink-muted hover:bg-danger/10 hover:text-danger disabled:opacity-60" aria-label={t("Delete")}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </ConfirmDialog>
              </div>
              {editing === note.id ? (
                <div className="space-y-2">
                  <Textarea rows={3} value={editText} maxLength={2000} onChange={(e) => setEditText(e.target.value)} aria-label={t("Edit")} />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>{t("Cancel")}</Button>
                    <Button
                      size="sm"
                      disabled={pending || !editText.trim()}
                      onClick={() =>
                        run(() => updateNote(note.id, editText.trim()), {
                          success: t("Note updated."),
                          onSuccess: (result) => {
                            if (result.ok) setNotes((list) => list.map((n) => (n.id === note.id ? { ...n, body: result.note.body } : n)));
                            setEditing(null);
                          },
                        })
                      }
                    >
                      {pending && <Loader2 className="animate-spin" />} {t("Save")}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-line text-sm leading-relaxed">{note.body}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
