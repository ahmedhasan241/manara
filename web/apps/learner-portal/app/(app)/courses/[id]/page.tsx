import { notFound } from "next/navigation";
import Link from "next/link";
import { BookMarked, CalendarCheck, CheckCircle2, ChevronRight, ClipboardList, Clock3, Film, FolderOpen, GraduationCap, Hourglass, Layers, Lock, Star, Target, Timer, Users, Video } from "lucide-react";
import { ApiError, type Assessment, type Course, type ExamOverview } from "@educloud/api-client";
import { Badge, Card, EmptyState, Stagger, StaggerItem, Tabs, asKey, buttonClass } from "@educloud/ui";
import { requireAudience } from "@educloud/portal-kit/session";
import { LessonCard } from "@educloud/portal-kit/lesson-card";
import { RecordingCard } from "@educloud/portal-kit/recording-card";
import { CourseLayout } from "@educloud/portal-kit/course-layout";
import { CourseReviews } from "@educloud/portal-kit/course-reviews";
import { getFormat, getT } from "@educloud/ui/locale";
import { LessonPlanPeek } from "@/components/academics/lesson-plan";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Course") };
}

const TABS = ["live", "recordings", "exams", "grades", "attendance", "materials", "reviews"] as const;
type Tab = (typeof TABS)[number];

const statusTone = { present: "success", late: "warning", absent: "danger", excused: "brand" } as const;

export default async function CoursePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const t = await getT();
  const { id } = await params;
  const requested = (await searchParams).tab as Tab;
  const tab: Tab = TABS.includes(requested) ? requested : "live";
  const { api } = await requireAudience("learner", "/staff-account");

  const [course, lessons] = await Promise.all([
    api.course(id).catch((error) => {
      if (error instanceof ApiError && error.status === 404) notFound();
      throw error;
    }),
    api.courseLessons(id).catch(() => []),
  ]);

  return (
    <CourseLayout course={course} lessons={lessons}>
      <CourseFacts course={course} />
      <Tabs
        id="learner-course"
        active={tab}
        tabs={[
          { key: "live", label: t("Live lessons"), href: "?tab=live", icon: <Video className="h-4 w-4" /> },
          { key: "recordings", label: t("Recordings"), href: "?tab=recordings", icon: <Film className="h-4 w-4" /> },
          { key: "exams", label: t("Exams"), href: "?tab=exams", icon: <ClipboardList className="h-4 w-4" /> },
          { key: "grades", label: t("Grades"), href: "?tab=grades", icon: <GraduationCap className="h-4 w-4" /> },
          { key: "attendance", label: t("Attendance"), href: "?tab=attendance", icon: <CalendarCheck className="h-4 w-4" /> },
          { key: "materials", label: t("Materials"), href: "?tab=materials", icon: <FolderOpen className="h-4 w-4" /> },
          { key: "reviews", label: t("Reviews"), href: "?tab=reviews", icon: <Star className="h-4 w-4" />, count: course.reviews_count },
        ]}
      />
      {tab === "live" && <LiveTab courseId={id} />}
      {tab === "recordings" && <RecordingsTab courseId={id} />}
      {tab === "exams" && <ExamsTab courseId={id} />}
      {tab === "grades" && <GradesTab courseId={id} />}
      {tab === "attendance" && <AttendanceTab courseId={id} />}
      {tab === "materials" && <MaterialsTab courseId={id} />}
      {tab === "reviews" && <CourseReviews courseId={id} />}
    </CourseLayout>
  );
}

