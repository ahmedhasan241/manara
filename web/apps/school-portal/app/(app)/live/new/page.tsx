import { notFound } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { PageHeader } from "@educloud/ui";
import { getContext } from "@educloud/portal-kit/session";
import { ScheduleLessonForm } from "@educloud/portal-kit/schedule-lesson-form";
import { getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Schedule a live lesson") };
}

/**
 * Scheduling a live lesson. Opened from Live lessons, or from a course
 * (?course=) with that course picked; saving goes back where it came from.
 */
export default async function NewLivePage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const t = await getT();
  const { api, can } = await getContext();
  if (!can("courses.manage")) notFound();
  const { course } = await searchParams;
  const courses = (await api.courses({})).data;
  const from = courses.find((c) => c.id === course);
  const back = from ? { href: `/courses/${from.id}?tab=live`, label: from.title } : { href: "/live", label: t("Live lessons") };

  return (
    <>
      <PageHeader back={back} icon={<CalendarPlus />} title={t("Schedule a live lesson")} />
      <ScheduleLessonForm courses={courses} defaultCourseId={from?.id} page={{ redirectTo: back.href, cancelHref: back.href }} />
    </>
  );
}
