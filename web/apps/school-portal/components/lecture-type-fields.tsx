"use client";

import { useState } from "react";
import { FileText, Link2, Upload } from "lucide-react";
import { Field, Input, Textarea, asKey, cn, useT } from "@educloud/ui";

const KINDS = [
  { key: "link", label: "Video link", icon: Link2 },
  { key: "upload", label: "Upload video", icon: Upload },
  { key: "article", label: "Article", icon: FileText },
] as const;

/** Lets the teacher pick how the lecture is delivered and shows the matching field. */
export function LectureTypeFields({ idPrefix }: { idPrefix: string }) {
  const t = useT();
  const [kind, setKind] = useState<(typeof KINDS)[number]["key"]>("link");

  return (
    <>
      <input type="hidden" name="type" value={kind === "article" ? "article" : "video"} />
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t("Lecture type")}>
        {KINDS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={kind === key}
            onClick={() => setKind(key)}
            className={cn("flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-semibold transition", kind === key ? "border-brand-400 bg-brand-500/10 text-brand-700 dark:text-brand-200" : "border-line text-ink-muted hover:text-ink")}
          >
            <Icon className="h-3.5 w-3.5" /> {t(asKey(label))}
          </button>
        ))}
      </div>
      {kind === "link" && (
        <Field label={t("Video URL")} htmlFor={`url-${idPrefix}`} hint={t("YouTube, Vimeo or a direct .mp4 link (https).")}>
          <Input id={`url-${idPrefix}`} name="video_url" type="url" placeholder="https://www.youtube.com/watch?v=…" />
        </Field>
      )}
      {kind === "upload" && (
        <Field label={t("Video file")} htmlFor={`file-${idPrefix}`} hint={t("MP4, WebM or MOV, up to 2 GB.")}>
          <Input id={`file-${idPrefix}`} name="file" type="file" accept="video/mp4,video/webm,video/quicktime,audio/mpeg" className="h-auto py-2" />
        </Field>
      )}
      {kind === "article" && (
        <Field label={t("Article text")} htmlFor={`body-${idPrefix}`} hint={t("Use “## ” for headings and “- ” for bullet points.")}>
          <Textarea id={`body-${idPrefix}`} name="body" rows={6} />
        </Field>
      )}
    </>
  );
}
