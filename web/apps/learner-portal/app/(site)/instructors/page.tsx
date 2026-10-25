import Link from "next/link";
import { Search, SearchX } from "lucide-react";
import { Stagger, StaggerItem, Swoosh, asKey, buttonClass, cn, rich } from "@educloud/ui";
import { getT } from "@educloud/ui/locale";
import { InstructorCard } from "@/components/site/instructor-card";
import { getViewer } from "@/lib/viewer";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Teachers & doctors"), description: t("Teachers, lecturers and doctors who publish their courses on Manara.") };
}

type Kind = "school" | "university" | "teacher";
const KINDS: { value: Kind; label: "Schools" | "Universities" | "Independent teachers" }[] = [
  { value: "university", label: "Universities" },
  { value: "school", label: "Schools" },
  { value: "teacher", label: "Independent teachers" },
];

/** Every teacher, lecturer and doctor with a published course: search, filter by where they teach and by subject. */
export default async function InstructorsPage({ searchParams }: { searchParams: Promise<{ search?: string; type?: string; category?: string }> }) {
  const t = await getT();
  const { api } = await getViewer();
  const params = await searchParams;
  const type = KINDS.some((k) => k.value === params.type) ? (params.type as Kind) : undefined;
  const search = params.search?.trim() || undefined;
  const category = params.category || undefined;

  const [instructors, everyone] = await Promise.all([api.catalogInstructors({ search, type, category }), api.catalogInstructors()]);
  const categories = [...new Set(everyone.flatMap((i) => i.categories))].sort();

  // Builds a link that changes one filter and keeps the others.
  const href = (change: Record<string, string | undefined>) => {
    const query = new URLSearchParams(Object.entries({ search, type, category, ...change }).filter((e): e is [string, string] => !!e[1]));
    return `/instructors${query.size ? `?${query}` : ""}`;
  };
  const chip = (active: boolean) =>
    cn("press shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors", active ? "border-transparent bg-brand-600 text-white" : "border-line bg-surface text-ink-muted hover:border-brand-300 hover:text-ink");

  return (
    <>
      <section className="band-peach relative overflow-hidden">
        <div aria-hidden className="absolute -end-20 -top-24 h-72 w-72 rounded-full border-2 border-dashed border-brand-200 dark:border-brand-900" />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 pb-20 pt-14 text-center">
          <p className="mb-3 flex flex-col items-center gap-1 text-sm font-semibold text-brand-600 dark:text-brand-300">
            {t("{count} teachers & doctors", { count: everyone.length })}
            <Swoosh className="h-2 w-16" />
          </p>
          <h1 className="text-display-lg font-display font-bold">{rich(t("Meet your <hl>teachers & doctors</hl>"), { hl: (w) => <span className="text-marked">{w}</span> })}</h1>
          <p className="mt-3 text-lg text-ink-muted">{t("Teachers, lecturers and doctors who publish their courses on Manara.")}</p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <form action="/instructors" className="relative mx-auto -mt-7 flex max-w-2xl items-center gap-2 rounded-full border border-line bg-surface p-2 ps-5 shadow-[var(--shadow-lift)] focus-within:border-brand-300">
          <Search className="h-5 w-5 shrink-0 text-ink-muted" />
          <input name="search" defaultValue={search} placeholder={t("Search by name or subject…")} aria-label={t("Search by name or subject…")} className="h-11 min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-muted/70" />
          {type && <input type="hidden" name="type" value={type} />}
          {category && <input type="hidden" name="category" value={category} />}
          <button type="submit" className={cn(buttonClass("primary"), "!rounded-full px-6")}>
            {t("Search")}
          </button>
        </form>

        <nav aria-label={t("Categories")} className="mt-10 space-y-3">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0">
            <Link href={href({ type: undefined })} className={chip(!type)} aria-current={!type || undefined}>
              {t("All teachers")}
            </Link>
            {KINDS.map((k) => (
              <Link key={k.value} href={href({ type: k.value })} className={chip(type === k.value)} aria-current={type === k.value || undefined}>
                {t(k.label)}
              </Link>
            ))}
          </div>
          {categories.length > 1 && (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0">
              <Link href={href({ category: undefined })} className={cn(chip(!category), "py-1.5 text-xs")}>
                {t("All")}
              </Link>
              {categories.map((c) => (
                <Link key={c} href={href({ category: c })} className={cn(chip(category === c), "py-1.5 text-xs")}>
                  {t(asKey(c))}
                </Link>
              ))}
            </div>
          )}
        </nav>

        {instructors.length > 0 ? (
          <Stagger className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {instructors.map((instructor) => (
              <StaggerItem key={instructor.id} className="h-full">
                <InstructorCard instructor={instructor} />
              </StaggerItem>
            ))}
          </Stagger>
        ) : (
          <div className="mx-auto mt-10 flex max-w-md flex-col items-center gap-4 rounded-[1.5rem] border border-dashed border-line bg-surface p-10 text-center text-ink-muted">
            <SearchX className="h-10 w-10 text-brand-400" />
            {t("No teachers match your search.")}
            <Link href="/instructors" className={buttonClass("secondary")}>
              {t("All teachers")}
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
