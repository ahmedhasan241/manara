import LessonPage from "@educloud/portal-kit/pages/lesson";
import { getContext } from "@educloud/portal-kit/session";
import { LessonPlanEditor } from "@/components/lesson-plan-editor";

export { generateMetadata } from "@educloud/portal-kit/pages/lesson";

/** The shared lesson room, plus the lesson plan editor for teachers. */
export default async function StaffLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { api, can } = await getContext();
  const lesson = can("courses.manage") ? await api.lesson(id).catch(() => null) : null;

  return (
    <>
      <LessonPage params={params} />
      {lesson && lesson.status !== "canceled" && (
        <section className="mt-8" aria-label={lesson.title}>
          <LessonPlanEditor
            lesson={{
              id: lesson.id,
              status: lesson.status,
              unit: lesson.unit,
              objectives: lesson.objectives ?? [],
              homework: lesson.homework,
              homework_due_at: lesson.homework_due_at,
              resources: lesson.resources ?? [],
              summary: lesson.summary,
            }}
          />
        </section>
      )}
    </>
  );
}
