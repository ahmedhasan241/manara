import { PageHeader } from "@educloud/ui";
import { requireAudience } from "@educloud/portal-kit/session";
import { CourseCatalog } from "@educloud/portal-kit/course-tile";
import { getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Courses") };
}

export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const t = await getT();
  const { category } = await searchParams;
  const { api } = await requireAudience("learner", "/staff-account");
  const courses = await api.courses({});

  return (
    <>
      <PageHeader eyebrow={t("Learning")} title={t("Courses")} description={t("Grades, attendance, live lessons, recordings and materials for each course.")} />
      <CourseCatalog courses={courses.data} category={category} emptyTitle={t("No courses yet")} emptyDescription={t("Courses appear here once the school enrolls you.")} />
    </>
  );
}
