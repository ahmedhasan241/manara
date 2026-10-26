import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { ClearFilters, FilterBar, PageHeader, SearchField, buttonClass } from "@educloud/ui";
import { getContext } from "@educloud/portal-kit/session";
import { CourseCatalog, CourseCategoryChips } from "@educloud/portal-kit/course-tile";
import { getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Courses") };
}

export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ search?: string; category?: string }> }) {
  const { search, category } = await searchParams;
  const { api, can } = await getContext();
  const t = await getT();
  const courses = await api.courses({ search });

  return (
    <>
      <PageHeader
        icon={<BookOpen />}
        title={t("Courses")}
        description={t("{count} total", { count: courses.total })}
        actions={
          can("courses.manage") && (
            <Link href="/courses/new" className={buttonClass("primary")}>
              <Plus className="h-4 w-4" /> {t("Create course")}
            </Link>
          )
        }
        toolbar={
          <FilterBar
            search={<SearchField placeholder={t("Search courses")} />}
            chips={<CourseCategoryChips courses={courses.data} />}
            summary={(search || category) && <ClearFilters params={["search", "category"]} />}
          />
        }
      />

      <CourseCatalog courses={courses.data} category={category} chips={false} emptyTitle={search ? t("No courses match") : t("No courses yet")} />
    </>
  );
}
