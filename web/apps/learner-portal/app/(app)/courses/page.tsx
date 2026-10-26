import { BookOpen } from "lucide-react";
import { FilterBar, PageHeader } from "@educloud/ui";
import { requireAudience } from "@educloud/portal-kit/session";
import { CourseCatalog, CourseCategoryChips } from "@educloud/portal-kit/course-tile";
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
  const categories = new Set(courses.data.map((c) => c.category).filter(Boolean));

  return (
    <>
      <PageHeader
        icon={<BookOpen />}
        eyebrow={t("Learning")}
        title={t("Courses")}
        description={t("Grades, attendance, live lessons, recordings and materials for each course.")}
        toolbar={categories.size > 1 && <FilterBar chips={<CourseCategoryChips courses={courses.data} />} />}
      />
      <CourseCatalog courses={courses.data} category={category} chips={false} emptyTitle={t("No courses yet")} emptyDescription={t("Courses appear here once the school enrolls you.")} />
    </>
  );
}
