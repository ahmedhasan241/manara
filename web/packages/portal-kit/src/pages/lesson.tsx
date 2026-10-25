import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, CheckCircle2, ChevronDown, Clock, Film, PlayCircle, Radio, ShieldCheck, Users, Video, XCircle } from "lucide-react";
import { ApiError, type LiveLesson } from "@educloud/api-client";
import { Avatar, Badge, Card, Countdown, CourseCover, EmptyState, FadeIn, LessonList, type LessonListItem, LiveDot, Stagger, StaggerItem, asKey, cn, firstName, rich } from "@educloud/ui";
import { getContext } from "../session";
import { LessonActions } from "../lesson-actions";
import { formatLessonTime } from "../lesson-card";
import { RecordingCard } from "../recording-card";
import { RecordingUploadForm } from "../recording-upload-form";
import { getI18n, getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Live lesson") };
}

/**
 * The lesson room, after the Campus "Meeting" screen: a title bar, a stage with
 * the people in the lesson and a floating control bar, and the course's
 * contents and recordings on the side. The meeting itself opens in Zoom or
 * Jitsi in a new tab, so the controls here are the real ones: join, start, end.
 */
export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { t, fmt } = await getI18n();
  const { id } = await params;
  const { api, can, me } = await getContext();
  const canHost = can("courses.manage");

  const lesson = await api.lesson(id).catch((error) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });
  const [attendees, courseLessons] = await Promise.all([
    canHost && lesson.status !== "scheduled" ? api.lessonAttendees(id) : Promise.resolve(null),
    lesson.course ? api.courseLessons(lesson.course.id).catch(() => [] as LiveLesson[]) : Promise.resolve([] as LiveLesson[]),
  ]);
  const live = lesson.status === "live";
  const backHref = lesson.course ? `/courses/${lesson.course.id}?tab=live` : "/live";
  const planned = courseLessons.filter((l) => l.status !== "canceled").sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const totalMinutes = planned.reduce((sum, l) => sum + l.duration_minutes, 0);

  return (
    <>
      {/* Title bar */}
      <FadeIn>
        <div className="mb-6 flex items-center gap-4 rounded-[1.25rem] border border-line bg-surface p-3 shadow-[var(--shadow-soft)] sm:p-4">
          <Link href={backHref} aria-label={t("Back to {place}", { place: lesson.course?.title ?? t("Live lessons") })} className="fill-brand grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-[var(--shadow-soft)] transition hover:-translate-x-0.5 rtl:hover:translate-x-0.5">
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-lg font-bold sm:text-xl">{lesson.title}</h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted sm:text-sm">
              {lesson.course && <span className="font-semibold text-brand-600 dark:text-brand-300">{lesson.course.title}</span>}
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="h-3.5 w-3.5" /> {formatLessonTime(lesson, fmt)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {t("{count} min", { count: lesson.duration_minutes })}
              </span>
            </p>
          </div>
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            {live ? <Badge tone="live">{t("Live now")}</Badge> : <Badge tone={lesson.status === "ended" ? "success" : lesson.status === "canceled" ? "danger" : "brand"}>{t(asKey(lesson.status))}</Badge>}
            <Badge>{lesson.provider === "zoom" ? t("Zoom") : t("Jitsi Meet")}</Badge>
          </div>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0 space-y-8">
          <FadeIn delay={0.05}>
            <Stage lesson={lesson} canHost={canHost} attendees={attendees} viewer={me.name} />
          </FadeIn>

          {lesson.description && (
            <Card className="p-5">
              <h2 className="mb-1 font-display font-bold">{t("About this lesson")}</h2>
              <p className="text-sm leading-relaxed text-ink-muted">{lesson.description}</p>
            </Card>
          )}

          <section aria-labelledby="recordings-heading">
            <h2 id="recordings-heading" className="mb-4 flex items-center gap-2 font-display text-lg font-bold">
              <Film className="h-5 w-5 text-brand-500" /> {t("Recordings")}
            </h2>
            {lesson.recordings.length === 0 ? (
              <EmptyState
                icon={<Film className="h-6 w-6" />}
                title={lesson.status === "ended" ? t("No recording yet") : t("Recordings appear after the lesson")}
                description={lesson.status === "ended" && lesson.provider === "zoom" ? t("Zoom is still processing it. You'll get a notification when it's ready.") : undefined}
              />
            ) : (
              <Stagger className="grid gap-6 sm:grid-cols-2">
                {lesson.recordings.map((r) => (
                  <StaggerItem key={r.id}>
                    <RecordingCard recording={r} canManage={can("materials.write")} />
                  </StaggerItem>
                ))}
              </Stagger>
            )}
            {can("materials.write") && lesson.course && lesson.status !== "canceled" && (
              <div className="mt-8">
                <RecordingUploadForm courseId={lesson.course.id} lessons={[{ id: lesson.id, title: lesson.title }]} defaultLessonId={lesson.id} />
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          {lesson.course && (
            <Card className="p-4">
              <div className="mb-1 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold">{t("Course contents")}</h2>
                <CalendarClock className="h-5 w-5 text-brand-500" />
              </div>
              <p className="mb-4 border-b-2 border-brand-400/60 pb-2 text-xs font-semibold text-brand-600 dark:text-brand-300">
                {t("{held}/{total} held · {hours} h in total", { held: planned.filter((l) => l.status === "ended").length, total: planned.length, hours: Math.round(totalMinutes / 6) / 10 })}
              </p>
              <ContentsGroup title={t("Coming up")} lessons={planned.filter((l) => l.status === "scheduled" || l.status === "live")} currentId={lesson.id} open />
              <ContentsGroup title={t("Held")} lessons={planned.filter((l) => l.status === "ended")} currentId={lesson.id} open={lesson.status === "ended"} />
            </Card>
          )}

          {attendees && (
            <Card className="p-4">
              <h2 className="mb-1 font-display text-lg font-bold">{t("Attendance")}</h2>
              <p className="mb-4 text-sm text-ink-muted">
                {t("{joined} of {total} students joined", { joined: attendees.filter((a) => a.joined).length, total: attendees.length })}
                {lesson.status === "ended" && " · saved to the attendance tab"}
              </p>
              <ul className="max-h-80 space-y-2 overflow-y-auto pe-1">
                {attendees.map((a) => (
                  <li key={a.id} className={cn("flex items-center gap-3 rounded-xl px-2 py-1.5", a.joined ? "bg-mint/60" : "")}>
                    <Avatar name={a.name} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm">{a.name}</span>
                    {a.joined ? <CheckCircle2 className="h-4 w-4 text-success" aria-label={t("Joined")} /> : <XCircle className="h-4 w-4 text-ink-muted/50" aria-label={t("Did not join")} />}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {lesson.course && (
            <Link href={`/courses/${lesson.course.id}?tab=recordings`} className="group block overflow-hidden rounded-[1.25rem] border border-line bg-surface shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
              <CourseCover seed={lesson.course.title} size="sm" className="h-24" />
              <div className="flex items-center gap-3 p-4">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-peach text-brand-700 dark:text-brand-300">
                  <PlayCircle className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-heading">{t("All recordings")}</span>
                  <span className="block truncate text-xs text-ink-muted">{t("Catch up on {course}", { course: lesson.course.title })}</span>
                </span>
              </div>
            </Link>
          )}
        </aside>
      </div>
    </>
  );
}

/** The big "video" area: who's in the lesson, its state, and the real controls. */
async function Stage({ lesson, canHost, attendees, viewer }: { lesson: LiveLesson & { recordings: unknown[] }; canHost: boolean; attendees: { id: number; name: string; joined: boolean }[] | null; viewer: string }) {
  const t = await getT();
  const live = lesson.status === "live";
  const host = lesson.host?.name ?? t("Your teacher");
  const joined = attendees?.filter((a) => a.joined) ?? [];
  // Side tiles: students who joined (for the host), or host and you (for students).
  const tiles = canHost ? joined.slice(0, 3).map((a) => a.name) : [viewer];
  const extra = canHost ? Math.max(0, joined.length - 3) : Math.max(0, (lesson.attendees_count ?? 0) - 1);

  return (
    <section aria-label={t("Lesson room")} className="relative overflow-hidden rounded-[1.75rem] bg-sky p-3 shadow-[var(--shadow-soft)] sm:p-4">
      <div className="relative flex h-[30rem] flex-col overflow-hidden rounded-[1.4rem] sm:h-[28rem] 2xl:h-[34rem]">
        {/* Backdrop */}
        <div aria-hidden className={cn("absolute inset-0", live ? "bg-brand-600" : "banner-brand")}>
          <div className="absolute -start-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-28 end-10 h-72 w-72 rounded-full bg-accent-400/30 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(rgb(255_255_255_/_0.09)_1px,transparent_1px)] [background-size:20px_20px]" />
        </div>

        {/* Top row */}
        <div className="relative flex items-start justify-between gap-3 p-4 text-white">
          <span className="inline-flex items-center gap-2 rounded-full bg-black/25 px-3 py-1 text-xs font-semibold backdrop-blur">
            {live ? (
              <>
                <LiveDot /> {t("Live · {count} joined", { count: lesson.attendees_count ?? 0 })}
              </>
            ) : lesson.status === "scheduled" ? (
              <>
                <Clock className="h-3.5 w-3.5" /> {t("Starts")} <Countdown to={lesson.scheduled_at} />
              </>
            ) : (
              <>
                <ShieldCheck className="h-3.5 w-3.5" /> {lesson.status === "ended" ? t("Lesson ended") : t("Canceled")}
              </>
            )}
          </span>
          {lesson.auto_record && lesson.status !== "canceled" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Radio className={cn("h-3.5 w-3.5", live && "animate-pulse text-live-400")} /> {live ? t("Recording") : t("Recorded")}
            </span>
          )}
        </div>

        {/* Host in the middle, people on the side */}
        <div className="relative flex flex-1 items-center justify-center gap-6 px-4 pb-32 sm:pb-28">
          <div className="text-center text-white">
            <div className="relative mx-auto w-fit">
              {live && <span aria-hidden className="absolute -inset-3 animate-ping rounded-full bg-white/15 [animation-duration:2.4s]" />}
              <Avatar name={host} size="lg" className="relative !h-24 !w-24 !text-3xl ring-4 ring-white/40 sm:!h-28 sm:!w-28" />
            </div>
            <p className="mt-3 font-display text-lg font-bold">{host}</p>
            <p className="text-sm text-white/75">{live ? "is teaching now" : lesson.status === "scheduled" ? "will host this lesson" : "hosted this lesson"}</p>
          </div>

          {(tiles.length > 0 || extra > 0) && (
            <ul className="absolute end-4 top-1/2 hidden -translate-y-1/2 flex-col gap-2 sm:flex" aria-label={t("People in the lesson")}>
              {tiles.map((name) => (
                <li key={name} className="grid h-20 w-28 place-items-center rounded-xl border-2 border-white/70 bg-white/15 backdrop-blur">
                  <span className="flex flex-col items-center gap-1 text-white">
                    <Avatar name={name} size="sm" />
                    <span className="max-w-24 truncate text-[11px] font-semibold">{name === viewer ? t("You") : firstName(name)}</span>
                  </span>
                </li>
              ))}
              {extra > 0 && <li className="grid h-10 w-28 place-items-center rounded-xl bg-white/20 text-xs font-bold text-white backdrop-blur">{t("+{count} more", { count: extra })}</li>}
            </ul>
          )}
        </div>

        {/* Floating control bar */}
        <div className="absolute inset-x-3 bottom-3 sm:inset-x-6 sm:bottom-5">
          <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-surface/95 p-3 shadow-[var(--shadow-lift)] backdrop-blur sm:justify-between sm:px-5">
            <p className="flex items-center gap-2 text-sm text-ink-muted">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-sky text-brand-700 dark:text-brand-300">
                <Video className="h-4 w-4" />
              </span>
              <span>
                {rich(t("Opens in <b>{app}</b> in a new tab", { app: lesson.provider === "zoom" ? "Zoom" : "Jitsi Meet" }), { b: (w) => <span className="font-semibold text-ink">{w}</span> })}
              </span>
            </p>
            {lesson.status === "scheduled" || live ? (
              <LessonActions lesson={lesson} canHost={canHost} />
            ) : (
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink-muted">
                <Users className="h-4 w-4" />
                {lesson.status === "ended" ? `${t("{count} attended", { count: lesson.attendees_count ?? 0 })} · ${t("{count} recordings", { count: lesson.recordings.length })}` : t("This lesson was canceled")}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/** One collapsible section of the course contents, like "Get Started" in the design. */
async function ContentsGroup({ title, lessons, currentId, open }: { title: string; lessons: LiveLesson[]; currentId: string; open?: boolean }) {
  if (lessons.length === 0) return null;
  const { t, fmt } = await getI18n();
  const items: LessonListItem[] = lessons.map((l) => ({
    id: l.id,
    title: l.title,
    meta: fmt.date(l.scheduled_at, { month: "short", day: "numeric" }),
    href: `/live/${l.id}`,
    state: l.status === "ended" ? "done" : l.status === "live" ? "live" : "upcoming",
    active: l.id === currentId,
  }));

  return (
    <details open={open || lessons.some((l) => l.id === currentId)} className="group mb-3 rounded-2xl border border-line p-3 open:border-brand-300/70 open:bg-brand-500/[0.03]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        <span className="group-open:text-brand-600 dark:group-open:text-brand-300">{title}</span>
        <span className="flex items-center gap-2 text-xs font-medium text-ink-muted">
          {t("{count} lessons", { count: lessons.length })}
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <div className="mt-3">
        <LessonList items={items} />
      </div>
    </details>
  );
}
