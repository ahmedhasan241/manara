import { Skeleton } from "@educloud/ui";
import { getT } from "@educloud/ui/locale";

/** Shown instantly while a page's data loads. */
export default async function Loading() {
  const t = await getT();
  return (
    <div aria-busy="true" aria-label={t("Loading")}>
      <Skeleton className="mb-2 h-4 w-28" />
      <Skeleton className="mb-8 h-9 w-72" />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-32 rounded-[var(--radius-card)]" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <Skeleton className="h-72 rounded-[var(--radius-card)]" />
        <Skeleton className="h-72 rounded-[var(--radius-card)]" />
      </div>
    </div>
  );
}
