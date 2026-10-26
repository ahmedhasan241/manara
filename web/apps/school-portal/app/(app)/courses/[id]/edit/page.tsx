import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { ApiError } from "@educloud/api-client";
import { PageHeader } from "@educloud/ui";
import { getContext } from "@educloud/portal-kit/session";
import { getT } from "@educloud/ui/locale";
import { CourseForm } from "@/components/course-form";
import { saveCourseFromPage } from "@/app/academic-actions";
import { levelOptions } from "@/lib/scope";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Edit course") };
}

/** Editing a course's details and its place in the school; saving returns to the course. */
export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getT();
  const { api, can, workspace } = await getContext();
  if (!can("courses.manage")) notFound();
  const [course, structure] = await Promise.all([
    api.course(id).catch((error) => {
      if (error instanceof ApiError && error.status === 404) notFound();
      throw error;
    }),
    api.academicStructure().catch(() => null),
  ]);

  return (
    <>
      <PageHeader back={{ href: `/courses/${id}`, label: course.title }} icon={<Pencil />} title={t("Edit course")} description={t("Details, and where the course sits in your school.")} />
      <CourseForm
        action={saveCourseFromPage.bind(null, id)}
        course={course}
        levels={levelOptions(structure)}
        university={(structure?.type ?? workspace.tenant.type) === "university"}
        cancelHref={`/courses/${id}`}
        redirectTo={`/courses/${id}`}
      />
    </>
  );
}
