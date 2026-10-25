import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Eye, Film } from "lucide-react";
import { ApiError } from "@educloud/api-client";
import { Card, buttonClass, cn } from "@educloud/ui";
import { getContext } from "../session";
import { formatDuration } from "../recording-card";
import { getFormat, getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Recording") };
}

/**
 * Watch a recording. Files stream from the API through a short-lived signed URL
 * (seeking works); linked recordings open at their source.
 */
export default async function RecordingPage({ params }: { params: Promise<{ id: string; recordingId: string }> }) {
  const fmt = await getFormat();
  const t = await getT();
  const { id, recordingId } = await params;
  const { api } = await getContext();

  const [course, recordings] = await Promise.all([api.course(id), api.recordings(id)]).catch((error) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });
  const recording = recordings.find((r) => r.id === recordingId);
  if (!recording || recording.status !== "ready") notFound();
  const playback = await api.playRecording(recordingId);
  const others = recordings.filter((r) => r.id !== recordingId && r.status === "ready");

  return (
    <>
      <Link href={`/courses/${id}?tab=recordings`} className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {course.title}
      </Link>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_20rem]">
        <div>
          <div className="overflow-hidden rounded-[var(--radius-card)] bg-black shadow-[var(--shadow-lift)]">
            {playback.external ? (
              <div className="grid aspect-video place-items-center bg-brand-600 p-6 text-center text-white">
                <div>
                  <Film className="mx-auto mb-3 h-10 w-10 opacity-80" />
                  <p className="mb-4 font-semibold">{t("This recording is hosted elsewhere.")}</p>
                  <a href={playback.url} target="_blank" rel="noreferrer" className={cn(buttonClass("secondary"), "text-ink")}>
                    {t("Open recording")}{" "}<ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            ) : (
              <video controls playsInline preload="metadata" className="aspect-video w-full" controlsList="nodownload">
                <source src={playback.url} type={playback.mime_type ?? "video/mp4"} />
                {t("Your browser can't play this video.")}
              </video>
            )}
          </div>
          <h1 className="mt-6 font-display text-2xl font-bold">{recording.title}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-ink-muted">
            <span>{fmt.date(recording.created_at, { dateStyle: "long" })}</span>
            {formatDuration(recording.duration_seconds) && <span>{formatDuration(recording.duration_seconds)}</span>}
            <span className="inline-flex items-center gap-1">
              <Eye className="h-4 w-4" /> {t("{count} views", { count: recording.view_count + 1 })}
            </span>
            {recording.lesson && (
              <Link href={`/live/${recording.lesson.id}`} className="font-semibold text-brand-600 hover:underline dark:text-brand-300">
                {t("From the live lesson “{title}”", { title: recording.lesson.title })}
              </Link>
            )}
          </p>
        </div>

        <aside aria-labelledby="more-heading">
          <Card className="p-4">
            <h2 id="more-heading" className="mb-3 px-1 font-display font-bold">
              {t("More from {name}", { name: course.code })}
            </h2>
            {others.length === 0 ? (
              <p className="px-1 text-sm text-ink-muted">{t("No other recordings yet.")}</p>
            ) : (
              <ul className="space-y-1">
                {others.map((r) => (
                  <li key={r.id}>
                    <Link href={`/courses/${id}/recordings/${r.id}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-surface-3">
                      <span className="grid h-10 w-14 shrink-0 place-items-center rounded-lg bg-brand-600 text-white">
                        <Film className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{r.title}</span>
                        <span className="text-xs text-ink-muted">{formatDuration(r.duration_seconds) ?? fmt.date(r.created_at)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}
