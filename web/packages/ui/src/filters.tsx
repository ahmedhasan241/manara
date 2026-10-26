"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { ChevronDown, Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "./components";
import { Select } from "./select";
import { useT } from "./i18n-provider";

/*
 * One way to search and filter a list, on every page: a toolbar holding a
 * search field that updates the results as you type, chip and select
 * filters, a "Clear filters" link and the page's actions. Everything lives in
 * the URL, so filtered views can be shared and the back button works.
 */

/** The current URL with some params changed (empty values removed, paging reset). */
function useHref() {
  const pathname = usePathname();
  const current = useSearchParams();
  return (changes: Record<string, string | undefined>) => {
    const params = new URLSearchParams(current.toString());
    params.delete("page");
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };
}

/**
 * The toolbar: search and dropdown filters on one row with the actions at
 * the end, and a summary line underneath.
 */
export function FilterBar({ search, filters, chips, actions, summary, className }: {
  search?: ReactNode;
  /** Selects and other compact controls beside the search. */
  filters?: ReactNode;
  /** A row of FilterChips under the search. */
  chips?: ReactNode;
  /** Buttons at the end of the row (create, export…). */
  actions?: ReactNode;
  /** A line under everything, e.g. "12 results · Clear filters". */
  summary?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 space-y-3", className)}>
      {(search || filters || chips || actions) && (
        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
          {search && <div className="min-w-0 sm:min-w-64 sm:flex-1 lg:max-w-md">{search}</div>}
          {(filters || chips) && (
            <div className="flex flex-wrap items-center gap-2 max-sm:[&>*]:w-full">
              {chips}
              {filters}
            </div>
          )}
          {actions && <div className="flex flex-wrap items-center gap-2 sm:ms-auto">{actions}</div>}
        </div>
      )}
      {summary && <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">{summary}</div>}
    </div>
  );
}

const fieldShell = "flex h-11 items-center rounded-xl border border-line bg-surface shadow-[var(--shadow-soft)] transition focus-within:border-brand-500 focus-within:ring-3 focus-within:ring-brand-500/15 hover:border-ink-muted/40";

function SearchFieldInner({ param, placeholder, label, autoFocus }: { param: string; placeholder: string; label: string; autoFocus?: boolean }) {
  const t = useT();
  const router = useRouter();
  const href = useHref();
  const current = useSearchParams().get(param) ?? "";
  const [value, setValue] = useState(current);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Follow the URL when it changes from outside (back button, "Clear filters").
  useEffect(() => {
    if (document.activeElement !== input.current) setValue(current);
  }, [current]);

  // "/" jumps to the search, as on most sites.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (event.key !== "/" || event.metaKey || event.ctrlKey || target.closest("input, textarea, select, [contenteditable=true]")) return;
      event.preventDefault();
      input.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function apply(next: string, delay: number) {
    setValue(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => start(() => router.replace(href({ [param]: next.trim() || undefined }), { scroll: false })), delay);
  }

  return (
    <form
      role="search"
      className={cn(fieldShell, "relative w-full")}
      onSubmit={(event) => {
        event.preventDefault();
        apply(value, 0);
      }}
    >
      <span className="grid w-10 shrink-0 place-items-center text-ink-muted">
        {pending ? <Loader2 className="h-4 w-4 animate-spin text-brand-500" /> : <Search className="h-4 w-4" />}
      </span>
      <input
        ref={input}
        type="search"
        name={param}
        value={value}
        autoFocus={autoFocus}
        onChange={(event) => apply(event.target.value, 300)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && value) {
            event.preventDefault();
            apply("", 0);
          }
        }}
        placeholder={placeholder}
        aria-label={label}
        className="h-full min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted/70 [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button type="button" onClick={() => apply("", 0)} className="me-1.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-muted transition hover:bg-surface-3 hover:text-ink" aria-label={t("Clear search")}>
          <X className="h-4 w-4" />
        </button>
      ) : (
        <kbd className="me-2.5 hidden h-6 min-w-6 place-items-center rounded-md border border-line bg-surface-2 px-1.5 text-[11px] font-semibold text-ink-muted sm:grid" aria-hidden>
          /
        </kbd>
      )}
    </form>
  );
}

/** Search that filters as you type (after a short pause), clears with Esc or ×, and focuses with "/". */
export function SearchField({ param = "search", placeholder, label, autoFocus }: { param?: string; placeholder: string; label?: string; autoFocus?: boolean }) {
  const fallback = (
    <div className={cn(fieldShell, "w-full")}>
      <span className="grid w-10 place-items-center text-ink-muted">
        <Search className="h-4 w-4" />
      </span>
      <span className="text-sm text-ink-muted/70">{placeholder}</span>
    </div>
  );
  return (
    <Suspense fallback={fallback}>
      <SearchFieldInner param={param} placeholder={placeholder} label={label ?? placeholder} autoFocus={autoFocus} />
    </Suspense>
  );
}

