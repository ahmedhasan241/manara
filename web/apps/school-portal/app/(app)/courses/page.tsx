import { Button, Card, Field, Input, PageHeader, Textarea } from "@educloud/ui";
import { getContext } from "@educloud/portal-kit/session";
import { ToastForm } from "@educloud/portal-kit/toast-form";
import { CourseCatalog } from "@educloud/portal-kit/course-tile";
import { createCourse } from "../../actions";
import { getI18n, getT } from "@educloud/ui/locale";
import { CourseStructureFields } from "@/components/course-structure-fields";
import { levelOptions } from "@/lib/scope";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Courses") };
}

export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ search?: string; new?: string; category?: string }> }) {
  const { search, new: showNew, category } = await searchParams;
  const { api, can, workspace } = await getContext();
  const { t } = await getI18n();
  const [courses, structure] = await Promise.all([api.courses({ search }), can("courses.manage") ? api.academicStructure().catch(() => null) : Promise.resolve(null)]);
  const university = (structure?.type ?? workspace.tenant.type) === "university";

  return (
    <>
      <PageHeader title={t("Courses")} description={t("{count} total", { count: courses.total })} />

      {can("courses.manage") && (
        <details className="mb-6" open={showNew === "1"}>
          <summary className="cursor-pointer text-sm font-medium text-brand-600">{t("+ New course")}</summary>
          <Card className="mt-3 max-w-2xl">
            <ToastForm action={createCourse} loading={t("Creating the course…")} className="grid gap-4 sm:grid-cols-2">
              <Field label={t("Code")} htmlFor="code">
                <Input id="code" name="code" required placeholder={t("MATH-101")} />
              </Field>
              <Field label={t("Term")} htmlFor="term">
                <Input id="term" name="term" placeholder={t("2026 Fall")} />
              </Field>
              <Field label={t("Category")} htmlFor="category" hint={t("Groups courses by topic, e.g. Science or Languages.")}>
                <Input id="category" name="category" list="course-categories" placeholder={t("Science")} />
              </Field>
              <datalist id="course-categories">
                {[t("Mathematics"), t("Science"), t("Languages"), t("Computer science"), t("Design"), t("Business"), t("History"), t("Music")].map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <div className="sm:col-span-2">
                <Field label={t("Title")} htmlFor="title">
                  <Input id="title" name="title" required />
                </Field>
              </div>
              <CourseStructureFields levels={levelOptions(structure)} university={university} />
              <div className="sm:col-span-2">
                <Field label={t("Description")} htmlFor="description">
                  <Textarea id="description" name="description" rows={3} />
                </Field>
              </div>
              <Button type="submit">{t("Create course")}</Button>
            </ToastForm>
          </Card>
        </details>
      )}

      <form className="mb-4 flex max-w-md gap-2" role="search">
        <Input name="search" defaultValue={search} placeholder={t("Search courses")} aria-label={t("Search courses")} />
        <Button variant="secondary" type="submit">
          {t("Search")}
        </Button>
      </form>

      <CourseCatalog courses={courses.data} category={category} query={{ search }} emptyTitle={t("No courses yet")} />
    </>
  );
}
