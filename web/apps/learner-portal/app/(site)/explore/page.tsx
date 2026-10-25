import Link from "next/link";
import { SearchX, SlidersHorizontal } from "lucide-react";
import type { CourseLevel } from "@educloud/api-client";
import { Character, EmptyState, FadeIn, Stagger, StaggerItem, TINTS, asKey, buttonClass, categoryIcon, cn, tintFor } from "@educloud/ui";
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

  const href = (patch: Partial<Params>) => {
    const next = new URLSearchParams(Object.entries({ ...params, page: undefined, ...patch }).filter((e): e is [string, string] => !!e[1]));
    return `/explore${next.size ? `?${next}` : ""}`;
  };
  const chip = (active: boolean) =>
    cn("inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition", active ? "fill-brand border-transparent text-white shadow-[var(--shadow-soft)]" : "border-line bg-surface text-ink-muted hover:text-ink");
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

      <nav aria-label={t("Categories")} className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
        <Link href={href({ category: undefined })} className={chip(!params.category)}>
          {t("All")}
        </Link>
        {categories.map((c) => {
          const Icon = categoryIcon(c.name);
          const active = params.category === c.name;
          return (
            <Link key={c.name} href={href({ category: c.name })} className={chip(active)}>
              <span className={cn("grid h-6 w-6 place-items-center rounded-full", active ? "bg-white/20" : TINTS[tintFor(c.name)])}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              {t(asKey(c.name))}
            </Link>
          );
        })}
      </nav>

      <div className="mb-6 flex flex-col gap-3 text-sm sm:flex-row sm:flex-wrap sm:items-center">
        {/* One swipeable row of filters on phones */}
        <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-ink-muted" />
          {(["free", "paid"] as const).map((p) => (
            <Link key={p} href={href({ price: price === p ? undefined : p })} className={cn("shrink-0 rounded-full border px-3 py-1.5 font-medium", price === p ? "border-brand-400 bg-brand-500/10 text-brand-700 dark:text-brand-200" : "border-line bg-surface text-ink-muted hover:text-ink")}>
              {p === "free" ? t("Free") : t("Paid")}
            </Link>
          ))}
          <span className="mx-1 h-5 w-px shrink-0 bg-line" />
          {(Object.keys(LEVEL_LABELS) as CourseLevel[]).map((l) => (
            <Link key={l} href={href({ level: level === l ? undefined : l })} className={cn("shrink-0 rounded-full border px-3 py-1.5 font-medium", level === l ? "border-brand-400 bg-brand-500/10 text-brand-700 dark:text-brand-200" : "border-line bg-surface text-ink-muted hover:text-ink")}>
              {t(LEVEL_LABELS[l])}
            </Link>
          ))}
        </div>
        <form action="/explore" className="flex items-center gap-2 sm:ms-auto">
          {Object.entries(params).filter(([k, v]) => k !== "sort" && k !== "page" && v).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <label htmlFor="sort" className="text-ink-muted">
            {t("Sort")}
          </label>
          <select id="sort" name="sort" defaultValue={params.sort ?? "popular"} className="h-9 rounded-full border border-line bg-surface px-3 text-sm">
            {SORTS.map(([value, label]) => (
              <option key={value} value={value}>
                {t(label)}
              </option>
            ))}
          </select>
          <button type="submit" className={buttonClass("secondary", "sm")}>
            {t("Apply")}
          </button>
        </form>
      </div>

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

      {courses.last_page > 1 && (
        <nav aria-label={t("Pages")} className="mt-10 flex justify-center gap-2">
          {Array.from({ length: courses.last_page }, (_, i) => i + 1).map((page) => (
            <Link key={page} href={`${href({})}${href({}).includes("?") ? "&" : "?"}page=${page}`} aria-current={page === courses.current_page ? "page" : undefined} className={cn("grid h-10 w-10 place-items-center rounded-xl font-semibold", page === courses.current_page ? "fill-brand text-white" : "bg-surface text-ink-muted hover:text-ink")}>
              {page}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