/** Subject, year / class and credit hours, when the school has set them. */
async function CourseFacts({ course }: { course: Course }) {
  const t = await getT();
  type Fact = { icon: typeof BookMarked; label: string; value: string };
  const facts: Fact[] = [];
  if (course.subject) facts.push({ icon: BookMarked, label: t("Subject"), value: course.subject });
  if (course.academic_level) facts.push({ icon: Layers, label: t("Level"), value: [course.academic_level.name, course.academic_level.department].filter(Boolean).join(" · ") });
  if (course.class_group) facts.push({ icon: Users, label: t("Class"), value: course.class_group.name });
  if (course.credit_hours != null) facts.push({ icon: GraduationCap, label: t("Credit hours"), value: String(course.credit_hours) });
  if (course.pass_percent != null && facts.length > 0) facts.push({ icon: Target, label: t("Pass mark"), value: `${course.pass_percent}%` });
  if (facts.length === 0) return null;

  return (
    <dl className="mb-6 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
      {facts.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex min-w-0 items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-2.5 shadow-[var(--shadow-soft)]">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-600/10 text-brand-700 dark:text-brand-300">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <dt className="text-[11px] font-medium text-ink-muted">{label}</dt>
            <dd className="truncate text-sm font-semibold">{value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

async function LiveTab({ courseId }: { courseId: string }) {
  const t = await getT();
  const { api } = await requireAudience("learner", "/staff-account");
  const lessons = await api.courseLessons(courseId);
  if (lessons.length === 0) return <EmptyState icon={<Video className="h-6 w-6" />} title={t("No live lessons yet")} description={t("When your teacher schedules one, you'll be notified.")} />;

  return (
    <Stagger className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {lessons.map((lesson) => (
        <StaggerItem key={lesson.id}>
          <div className="relative z-10">
            <LessonCard lesson={lesson} canHost={false} showCourse={false} />
          </div>
          <LessonPlanPeek plan={lesson} ended={lesson.status === "ended"} />
        </StaggerItem>
      ))}
    </Stagger>
  );
}

async function RecordingsTab({ courseId }: { courseId: string }) {
  const t = await getT();
  const { api } = await requireAudience("learner", "/staff-account");
  const recordings = await api.recordings(courseId);
  if (recordings.length === 0) return <EmptyState icon={<Film className="h-6 w-6" />} title={t("No recordings yet")} description={t("Recorded lessons appear here after they end.")} />;

  return (
    <Stagger className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {recordings.map((r) => (
        <StaggerItem key={r.id}>
          <RecordingCard recording={r} canManage={false} />
        </StaggerItem>
      ))}
    </Stagger>
  );
}

async function ExamsTab({ courseId }: { courseId: string }) {
  const fmt = await getFormat();
  const t = await getT();
  const { api } = await requireAudience("learner", "/staff-account");
  const exams = (await api.assessments(courseId)).filter((a) => a.is_online && a.published_at);
  if (exams.length === 0) return <EmptyState icon={<ClipboardList className="h-6 w-6" />} title={t("No online exams yet")} description={t("When your teacher publishes one, it will appear here.")} />;
  const overviews = await Promise.all(exams.map((a) => api.examOverview(a.id).catch(() => null)));

  function ExamRow({ exam, overview }: { exam: Assessment; overview: ExamOverview | null }) {
    const finished = overview?.attempts.filter((x) => x.status !== "in_progress") ?? [];
    const scored = finished.filter((x) => x.score != null && Number(x.max_score) > 0);
    const ratio = (x: (typeof scored)[number]) => Number(x.score) / Number(x.max_score);
    const best = scored.length ? scored.reduce((b, x) => (ratio(x) > ratio(b) ? x : b)) : null;
    const bestPct = best ? Math.round(ratio(best) * 100) : null;

    let status: React.ReactNode;
    if (overview?.open_attempt_id)
      status = (
        <Badge tone="warning">
          <Hourglass className="h-3 w-3" /> {t("In progress")}
        </Badge>
      );
    else if (best)
      status = (
        <Badge tone="success">
          <CheckCircle2 className="h-3 w-3" /> {t("Score {score} / {max}", { score: Number(best.score), max: Number(best.max_score) })}
        </Badge>
      );
    else if (finished.some((x) => x.status === "needs_review")) status = <Badge tone="brand">{t("Awaiting teacher review")}</Badge>;
    else if (finished.length)
      status = (
        <Badge tone="success">
          <CheckCircle2 className="h-3 w-3" /> {t("Handed in")}
        </Badge>
      );
    else if (overview?.closed)
      status = (
        <Badge>
          <Lock className="h-3 w-3" /> {t("Closed")}
        </Badge>
      );
    else status = <Badge tone="accent">{t("Not started")}</Badge>;

    return (
      <Link href={`/exams/${exam.id}`} className="group block rounded-[var(--radius-card)]">
        <Card interactive className="flex items-center gap-4">
          <span
            className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl font-display font-bold ${bestPct == null ? "bg-brand-600/10 text-brand-700 dark:text-brand-300" : bestPct >= 80 ? "bg-success text-white" : bestPct >= 60 ? "bg-warning text-white" : "bg-live-500 text-white"}`}
          >
            {bestPct == null ? <ClipboardList className="h-6 w-6" /> : `${bestPct}%`}
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 font-semibold">
              {exam.title} {status}
            </p>
            <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
              <span className="inline-flex items-center gap-1.5">
                <ClipboardList className="h-3.5 w-3.5" /> {t("Questions: {count}", { count: overview?.question_count ?? exam.questions_count ?? 0 })}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Timer className="h-3.5 w-3.5" /> {exam.time_limit_minutes ? t("{count} min", { count: exam.time_limit_minutes }) : t("No time limit")}
              </span>
              {exam.due_at && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5" /> {t("due {date}", { date: fmt.dateTime(exam.due_at) })}
                </span>
              )}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-ink-muted rtl:rotate-180" />
        </Card>
      </Link>
    );
  }

  return (
    <Stagger as="ul" className="space-y-3">
      {exams.map((a, i) => (
        <StaggerItem as="li" key={a.id}>
          <ExamRow exam={a} overview={overviews[i] ?? null} />
        </StaggerItem>
      ))}
    </Stagger>
  );
}

async function GradesTab({ courseId }: { courseId: string }) {
  const fmt = await getFormat();
  const t = await getT();
  const { api } = await requireAudience("learner", "/staff-account");
  const [assessments, grades] = await Promise.all([api.assessments(courseId), api.grades(courseId)]);
  if (assessments.length === 0) return <EmptyState icon={<GraduationCap className="h-6 w-6" />} title={t("No assessments yet")} />;

  return (
    <Stagger as="ul" className="space-y-3">
      {assessments.map((a) => {
        const g = grades.find((x) => x.assessment_id === a.id);
        const pct = g?.score != null ? (Number(g.score) / Number(a.max_score)) * 100 : null;
        return (
          <StaggerItem as="li" key={a.id}>
            <Card className="flex items-center gap-4">
              <span
                className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl font-display font-bold text-white ${pct == null ? "bg-surface-3 !text-ink-muted" : pct >= 80 ? "bg-success" : pct >= 60 ? "bg-warning" : "bg-live-500"}`}
              >
                {pct == null ? "—" : `${Math.round(pct)}%`}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {a.title} <Badge>{t(asKey(a.type))}</Badge>
                </p>
                {a.is_online && (
                  <Link href={`/exams/${a.id}`} className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300">
                    {t("Open online exam")}
                  </Link>
                )}
                <p className="text-sm text-ink-muted">
                  {g?.score != null ? `${Number(g.score)} / ${Number(a.max_score)}` : t("Not graded yet")}
                  {a.due_at && ` · ${t("due {date}", { date: fmt.date(a.due_at) })}`}
                </p>
                {g?.feedback && <p className="mt-1 text-sm italic text-ink-muted">“{g.feedback}”</p>}
              </div>
            </Card>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}

async function AttendanceTab({ courseId }: { courseId: string }) {
  const fmt = await getFormat();
  const t = await getT();
  const { api } = await requireAudience("learner", "/staff-account");
  const [sessions, summary] = await Promise.all([api.sessions(courseId), api.attendanceSummary(courseId)]);
  const mine = summary[0];

  return (
    <div className="space-y-6">
      {mine && (
        <Card className="flex flex-wrap items-center gap-6">
          <div>
            <p className="text-sm text-ink-muted">{t("Attendance rate")}</p>
            <p className="font-display text-4xl font-bold">{mine.rate == null ? "—" : `${mine.rate}%`}</p>
          </div>
          <p className="text-sm text-ink-muted">
            {t("Attended {attended} of {total} classes · {absent} absent", { attended: mine.attended, total: mine.total, absent: mine.absent })}
          </p>
        </Card>
      )}
      {sessions.length === 0 ? (
        <EmptyState icon={<CalendarCheck className="h-6 w-6" />} title={t("No classes recorded yet")} />
      ) : (
        <Card className="p-2">
          <ul className="divide-y divide-line">
            {sessions.map((s) => {
              const status = s.attendances[0]?.status;
              return (
                <li key={s.id} className="flex items-center justify-between gap-3 p-3">
                  <span>
                    <span className="block font-semibold">{s.topic ?? t("Class")}</span>
                    <span className="text-xs text-ink-muted">{fmt.dateTime(s.starts_at)}</span>
                  </span>
                  {status ? <Badge tone={statusTone[status]}>{status}</Badge> : <Badge>{t("not recorded")}</Badge>}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

async function MaterialsTab({ courseId }: { courseId: string }) {
  const fmt = await getFormat();
  const t = await getT();
  const { api } = await requireAudience("learner", "/staff-account");
  const materials = await api.materials(courseId);
  if (materials.length === 0) return <EmptyState icon={<FolderOpen className="h-6 w-6" />} title={t("No materials yet")} />;

  return (
    <Stagger as="ul" className="space-y-2">
      {materials.map((m) => (
        <StaggerItem as="li" key={m.id}>
          <Card className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="truncate font-semibold">{m.title}</p>
              <p className="text-xs text-ink-muted">
                {fmt.date(m.created_at)}
                {m.size_bytes > 0 && ` · ${(m.size_bytes / 1024 / 1024).toFixed(1)} MB`}
              </p>
            </div>
            <a href={m.url ?? `/api/files/materials/${m.id}/download`} target={m.url ? "_blank" : undefined} rel="noreferrer" className={buttonClass("secondary", "sm")}>
              {m.url ? t("Open") : t("Download")}
            </a>
          </Card>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
