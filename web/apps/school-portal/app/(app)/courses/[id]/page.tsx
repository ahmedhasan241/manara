import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarCheck, Download, Film, Globe2, FolderOpen, GraduationCap, ListChecks, Pencil, Plus, Star, Timer, Video } from "lucide-react";
import { ApiError } from "@educloud/api-client";
import { Badge, Button, Card, EmptyState, Field, Input, Stagger, StaggerItem, Tabs, asKey, bannerButtonClass, buttonClass } from "@educloud/ui";
import { getContext } from "@educloud/portal-kit/session";
import { ToastForm } from "@educloud/portal-kit/toast-form";
import { Gradebook } from "@/components/gradebook";
import { LessonCard } from "@educloud/portal-kit/lesson-card";
import { RecordingCard } from "@educloud/portal-kit/recording-card";
import { CourseLayout } from "@educloud/portal-kit/course-layout";
import { CourseReviews } from "@educloud/portal-kit/course-reviews";
import { RecordingUploadForm } from "@educloud/portal-kit/recording-upload-form";
import { RollCall } from "@/components/roll-call";
import { CourseBuilder } from "@/components/course-builder";
import { ScheduleLessonLink } from "@educloud/portal-kit/schedule-lesson-form";
import { createSession } from "../../../actions";
import { getI18n, getT } from "@educloud/ui/locale";
import { CourseSetupGuide } from "@/components/course-setup-guide";
import { MaterialList, MaterialUploadForm } from "@/components/materials";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Course") };
}

const TABS = ["live", "recordings", "grades", "attendance", "materials", "reviews", "online"] as const;
type Tab = (typeof TABS)[number];

export default async function CoursePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; session?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const requested = query.tab as Tab;
  const tab: Tab = TABS.includes(requested) ? requested : "live";
  const { api, can, isStaff } = await getContext();
  const { t } = await getI18n();

  const [course, lessons] = await Promise.all([
    api.course(id).catch((error) => {
      if (error instanceof ApiError && error.status === 404) notFound();
      throw error;
    }),
    api.courseLessons(id).catch(() => []),
  ]);

  return (
    <CourseLayout
      course={course}
      lessons={lessons}
      actions={
        (can("reports.view") || can("courses.manage")) && (
          <>
            {can("courses.manage") && (
              <Link href={`/courses/${id}/edit`} className={bannerButtonClass("outline")}>
                <Pencil className="h-4 w-4" /> {t("Edit course")}
              </Link>
            )}
            {can("reports.view") && (
              <>
            <a className={bannerButtonClass()} href={`/api/files/exports/courses/${id}/grades.csv`}>
              <Download className="h-4 w-4" /> {t("Grades CSV")}
            </a>
            <a className={bannerButtonClass("outline")} href={`/api/files/exports/courses/${id}/attendance.csv`}>
              <Download className="h-4 w-4" /> {t("Attendance CSV")}
            </a>
              </>
            )}
          </>
        )
      }
    >
      {can("courses.manage") && <CourseSetupGuide courseId={id} lessons={lessons} />}

      <Tabs
        id="course"
        active={tab}
        tabs={[
          { key: "live", label: t("Live lessons"), href: "?tab=live", icon: <Video className="h-4 w-4" /> },
          { key: "recordings", label: t("Recordings"), href: "?tab=recordings", icon: <Film className="h-4 w-4" /> },
          { key: "grades", label: t("Grades"), href: "?tab=grades", icon: <GraduationCap className="h-4 w-4" /> },
          { key: "attendance", label: t("Attendance"), href: "?tab=attendance", icon: <CalendarCheck className="h-4 w-4" /> },
          { key: "materials", label: t("Materials"), href: "?tab=materials", icon: <FolderOpen className="h-4 w-4" /> },
          { key: "reviews", label: t("Reviews"), href: "?tab=reviews", icon: <Star className="h-4 w-4" />, count: course.reviews_count },
          ...(can("courses.manage") ? [{ key: "online", label: t("Online course"), href: "?tab=online", icon: <Globe2 className="h-4 w-4" /> }] : []),
        ]}
      />

      {tab === "live" && <LiveTab courseId={id} canHost={can("courses.manage")} course={course} />}
      {tab === "recordings" && <RecordingsTab courseId={id} canManage={can("materials.write")} />}
      {tab === "grades" && <GradesTab courseId={id} canWrite={can("grades.write")} isStaff={isStaff} />}
      {tab === "attendance" && <AttendanceTab courseId={id} canWrite={can("attendance.write")} sessionId={query.session} />}
      {tab === "materials" && <MaterialsTab courseId={id} canWrite={can("materials.write")} />}
      {tab === "reviews" && <CourseReviews courseId={id} />}
      {tab === "online" && can("courses.manage") && <OnlineTab courseId={id} />}
    </CourseLayout>
  );
}

