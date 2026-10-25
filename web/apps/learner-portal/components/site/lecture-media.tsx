"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { ExternalLink, Loader2, RotateCcw, VideoOff } from "lucide-react";
import type { Playback } from "@educloud/api-client";
import { useT } from "@educloud/ui";

/** YouTube / Vimeo links become embeds; anything else plays in <video>. */
function embedUrl(url: string) {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

/** Lets the player read and move the video position. */
export interface MediaControl {
  time: () => number;
  seek: (seconds: number) => void;
}

/**
 * Plays one lecture: video (uploaded, linked or embedded) or an article.
 * Reports the position every 15 s and when the video ends. Shows a spinner
 * while the video buffers and a clear message (retry, open the link) if it
 * can't be played, instead of an empty black box.
 */
export function LectureMedia({
  playback,
  startAt = 0,
  autoPlay = false,
  onEnded,
  onPosition,
  control,
}: {
  /** Filled with time()/seek() while a video is showing (for notes). */
  control?: RefObject<MediaControl | null>;
  playback: Playback;
  startAt?: number;
  autoPlay?: boolean;
  onEnded?: () => void;
  onPosition?: (seconds: number) => void;
}) {
  const t = useT();
  const video = useRef<HTMLVideoElement>(null);
  const lastReport = useRef(0);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => setState("loading"), [playback.id, attempt]);

  useEffect(() => {
    if (!control) return;
    control.current = {
      time: () => Math.floor(video.current?.currentTime ?? 0),
      seek: (seconds) => {
        if (!video.current) return;
        video.current.currentTime = seconds;
        void video.current.play().catch(() => {});
      },
    };
    return () => {
      control.current = null;
    };
  }, [control, playback.id]);

  useEffect(() => {
    const el = video.current;
    if (!el || !startAt) return;
    const seek = () => {
      if (startAt < el.duration - 5) el.currentTime = startAt;
    };
    el.addEventListener("loadedmetadata", seek, { once: true });
    return () => el.removeEventListener("loadedmetadata", seek);
  }, [playback.id, startAt]);

  if (playback.type === "article") {
    return (
      <article className="prose-campus max-h-[70vh] overflow-y-auto rounded-2xl bg-surface p-6 text-ink sm:p-10">
        <h2 className="mb-4 font-display text-2xl font-bold">{playback.title}</h2>
        {(playback.body ?? "").split(/\n{2,}/).map((block, i) =>
          block.startsWith("## ") ? (
            <h3 key={i} className="mb-2 mt-6 font-display text-lg font-bold">
              {block.slice(3)}
            </h3>
          ) : block.split("\n").every((line) => line.startsWith("- ")) ? (
            <ul key={i} className="mb-4 list-disc space-y-1 ps-6">
              {block.split("\n").map((line) => (
                <li key={line}>{line.slice(2)}</li>
              ))}
            </ul>
          ) : (
            <p key={i} className="mb-4 leading-relaxed">
              {block}
            </p>
          ),
        )}
      </article>
    );
  }

  if (!playback.url) {
    return <div className="grid aspect-video place-items-center rounded-2xl bg-nav text-white/70">{t("This lecture has no video yet.")}</div>;
  }

  const embed = embedUrl(playback.url);
  if (embed) {
    return <iframe src={embed} title={playback.title} className="aspect-video w-full rounded-2xl bg-black" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen />;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-black">
      <video
        key={`${playback.id}-${attempt}`}
        ref={video}
        src={playback.url}
        controls={state !== "failed"}
        autoPlay={autoPlay}
        playsInline
        preload="metadata"
        className="aspect-video w-full bg-black"
        onLoadedMetadata={() => setState("ready")}
        onLoadedData={() => setState("ready")}
        onCanPlay={() => setState("ready")}
        onWaiting={() => setState((s) => (s === "failed" ? s : "loading"))}
        onPlaying={() => setState("ready")}
        onError={() => setState("failed")}
        onEnded={onEnded}
        onTimeUpdate={(e) => {
          const t = Math.floor(e.currentTarget.currentTime);
          if (onPosition && Math.abs(t - lastReport.current) >= 15) {
            lastReport.current = t;
            onPosition(t);
          }
        }}
      />
      {state === "loading" && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-black/55 px-4 py-2 text-sm font-medium text-white backdrop-blur" role="status">
            <Loader2 className="h-4 w-4 animate-spin" /> {t("Loading video…")}
          </span>
        </div>
      )}
      {state === "failed" && (
        <div className="absolute inset-0 grid place-items-center bg-nav/95 p-6 text-center text-white" role="alert">
          <div className="max-w-sm">
            <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-white/10">
              <VideoOff className="h-7 w-7 text-brand-300" />
            </span>
            <p className="font-display text-lg font-semibold !text-white">{t("This video couldn't be played.")}</p>
            <p className="mt-1 text-sm text-white/70">{t("The link may have moved, or your connection dropped.")}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => setAttempt((n) => n + 1)} className="press inline-flex h-10 items-center gap-2 rounded-full bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-600">
                <RotateCcw className="h-4 w-4" /> {t("Try again")}
              </button>
              <a href={playback.url} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-white/25 px-5 text-sm font-semibold text-white hover:bg-white/10">
                {t("Open in a new tab")} <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      )}
      {playback.external && state !== "failed" && (
        <a href={playback.url} target="_blank" rel="noreferrer" className="absolute end-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white backdrop-blur hover:bg-black/70">
          {t("Open")}{" "}<ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}
