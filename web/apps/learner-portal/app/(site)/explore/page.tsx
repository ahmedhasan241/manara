import Link from "next/link";
import { SearchX } from "lucide-react";
import type { CourseLevel } from "@educloud/api-client";
import { Character, ClearFilters, EmptyState, FadeIn, FilterBar, FilterChips, FilterSelect, Pagination, Stagger, StaggerItem, asKey, buttonClass, categoryIcon, cn } from "@educloud/ui";
import { MarketCourseCard } from "@/components/site/market-card";
import { LEVEL_LABELS, getViewer } from "@/lib/viewer";
import { getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Explore courses") };
}

type Params = { search?: string; category?: string; level?: string; price?: string; sort?: string; organization?: string; page?: string };

const SORTS = [
  ["popular", "Most popular"],
  ["rating", "Highest rated"],
  ["newest", "Newest"],
  ["price_low", "Price: low to high"],
  ["price_high", "Price: high to low"],
] as const;

export default async function ExplorePage({ searchParams }: { searchParams: Promise<Params> }) {
  const t = await getT();
  const params = await searchParams;
  const { api } = await getViewer();
  const level = params.level && params.level in LEVEL_LABELS ? (params.level as CourseLevel) : undefined;
  const price = params.price === "free" || params.price === "paid" ? params.price : undefined;
  const [courses, categories] = await Promise.all([
    api.catalogCourses({ search: params.search, category: params.category, level, price, sort: params.sort, organization: params.organization, page: Number(params.page) || 1, per_page: 12 }),
    api.catalogCategories(),
  ]);

  const filtered = Boolean(params.search || params.category || level || price || params.organization);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <FadeIn className="banner-brand relative mb-8 grid grid-cols-1 items-center overflow-hidden rounded-[2rem] p-6 text-white sm:p-10 md:grid-cols-[1fr_12rem]">
        <div aria-hidden className="absolute -end-16 -top-20 h-64 w-64 rounded-full border-[28px] border-white/10" />
        <div className="relative">
          <h1 className="font-display text-3xl font-bold !text-white sm:text-4xl">{params.search ? t("Results for “{query}”", { query: params.search }) : params.category ? params.category : t("Explore courses")}</h1>
          <p className="mt-2 text-white/85">{t("{count} courses from teachers, doctors, schools and universities.", { count: courses.total })}</p>
          <form action="/explore" className="mt-5 flex max-w-xl gap-2 rounded-full bg-white p-1.5">
            {params.category && <input type="hidden" name="category" value={params.category} />}
            <input name="search" defaultValue={params.search} placeholder={t("Search courses, topics, skills…")} aria-label={t("Search courses")} className="h-10 min-w-0 flex-1 bg-transparent px-4 text-sm text-ink outline-none placeholder:text-ink-muted/70" />
            <button type="submit" className={cn(buttonClass("primary"), "!rounded-full")}>
              {t("Search")}
            </button>
          </form>
        </div>
        <div className="relative hidden w-44 md:block">
          <Character variant="laptop" tone={0} hair={4} hairStyle="long" backdrop="none" />
        </div>
      </FadeIn>

      <FilterBar
        chips={
          <FilterChips
            param="category"
            label={t("Category")}
            options={[
              { label: t("All") },
              ...categories.map((c) => {
                const Icon = categoryIcon(c.name);
                return { value: c.name, label: t(asKey(c.name)), count: c.courses, icon: <Icon /> };
              }),
            ]}
          />
        }
        filters={
          <>
            <FilterSelect param="price" label={t("Price")} allLabel={t("All")} options={[{ value: "free", label: t("Free") }, { value: "paid", label: t("Paid") }]} />
            <FilterSelect param="level" label={t("Level")} allLabel={t("All")} options={(Object.keys(LEVEL_LABELS) as CourseLevel[]).map((l) => ({ value: l, label: t(LEVEL_LABELS[l]) }))} />
          </>
        }
        actions={<FilterSelect param="sort" label={t("Sort")} allLabel={t("Most popular")} options={SORTS.filter(([value]) => value !== "popular").map(([value, label]) => ({ value, label: t(label) }))} />}
        summary={
          filtered && (
            <>
              <span>{t("{count} courses", { count: courses.total })}</span>
              <ClearFilters params={["search", "category", "level", "price", "organization"]} />
            </>
          )
        }
      />

      {courses.data.length === 0 ? (
        <EmptyState
          icon={<SearchX className="h-6 w-6" />}
          title={t("No courses match")}
          description={t("Try another word or clear the filters.")}
          action={
            filtered ? (
              <Link href="/explore" className={buttonClass("secondary")}>
                {t("Clear filters")}
              </Link>
            ) : undefined
          }
        />
      ) : (
        <Stagger className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {courses.data.map((course) => (
            <StaggerItem key={course.id}>
              <MarketCourseCard course={course} />
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <Pagination page={courses.current_page} pages={courses.last_page} total={courses.total} />
    </div>
  );
}