async function LiveTab({ courseId, canHost }: { courseId: string; canHost: boolean; course: { id: string; title: string; code: string } }) {
  const t = await getT();
  const { api } = await getContext();
  const lessons = await api.courseLessons(courseId);
  const current = lessons.filter((l) => l.status === "scheduled" || l.status === "live");
  const past = lessons.filter((l) => l.status === "ended" || l.status === "canceled");

  return (
    <div className="space-y-8">
      {canHost && <ScheduleLessonLink courseId={courseId} />}
      {current.length === 0 && past.length === 0 ? (
        <EmptyState icon={<Video className="h-6 w-6" />} title={t("No live lessons yet")} description={canHost ? t("Schedule one above — students are notified instantly.") : t("Your teacher hasn't scheduled any live lessons yet.")} />
      ) : (
        <>
          {current.length > 0 && (
            <Stagger className="grid gap-4 lg:grid-cols-2">
              {current.map((lesson) => (
                <StaggerItem key={lesson.id}>
                  <LessonCard lesson={lesson} canHost={canHost} showCourse={false} />
                </StaggerItem>
              ))}
            </Stagger>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="mb-4 font-display text-lg font-bold">{t("Past lessons")}</h2>
              <Stagger className="grid gap-4 lg:grid-cols-2">
                {past.map((lesson) => (
                  <StaggerItem key={lesson.id}>
                    <LessonCard lesson={lesson} canHost={canHost} showCourse={false} />
                  </StaggerItem>
                ))}
              </Stagger>
            </section>
          )}
        </>
      )}
    </div>
  );
}

