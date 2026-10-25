import LessonPage from "@educloud/portal-kit/pages/lesson";
import { requireAudience } from "@educloud/portal-kit/session";
import { LessonPlanCard } from "@/components/academics/lesson-plan";

export { generateMetadata } from "@educloud/portal-kit/pages/lesson";

/** The shared lesson room, followed by the teacher's lesson plan. */
export default async function LearnerLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { api, workspace } = await requireAudience("learner", "/staff-account");
  // The room handles a missing lesson (404); the plan simply doesn't show then.
  const lesson = await api.lesson(id).catch(() => null);

  return (
    <>
      <LessonPage params={params} />
      {lesson && <LessonPlanCard plan={lesson} ended={lesson.status === "ended"} isParent={workspace.role === "parent"} />}
    </>
  );
}
