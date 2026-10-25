import Link from "next/link";
import { Eye, Link2, Loader2, Play, TriangleAlert } from "lucide-react";
import type { Recording } from "@educloud/api-client";
import { Badge, cn } from "@educloud/ui";
import { RecordingAdminControls } from "./recording-admin-controls";
import { getFormat, getT } from "@educloud/ui/locale";

export function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

/** Hue from the id so each recording gets its own cover gradient. */
function hue(id: string) {
  return [...id].reduce((h, c) => (h * 33 + c.charCodeAt(0)) % 360, 11);
}

/**
 * A recording as a video tile. Processing and failed states are shown to staff only.
 */
export async function RecordingCard({ recording, canManage }: { recording: Recording; canManage: boolean }) {
  const fmt = await getFormat();
  const t = await getT();
  const ready = recording.status === "ready";
  const h = hue(recording.id);
  const duration = formatDuration(recording.duration_seconds);

  const cover = (
    <div
      className="relative aspect-video overflow-hidden rounded-2xl"
      style={{ background: `linear-gradient(135deg, hsl(${h} 70% 55%), hsl(${(h + 60) % 360} 70% 35%))` }}
    >
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(rgb(255_255_255_/_0.15)_1px,transparent_1px)] [background-size:16px_16px] opacity-60" />
      <div className="absolute inset-0 grid place-items-center">
        {ready ? (
          <span className="grid h-14 w-14 place-items-center rounded-full bg-white/90 text-brand-700 shadow-[var(--shadow-lift)] transition-transform duration-300 group-hover:scale-110">
            {recording.source === "link" ? <Link2 className="h-6 w-6" /> : <Play className="ms-1 h-6 w-6 fill-current" />}
          </span>
        ) : recording.status === "processing" ? (
          <span className="flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 text-xs font-semibold text-white">
            <Loader2 className="h-4 w-4 animate-spin" /> {t("Processing")}
          </span>
        ) : (
          <span className="flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 text-xs font-semibold text-white">
            <TriangleAlert className="h-4 w-4" /> {t("Failed")}
          </span>
        )}
      </div>
      {duration && <span className="absolute bottom-2 end-2 rounded-md bg-black/60 px-1.5 py-0.5 text-xs font-semibold text-white">{duration}</span>}
      {!recording.published_at && ready && <span className="absolute start-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-xs font-semibold text-white">{t("Hidden")}</span>}
    </div>
  );

  return (
    <div className="group">
      {ready ? (
        <Link href={`/courses/${recording.course_id}/recordings/${recording.id}`} className="block rounded-2xl transition-shadow hover:shadow-[var(--shadow-lift)]" aria-label={t("Watch {title}", { title: recording.title })}>
          {cover}
        </Link>
      ) : (
        cover
      )}
      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={cn("truncate font-semibold", ready && "group-hover:text-brand-600 dark:group-hover:text-brand-300")}>{recording.title}</p>
          <p className="mt-0.5 flex items-center gap-2 text-xs text-ink-muted">
            {fmt.date(recording.created_at, { month: "short", day: "numeric", year: "numeric" })}
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" /> {recording.view_count}
            </span>
            {recording.source === "zoom" && <Badge tone="brand">Zoom</Badge>}
          </p>
        </div>
        {canManage && <RecordingAdminControls recording={recording} />}
      </div>
    </div>
  );
}