async function RecordingsTab({ courseId, canManage }: { courseId: string; canManage: boolean }) {
  const t = await getT();
  const { api } = await getContext();
  const [recordings, lessons] = await Promise.all([api.recordings(courseId), canManage ? api.courseLessons(courseId) : Promise.resolve([])]);

  return (
    <div className="space-y-8">
      {recordings.length === 0 ? (
        <EmptyState icon={<Film className="h-6 w-6" />} title={t("No recordings yet")} description={t("Recorded live lessons appear here automatically when they end.")} />
      ) : (
        <Stagger className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {recordings.map((recording) => (
            <StaggerItem key={recording.id}>
              <RecordingCard recording={recording} canManage={canManage} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
      {canManage && <RecordingUploadForm courseId={courseId} lessons={lessons.filter((l) => l.status !== "canceled").map((l) => ({ id: l.id, title: l.title }))} />}
    </div>
  );
}

async function GradesTab({ courseId, canWrite, isStaff }: { courseId: string; canWrite: boolean; isStaff: boolean }) {
  const t = await getT();
  const { api } = await getContext();
  const [assessments, grades, students] = await Promise.all([
    api.assessments(courseId),
    api.grades(courseId),
    isStaff ? api.courseStudents(courseId) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      {canWrite && (
        <Link href={`/courses/${courseId}/assessments/new`} className={buttonClass(assessments.length === 0 ? "primary" : "soft")}>
          <Plus className="h-4 w-4" /> {t("Add an assessment")}
        </Link>
      )}

      {isStaff && assessments.length > 0 && (
        <Card className="p-0 shadow-[var(--shadow-soft)]">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 sm:px-5">
            <h2 className="flex items-center gap-2 font-display font-bold">
              <ListChecks className="h-4 w-4 text-brand-600 dark:text-brand-300" /> {t("Assessments")}
            </h2>
            {canWrite && <p className="text-xs text-ink-muted">{t("Turn any assessment into an online exam students take in the learner portal.")}</p>}
          </div>
          <ul className="mt-2 divide-y divide-line">
            {assessments.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    {a.title} <Badge>{t(asKey(a.type))}</Badge>
                    {a.is_online && <Badge tone="brand">{t("Online exam")}</Badge>}
                    {!a.published_at && <Badge tone="warning">{t("Hidden from students")}</Badge>}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-ink-muted">
                    <span>{t("Out of {max}", { max: Number(a.max_score) })}</span>
                    {a.is_online && <span>{t("Questions: {count}", { count: a.questions_count ?? 0 })}</span>}
                    {a.is_online && (
                      <span className="inline-flex items-center gap-1">
                        <Timer className="h-3.5 w-3.5" /> {a.time_limit_minutes ? t("{count} min", { count: a.time_limit_minutes }) : t("No time limit")}
                      </span>
                    )}
                  </p>
                </div>
                {canWrite && (
                  <div className="flex flex-wrap gap-2">
                    {a.is_online && (
                      <Link href={`/courses/${courseId}/exams/${a.id}?tab=results`} className={buttonClass("ghost", "sm")}>
                        {t("Results")}
                      </Link>
                    )}
                    <Link href={`/courses/${courseId}/exams/${a.id}`} className={buttonClass(a.is_online ? "secondary" : "soft", "sm")}>
                      <ListChecks className="h-4 w-4" /> {a.is_online ? t("Edit online exam") : t("Build online exam")}
                    </Link>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {assessments.length === 0 ? (
        <EmptyState title={t("No assessments yet")} />
      ) : isStaff ? (
        <Gradebook courseId={courseId} assessments={assessments} students={students} grades={grades} canWrite={canWrite} />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-line text-ink-muted">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{t("Assessment")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("Score")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("Feedback")}</th>
              </tr>
            </thead>
            <tbody>
              {assessments.map((a) => {
                const g = grades.find((x) => x.assessment_id === a.id);
                return (
                  <tr key={a.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      {a.title} <Badge>{t(asKey(a.type))}</Badge>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{g?.score != null ? `${Number(g.score)} / ${Number(a.max_score)}` : "—"}</td>
                    <td className="px-4 py-3 text-ink-muted">{g?.feedback ?? ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

async function AttendanceTab({ courseId, canWrite, sessionId }: { courseId: string; canWrite: boolean; sessionId?: string }) {
  const t = await getT();
  const { api } = await getContext();
  const [sessions, summary, students] = await Promise.all([
    api.sessions(courseId),
    api.attendanceSummary(courseId),
    canWrite ? api.courseStudents(courseId) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      {canWrite && (
        <Card>
          <h2 className="mb-3 font-semibold">{t("Start a class session")}</h2>
          <ToastForm action={createSession.bind(null, courseId)} resetOnSuccess className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field label={t("Date and time")} htmlFor="starts_at">
              <Input id="starts_at" name="starts_at" type="datetime-local" required />
            </Field>
            <Field label={t("Topic")} htmlFor="topic">
              <Input id="topic" name="topic" />
            </Field>
            <Button type="submit">{t("Create")}</Button>
          </ToastForm>
        </Card>
      )}

      {canWrite && sessions[0] && <RollCall key={(sessions.find((s) => s.id === sessionId) ?? sessions[0]).id} session={sessions.find((s) => s.id === sessionId) ?? sessions[0]} students={students} />}

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <caption className="px-4 pt-4 text-start font-semibold">{t("Attendance rate")}</caption>
          <thead className="border-b border-line text-ink-muted">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{t("Student")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("Attended")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("Absent")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("Rate")}</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((row) => (
              <tr key={row.student_id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">{row.student_name}</td>
                <td className="px-4 py-3 tabular-nums">
                  {row.attended} / {row.total}
                </td>
                <td className="px-4 py-3 tabular-nums">{row.absent}</td>
                <td className="px-4 py-3">
                  <Badge tone={row.rate == null ? "neutral" : row.rate >= 90 ? "success" : row.rate >= 75 ? "warning" : "danger"}>
                    {row.rate == null ? "—" : `${row.rate}%`}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

async function MaterialsTab({ courseId, canWrite }: { courseId: string; canWrite: boolean }) {
  const t = await getT();
  const { api } = await getContext();
  const materials = await api.materials(courseId);

  return (
    <div className="space-y-6">
      {canWrite && <MaterialUploadForm courseId={courseId} />}
      {materials.length === 0 ? (
        <EmptyState icon={<FolderOpen className="h-6 w-6" />} title={t("No materials yet")} />
      ) : (
        <MaterialList courseId={courseId} materials={materials} canWrite={canWrite} />
      )}
    </div>
  );
}

async function OnlineTab({ courseId }: { courseId: string }) {
  const { api } = await getContext();
  const { settings, curriculum, students } = await api.curriculum(courseId);
  return <CourseBuilder courseId={courseId} settings={settings} curriculum={curriculum} students={students} />;
}
