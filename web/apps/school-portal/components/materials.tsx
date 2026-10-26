"use client";

import { useState } from "react";
import { ExternalLink, File, FileArchive, FileImage, FileSpreadsheet, FileText, FileVideo, Link2, Presentation, Trash2, UploadCloud, type LucideIcon } from "lucide-react";
import type { Material } from "@educloud/api-client";
import { Button, Card, Field, Input, buttonClass, cn, useFormat, useT } from "@educloud/ui";
import { ToastButton } from "@educloud/portal-kit/toast-button";
import { ToastForm } from "@educloud/portal-kit/toast-form";
import { deleteMaterial, uploadMaterial } from "@/app/actions";

/** "Week 3 – worksheet.pdf" → "Week 3 – worksheet". */
function titleFromFile(name: string) {
  return name.replace(/\.[^.]+$/, "").replace(/[_]+/g, " ").trim();
}

function iconFor(m: Pick<Material, "mime_type" | "url">): LucideIcon {
  const mime = m.mime_type ?? "";
  if (m.url && !mime) return Link2;
  if (mime.startsWith("image/")) return FileImage;
  if (mime.startsWith("video/") || mime.startsWith("audio/")) return FileVideo;
  if (/pdf|word|text|rtf|opendocument\.text/.test(mime)) return FileText;
  if (/sheet|excel|csv/.test(mime)) return FileSpreadsheet;
  if (/presentation|powerpoint/.test(mime)) return Presentation;
  if (/zip|compressed|tar|rar/.test(mime)) return FileArchive;
  return File;
}

/**
 * Sharing a file or link with the class: drop a file (its name becomes the
 * title, which can be changed) or paste a link.
 */
export function MaterialUploadForm({ courseId }: { courseId: string }) {
  const t = useT();
  const [mode, setMode] = useState<"file" | "link">("file");
  const [title, setTitle] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function reset() {
    setTitle("");
    setFileName(null);
  }

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold">{t("Share material")}</h2>
        <div className="inline-flex rounded-xl bg-surface-3 p-1 text-sm font-semibold" role="radiogroup" aria-label={t("Share material")}>
          {(["file", "link"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={cn("rounded-lg px-3 py-1.5 transition", mode === m ? "bg-surface text-ink shadow" : "text-ink-muted")}
            >
              {m === "file" ? t("File (up to 50 MB)") : t("Paste a link")}
            </button>
          ))}
        </div>
      </div>

      <ToastForm action={uploadMaterial.bind(null, courseId)} loading={t("Uploading…")} resetOnSuccess onSuccess={reset} className="space-y-4">
        {mode === "file" ? (
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={() => setDragging(false)}
            className={cn(
              "relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-7 text-center transition",
              dragging ? "border-brand-500 bg-brand-500/5" : fileName ? "border-brand-300 bg-brand-500/5" : "border-line hover:border-brand-300 hover:bg-surface-3/40",
            )}
          >
            <UploadCloud className={cn("h-8 w-8 text-brand-500 transition-transform", dragging && "scale-110")} />
            <span className="font-semibold">{fileName ?? t("Drop a file here or click to choose")}</span>
            <span className="text-xs text-ink-muted">{t("PDF, slides, documents, images · up to 50 MB")}</span>
            <input
              type="file"
              name="file"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setFileName(file?.name ?? null);
                if (file && !title) setTitle(titleFromFile(file.name));
              }}
            />
          </label>
        ) : (
          <Field label={t("Link")} htmlFor="m-url">
            <Input id="m-url" name="url" type="url" placeholder="https://" />
          </Field>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Field label={t("Title")} htmlFor="m-title">
              <Input id="m-title" name="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
          </div>
          <Button type="submit">{t("Share")}</Button>
        </div>
      </ToastForm>
    </Card>
  );
}

/** The course's materials: type icon, date and size, open or download, and remove for teachers. */
export function MaterialList({ courseId, materials, canWrite }: { courseId: string; materials: Material[]; canWrite: boolean }) {
  const t = useT();
  const fmt = useFormat();

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
      {materials.map((m) => {
        const Icon = iconFor(m);
        return (
          <li key={m.id} className="flex items-center gap-3 p-3 sm:p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-700 dark:text-brand-300">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{m.title}</p>
              <p className="text-xs text-ink-muted">
                {fmt.date(m.created_at)}
                {m.size_bytes > 0 && ` · ${(m.size_bytes / 1024 / 1024).toFixed(1)} MB`}
                {m.url && URL.canParse(m.url) && ` · ${new URL(m.url).hostname}`}
              </p>
            </div>
            <a href={m.url ?? `/api/files/materials/${m.id}/download`} target={m.url ? "_blank" : undefined} rel="noreferrer" className={buttonClass("secondary", "sm")}>
              {m.url && <ExternalLink className="h-3.5 w-3.5" />}
              {m.url ? t("Open") : t("Download")}
            </a>
            {canWrite && (
              <ToastButton
                action={deleteMaterial.bind(null, courseId, m.id)}
                unstyled
                className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition hover:bg-danger/10 hover:text-danger"
                label={t("Delete")}
                confirm={{ title: t("Remove “{title}”?", { title: m.title }), description: t("Students lose access to it."), confirmLabel: t("Delete") }}
              >
                <Trash2 className="h-4 w-4" />
              </ToastButton>
            )}
          </li>
        );
      })}
    </ul>
  );
}
