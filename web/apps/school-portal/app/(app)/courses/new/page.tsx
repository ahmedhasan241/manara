import { notFound } from "next/navigation";
import { BookPlus } from "lucide-react";
import { PageHeader } from "@educloud/ui";
import { getContext } from "@educloud/portal-kit/session";
import { getT } from "@educloud/ui/locale";
import { CourseForm } from "@/components/course-form";
import { createCourse } from "@/app/actions";
import { levelOptions } from "@/lib/scope";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Create a course") };
}

/** Creating a course. On success the new course page opens, with its setup guide. */
export default async function NewCoursePage() {
  const t = await getT();
  const { api, can, workspace } = await getContext();
  if (!can("courses.manage")) notFound();
  const structure = await api.academicStructure().catch(() => null);

  return (
    <>
      <PageHeader back={{ href: "/courses", label: t("Courses") }} icon={<BookPlus />} title={t("Create a course")} description={t("Start with the basics. Lessons, materials and exams come next.")} />
      <CourseForm action={createCourse} levels={levelOptions(structure)} university={(structure?.type ?? workspace.tenant.type) === "university"} cancelHref="/courses" />
    </>
  );
}
