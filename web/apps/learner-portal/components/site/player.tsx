"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Circle, FileText, ListVideo, Loader2, PlayCircle, Star, Trophy } from "lucide-react";
import type { LectureNote, Playback, PlayerCourse } from "@educloud/api-client";
import { Alert, Button, Logo, ProgressBar, StarRatingInput, TabsContent, TabsList, TabsRoot, TabsTrigger, Textarea, celebrate, cn, useT } from "@educloud/ui";
import { playLecture, reviewCourse, saveProgress } from "@/app/site-actions";
import { formatDuration } from "@/lib/format";
import { LectureMedia, type MediaControl } from "./lecture-media";
import { NotesPanel } from "./notes-panel";
import { useMutation } from "@/components/use-mutation";

/**
 * The course player: lecture on the left, curriculum with ticks on the right,
 * progress saved as you go (position every 15 s, completion at the end).
 */
export function Player({ course, initialLectureId, notes }: { course: PlayerCourse; initialLectureId: string | null; notes: LectureNote[] }) {
  const t = useT();
  const router = useRouter();
  const lectures = useMemo(() => course.curriculum.flatMap((s) => s.lectures), [course.curriculum]);
  const [currentId, setCurrentId] = useState(initialLectureId ?? lectures[0]?.id ?? null);
  const [playback, setPlayback] = useState<Playback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(() => new Set(lectures.filter((l) => l.completed).map((l) => l.id)));
  const [, start] = useTransition();
  const control = useRef<MediaControl | null>(null);
  const [noteCount, setNoteCount] = useState(notes.length);
  // A note in another lecture: open it, then seek once its video is ready.
  const [pendingSeek, setPendingSeek] = useState<number | null>(null);
  useEffect(() => {
    if (pendingSeek === null || !playback || playback.id !== currentId) return;
    const timer = setTimeout(() => {
      control.current?.seek(pendingSeek);
      setPendingSeek(null);
    }, 400);
    return () => clearTimeout(timer);
  }, [pendingSeek, playback, currentId]);

  function jumpTo(lectureId: string, seconds: number | null) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (lectureId === currentId) {
      if (seconds !== null) control.current?.seek(seconds);
      return;
    }
    setCurrentId(lectureId);
    setPendingSeek(seconds);
  }

  const index = lectures.findIndex((l) => l.id === currentId);
  const current = lectures[index];
  const done = completed.size;
  const percent = lectures.length ? Math.round((done / lectures.length) * 100) : 0;

  useEffect(() => {
    if (!currentId) return;
    setPlayback(null);
    setError(null);
    let alive = true;
    playLecture(currentId).then((result) => {
      if (!alive) return;
      if ("error" in result) setError(result.error);
      else setPlayback(result);
    });
    // Keep the lecture in the URL so a reload resumes it.
    window.history.replaceState(null, "", `?lecture=${currentId}`);
    return () => {
      alive = false;
    };
  }, [currentId]);

  function toggleComplete(id: string, value = !completed.has(id)) {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (value) next.add(id);
      else next.delete(id);
      if (value && next.size === lectures.length && prev.size < lectures.length) celebrate();
      return next;
    });
    start(async () => {
      await saveProgress(id, { completed: value });
      router.refresh();
    });
  }

  function go(offset: number) {
    const next = lectures[index + offset];
    if (next) setCurrentId(next.id);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-surface-2">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-brand-400/20 bg-nav text-white shadow-[var(--shadow-soft)]">
        <div className="flex h-16 items-center gap-3 px-3 sm:px-5">
          <Link href="/my-learning" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15 hover:bg-white/25" aria-label={t("Back to my learning")}>
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          </Link>
          <Link href="/" className="hidden shrink-0 sm:block" aria-label={t("Manara home")}>
            <Logo mark />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display font-bold">{course.title}</p>
            <p className="truncate text-xs text-white/80">{course.instructor?.name ?? course.organization?.name}</p>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <div className="w-36">
              <ProgressBar value={done} max={Math.max(lectures.length, 1)} className="bg-white/15 [&>div]:from-brand-300 [&>div]:to-brand-400" label={t("Course progress")} />
              <p className="mt-1 text-end text-xs text-white/85">
                {percent}% · {done}/{lectures.length}
              </p>
            </div>
            {percent === 100 &&
              (course.certificate ? (
                <Link href={`/certificate/${course.certificate}`} className="inline-flex items-center gap-1.5 rounded-full bg-brand-400 px-3 py-1.5 text-xs font-bold text-nav hover:bg-brand-300">
                  <Trophy className="h-4 w-4" /> {t("View certificate")}
                </Link>
              ) : (
                <Trophy className="h-6 w-6 text-amber-300" aria-label={t("Course complete")} />
              ))}
          </div>
          <a href="#course-content" className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 hover:bg-white/25 lg:hidden" aria-label={t("Jump to course content")}>
            <ListVideo className="h-5 w-5" />
          </a>
        </div>
        {/* Phones: progress as a thin bar under the header */}
        <div className="h-1 bg-white/20 sm:hidden" role="progressbar" aria-label={t("Course progress")} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-brand-400 transition-[width] duration-500" style={{ width: `${percent}%` }} />
        </div>
      </header>

      <div className="grid grid-cols-1 flex-1 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <main className="min-w-0 p-3 sm:p-6">
          <div className="overflow-hidden rounded-[1.5rem] bg-nav p-2 shadow-[var(--shadow-lift)] sm:p-3">
            {error ? (
              <div className="grid aspect-video place-items-center rounded-2xl text-center text-white/80">
                <p>{error}</p>
              </div>
            ) : playback ? (
              <LectureMedia
                control={control}
                playback={playback}
                startAt={course.positions[playback.id] ?? 0}
                onPosition={(seconds) => currentId && saveProgress(currentId, { position_seconds: seconds })}
                onEnded={() => current && !completed.has(current.id) && toggleComplete(current.id, true)}
              />
            ) : (
              <div className="skeleton aspect-video rounded-2xl" aria-label={t("Loading lecture")} />
            )}
          </div>

          {current && (
            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-brand-600 dark:text-brand-300">
                  {t("Lecture {number} of {total}", { number: index + 1, total: lectures.length })}
                </p>
                <h1 className="font-display text-xl font-bold sm:text-2xl">{current.title}</h1>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                <Button variant="secondary" size="sm" onClick={() => go(-1)} disabled={index <= 0}>
                  <ChevronLeft className="h-4 w-4 rtl:rotate-180" /> {t("Previous")}
                </Button>
                <Button variant={completed.has(current.id) ? "soft" : "secondary"} size="sm" onClick={() => toggleComplete(current.id)}>
                  {completed.has(current.id) ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4" />}
                  <span className="sm:hidden">{completed.has(current.id) ? t("Done") : t("Mark done")}</span>
                  <span className="hidden sm:inline">{completed.has(current.id) ? t("Completed") : t("Mark complete")}</span>
                </Button>
                <Button size="sm" onClick={() => go(1)} disabled={index >= lectures.length - 1}>
                  {t("Next")}{" "}<ChevronRight className="h-4 w-4 rtl:rotate-180" />
                </Button>
              </div>
            </div>
          )}

          <div className="mt-8">
            <TabsRoot defaultValue="overview">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">{t("Overview")}</TabsTrigger>
              <TabsTrigger value="notes">
                {t("Notes")}
                {noteCount > 0 && <span className="rounded bg-surface-3 px-1 text-[11px]">{noteCount}</span>}
              </TabsTrigger>
              <TabsTrigger value="review">{course.owned ? t("Rate this course") : t("Reviews")}</TabsTrigger>
            </TabsList>
            <TabsContent value="notes">
              <NotesPanel initial={notes} lectureId={currentId} lectureTitle={current?.title ?? null} currentTime={() => control.current?.time() ?? null} onJump={jumpTo} onCountChange={setNoteCount} />
            </TabsContent>
            <TabsContent value="overview">
              <div className="rounded-[1.25rem] border border-line bg-surface p-6">
                {course.subtitle && <p className="font-semibold text-heading">{course.subtitle}</p>}
                {course.description && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-muted">{course.description}</p>}
                {course.outcomes.length > 0 && (
                  <ul className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {course.outcomes.map((o) => (
                      <li key={o} className="flex gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" /> {o}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </TabsContent>
            <TabsContent value="review">
              <ReviewPanel slug={course.slug} owned={course.owned} review={course.review} />
            </TabsContent>
            </TabsRoot>
          </div>
        </main>

        <aside id="course-content" className="scroll-mt-20 border-t border-line bg-surface lg:sticky lg:top-16 lg:h-[calc(100dvh-4rem)] lg:overflow-y-auto lg:border-s lg:border-t-0">
          <div className="p-4">
            <p className="mb-1 font-display text-lg font-bold">{t("Course content")}</p>
            <p className="mb-4 border-b-2 border-brand-400/60 pb-2 text-xs font-semibold text-brand-600 dark:text-brand-300">
              {t("{done}/{total} completed", { done, total: lectures.length })} · {formatDuration(course.duration_seconds, t)}
            </p>
            {course.curriculum.map((section, s) => (
              <details key={section.id} open={section.lectures.some((l) => l.id === currentId) || s === 0} className="group mb-3 rounded-2xl border border-line p-2 open:bg-surface-2/60">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-2 py-1.5 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                  <span>
                    {t("Section")}{" "}{s + 1}: {section.title}
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-ink-muted">
                    {section.lectures.filter((l) => completed.has(l.id)).length}/{section.lectures.length}
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                  </span>
                </summary>
                <ol className="mt-2 space-y-1.5">
                  {section.lectures.map((l, i) => {
                    const active = l.id === currentId;
                    const tints = ["bg-sky", "bg-peach", "bg-mint", "bg-blush", "bg-lilac"];
                    return (
                      <li key={l.id} className={cn("flex items-center gap-2 rounded-xl px-2 py-2 text-sm transition", active ? "fill-brand text-white shadow-[var(--shadow-soft)]" : `${tints[i % tints.length]} text-ink`)}>
                        <button
                          type="button"
                          onClick={() => toggleComplete(l.id)}
                          aria-label={completed.has(l.id) ? t("Mark “{title}” not done", { title: l.title }) : t("Mark “{title}” done", { title: l.title })}
                          className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 transition", completed.has(l.id) ? (active ? "border-white bg-white text-brand-600" : "border-brand-600 bg-brand-600 text-white dark:border-brand-400 dark:bg-brand-400 dark:text-nav") : active ? "border-white/70" : "border-ink-muted/30 bg-white/60")}
                        >
                          {completed.has(l.id) && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                        </button>
                        <button type="button" onClick={() => setCurrentId(l.id)} className="flex min-w-0 flex-1 items-center gap-2 text-start" aria-current={active ? "true" : undefined}>
                          {l.type === "article" ? <FileText className="h-4 w-4 shrink-0 opacity-70" /> : <PlayCircle className="h-4 w-4 shrink-0 opacity-70" />}
                          <span className="min-w-0 flex-1 truncate font-medium">{l.title}</span>
                          <span className={cn("shrink-0 text-xs", active ? "text-white/85" : "text-ink-muted")}>{formatDuration(l.duration_seconds, t)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </details>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function ReviewPanel({ slug, owned, review }: { slug: string; owned: boolean; review: { rating: number; comment: string | null } | null }) {
  const t = useT();
  const { run, pending } = useMutation();
  const [error, setError] = useState<string | null>(null);

  if (!owned) {
    return (
      <div className="rounded-[1.25rem] border border-line bg-surface p-6 text-sm text-ink-muted">
        {t("Ratings come from learners who own this course.")}{" "}<Link href={`/course/${slug}#reviews-heading`} className="font-semibold text-brand-600 hover:underline dark:text-brand-300">{t("Read the reviews")}</Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setError(null);
        run(() => reviewCourse(data), {
          success: review ? t("Review updated. Thank you!") : t("Thanks for your review!"),
          quietError: true,
          onError: (result) => setError(result.error ?? null),
        });
      }}
      className="space-y-4 rounded-[1.25rem] border border-line bg-surface p-6"
    >
      <input type="hidden" name="slug" value={slug} />
      <p className="flex items-center gap-2 font-semibold">
        <Star className="h-5 w-5 text-amber-400" /> {review ? t("Update your rating") : t("How is this course so far?")}
      </p>
      <StarRatingInput name="rating" defaultValue={review?.rating ?? 0} />
      <Textarea name="comment" rows={3} maxLength={2000} defaultValue={review?.comment ?? ""} placeholder={t("What do you like? What could be better?")} aria-label={t("Your review")} />
      {error && <Alert>{error}</Alert>}
      <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending ? t("Saving…") : review ? t("Update review") : t("Post review")}
      </Button>
    </form>
  );
}