export interface FilterOption {
  /** Undefined for the "all" option. */
  value?: string;
  label: string;
  count?: number;
  icon?: ReactNode;
  /** Colours the chip's dot or count, e.g. danger for "Over the limit". */
  tone?: "danger" | "warning" | "success";
}

function FilterSelectInner({ param, label, options, allLabel, allCount, className }: { param: string; label: string; options: FilterOption[]; allLabel: string; allCount?: number; className?: string }) {
  const router = useRouter();
  const href = useHref();
  const value = useSearchParams().get(param) ?? "";
  const [pending, start] = useTransition();

  return (
    <Select
      aria-label={label}
      value={value}
      onChange={(event) => start(() => router.replace(href({ [param]: event.target.value || undefined }), { scroll: false }))}
      items={[{ value: "", label: allLabel, count: allCount }, ...options.filter((o) => o.value).map((o) => ({ value: o.value!, label: o.label, icon: o.icon, count: o.count, tone: o.tone }))]}
      prefix={`${label}:`}
      icon={pending ? <Loader2 className="animate-spin text-brand-500" /> : <SlidersHorizontal />}
      className={cn("sm:w-auto sm:min-w-44 [&>button]:h-11 [&>button]:rounded-xl [&>button]:shadow-[var(--shadow-soft)]", value && "[&>button]:border-brand-300 [&>button]:bg-brand-500/5", className)}
    />
  );
}

/** A dropdown filter that reads "Status: Active", searches its options, clears with ×, and applies on change. */
export function FilterSelect(props: { param: string; label: string; options: FilterOption[]; allLabel: string; allCount?: number; className?: string }) {
  return (
    <Suspense fallback={<div className={cn(fieldShell, "w-44")} />}>
      <FilterSelectInner {...props} />
    </Suspense>
  );
}

/**
 * A filter given as a list of options with an "all" entry (the option without
 * a value), shown as the same dropdown as FilterSelect, with counts.
 */
export function FilterChips({ param, options, label, className }: { param: string; options: FilterOption[]; label: string; className?: string }) {
  const all = options.find((o) => !o.value);
  return <FilterSelect param={param} label={label} options={options} allLabel={all?.label ?? label} allCount={all?.count} className={className} />;
}

function PaginationInner({ page, pages, total }: { page: number; pages: number; total?: number }) {
  const t = useT();
  const href = useHref();
  const link = (n: number) => href({ page: n > 1 ? String(n) : undefined });
  const step = "inline-flex h-9 items-center gap-1 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-ink transition hover:border-ink-muted/40";

  return (
    <nav aria-label={t("Pages")} className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
      <span className="text-ink-muted">
        {t("Page {page} of {pages}", { page, pages })}
        {total !== undefined && ` · ${total}`}
      </span>
      <span className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={link(page - 1)} scroll={false} className={step} rel="prev">
            <ChevronDown className="h-4 w-4 rotate-90 rtl:-rotate-90" /> {t("Previous")}
          </Link>
        ) : (
          <span className={cn(step, "pointer-events-none opacity-40")} aria-disabled>
            <ChevronDown className="h-4 w-4 rotate-90 rtl:-rotate-90" /> {t("Previous")}
          </span>
        )}
        {page < pages ? (
          <Link href={link(page + 1)} scroll={false} className={step} rel="next">
            {t("Next")} <ChevronDown className="h-4 w-4 -rotate-90 rtl:rotate-90" />
          </Link>
        ) : (
          <span className={cn(step, "pointer-events-none opacity-40")} aria-disabled>
            {t("Next")} <ChevronDown className="h-4 w-4 -rotate-90 rtl:rotate-90" />
          </span>
        )}
      </span>
    </nav>
  );
}

/** Previous / next for a paginated list, keeping the current filters. Hidden when there's one page. */
export function Pagination({ page, pages, total }: { page: number; pages: number; total?: number }) {
  if (pages <= 1) return null;
  return (
    <Suspense fallback={null}>
      <PaginationInner page={page} pages={pages} total={total} />
    </Suspense>
  );
}

function ClearFiltersInner({ params }: { params: string[] }) {
  const t = useT();
  const href = useHref();
  const current = useSearchParams();
  if (!params.some((p) => current.get(p))) return null;
  return (
    <Link href={href(Object.fromEntries(params.map((p) => [p, undefined])))} scroll={false} className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline dark:text-brand-300">
      <X className="h-3.5 w-3.5" /> {t("Clear filters")}
    </Link>
  );
}

/** "× Clear filters", shown only while one of `params` is set. */
export function ClearFilters({ params }: { params: string[] }) {
  return (
    <Suspense fallback={null}>
      <ClearFiltersInner params={params} />
    </Suspense>
  );
}
