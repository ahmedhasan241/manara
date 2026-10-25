import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { ApiError } from "@educloud/api-client";
import { Character, buttonClass, cn } from "@educloud/ui";
import { AuthRequired } from "@/components/site/auth-required";
import { Player } from "@/components/site/player";
import { getViewer } from "@/lib/viewer";
import { getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Learning") };
}

export default async function LearnPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ lecture?: string }> }) {
  const t = await getT();
  const { slug } = await params;
  const { lecture } = await searchParams;
  const { api, me } = await getViewer();
  if (!me) return <AuthRequired title={t("Sign in to start learning")} description={t("Your progress is saved to your account, so you can continue on any device.")} />;

  let course;
  try {
    course = await api.learningCourse(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    if (error instanceof ApiError && error.status === 403) {
      return (
        <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
          <div className="w-40">
            <Character variant="teacher" tone={1} hair={1} hairStyle="bun" backdrop="peach" />
          </div>
          <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent-500/10 px-3 py-1 text-xs font-semibold text-accent-600">
            <Lock className="h-3.5 w-3.5" /> {t("Not in your learning yet")}
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold">{t("Get this course to start watching")}</h1>
          <p className="mt-2 text-ink-muted">{t("Free previews are on the course page. Enroll or buy it to unlock every lecture.")}</p>
          <Link href={`/course/${slug}`} className={cn(buttonClass("primary", "lg"), "mt-6 !rounded-full")}>
            {t("View course")}
          </Link>
        </div>
      );
    }
    throw error;
  }

  const lectureIds = course.curriculum.flatMap((s) => s.lectures.map((l) => l.id));
  const initial = lecture && lectureIds.includes(lecture) ? lecture : course.resume_lecture_id;

  const notes = await api.courseNotes(slug).catch(() => []);

  return <Player course={course} initialLectureId={initial} notes={notes} />;
}
