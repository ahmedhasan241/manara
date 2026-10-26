import Link from "next/link";
import { Crown, Info, Trophy, Users } from "lucide-react";
import type { RankingRow, Rankings } from "@educloud/api-client";
import { Avatar, Badge, Card, EmptyState, PageHeader, Stagger, StaggerItem, cn } from "@educloud/ui";
import { getContext } from "@educloud/portal-kit/session";
import { getI18n, getT } from "@educloud/ui/locale";
import { ScopeFilter } from "@/components/scope-filter";
import { formatScore, isUniversity, pct, rateTone, standingLabel, standingTone } from "@/lib/academic";
import { parseScope, scopeOptions } from "@/lib/scope";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Rankings") };
}

/** Rows that share a rank with another row. */
const tiedRanks = (rows: RankingRow[]) => {
  const counts = new Map<number, number>();
  for (const r of rows) if (r.rank != null) counts.set(r.rank, (counts.get(r.rank) ?? 0) + 1);
  return new Set([...counts].filter(([, n]) => n > 1).map(([rank]) => rank));
};

export default async function RankingsPage({ searchParams }: { searchParams: Promise<{ scope?: string; id?: string }> }) {
  const { scope, id } = parseScope(await searchParams);
  const { api, workspace } = await getContext();
  const { t } = await getI18n();
  const [rankings, structure, courses] = await Promise.all([
    api.rankings({ scope, id }).catch(() => null),
    api.academicStructure().catch(() => null),
    api.courses({}).catch(() => ({ data: [] })),
  ]);
  const university = isUniversity(structure?.type ?? workspace.tenant.type);
  const options = scopeOptions(structure, courses.data);

  return (
    <>
      <PageHeader
        icon={<Trophy />}
        eyebrow={rankings?.label ?? workspace.tenant.name}
        title={t("Rankings")}
        description={rankings?.grading_scale === "gpa" ? t("Students ranked by GPA. Equal results share a rank.") : t("Students ranked by their average. Equal results share a rank.")}
        meta={
          rankings && (
            <>
              <Badge>
                <Users className="h-3.5 w-3.5" /> {t("{count} students", { count: rankings.total })}
              </Badge>
              {structure && (
                <Badge tone="brand">
                  <Info className="h-3.5 w-3.5" /> {structure.settings.rankings_visible ? t("Students see the top {count}", { count: structure.settings.rankings_top }) : t("Only staff can see rankings")}
                </Badge>
              )}
            </>
          )
        }
        toolbar={<ScopeFilter scope={scope} id={id} options={options} university={university} />}
      />

      {!rankings ? (
        <EmptyState icon={<Trophy className="h-6 w-6" />} title={t("Rankings are not available")} description={t("Pick another scope, or check back once grades are in.")} />
      ) : (
        <RankingsBody rankings={rankings} />
      )}
    </>
  );
}

async function RankingsBody({ rankings }: { rankings: Rankings }) {
  const t = await getT();
  const scale = rankings.grading_scale;
  const ranked = rankings.rows.filter((r) => r.rank != null);
  const unranked = rankings.rows.filter((r) => r.rank == null);
  const ties = tiedRanks(ranked);
  const podium = ranked.slice(0, 3);
  // Visual order: 2nd, 1st, 3rd.
  const order = podium.length === 3 ? [podium[1]!, podium[0]!, podium[2]!] : podium.length === 2 ? [podium[1]!, podium[0]!] : podium;

  if (rankings.rows.length === 0) {
    return <EmptyState icon={<Users className="h-6 w-6" />} title={t("No students here yet")} description={t("Rankings appear once students are enrolled and graded.")} />;
  }

  return (
    <div className="space-y-8">
      {podium.length > 0 && (
        <section aria-label={t("Top three")} className="relative overflow-hidden rounded-[1.75rem] border border-line bg-surface px-4 pb-0 pt-8 shadow-[var(--shadow-soft)] sm:px-8">
          <div aria-hidden className="absolute -top-24 start-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-brand-500/10 blur-3xl rtl:translate-x-1/2" />
          <Stagger as="ol" className="relative mx-auto flex max-w-2xl items-end justify-center gap-2 sm:gap-5">
            {order.map((row) => {
              const place = row.rank ?? 1;
              const height = place === 1 ? "h-36 sm:h-44" : place === 2 ? "h-28 sm:h-32" : "h-20 sm:h-24";
              const tint = place === 1 ? "bg-amber-400 text-amber-950" : place === 2 ? "bg-slate-300 text-slate-800" : "bg-orange-300 text-orange-950";
              return (
                <StaggerItem as="li" key={row.student_id} className="flex min-w-0 flex-1 flex-col items-center">
                  <Link href={`/students/${row.student_id}`} className="group flex w-full flex-col items-center text-center">
                    <span className="relative mb-2">
                      {place === 1 && <Crown className="absolute -top-5 start-1/2 h-5 w-5 -translate-x-1/2 text-amber-400 rtl:translate-x-1/2" />}
                      <Avatar name={row.name} size="lg" className={cn("ring-4 transition group-hover:scale-105", place === 1 ? "!h-16 !w-16 ring-amber-300/70" : "ring-surface-3")} />
                    </span>
                    <span className="line-clamp-2 max-w-full px-1 text-xs font-semibold leading-tight sm:text-sm">{row.name}</span>
                    <span className="mt-0.5 font-display text-base font-bold tabular-nums text-brand-700 sm:text-lg dark:text-brand-300">{formatScore(scale, row.average, row.gpa)}</span>
                    {row.class_group && <span className="max-w-full truncate text-[11px] text-ink-muted">{row.class_group}</span>}
                    <span className={cn("mt-2 flex w-full flex-col items-center justify-start rounded-t-2xl pt-3 font-display font-bold", height, tint)}>
                      <span className="text-2xl sm:text-3xl">{place}</span>
                      {ties.has(place) && <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{t("Tied")}</span>}
                    </span>
                  </Link>
                </StaggerItem>
              );
            })}
          </Stagger>
        </section>
      )}

      <Card className="overflow-x-auto p-0 shadow-[var(--shadow-soft)]">
        <table className="w-full min-w-[46rem] text-sm">
          <caption className="px-4 pt-4 text-start font-display font-bold">{rankings.label}</caption>
          <thead className="border-b border-line text-ink-muted">
            <tr>
              <th className="w-16 px-4 py-3 text-start font-medium">{t("Rank")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("Student")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("Class")}</th>
              <th className="px-4 py-3 text-start font-medium">{scale === "gpa" ? t("GPA") : t("Average")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("Grade")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("Attendance")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("Standing")}</th>
            </tr>
          </thead>
          <tbody>
            {[...ranked, ...unranked].map((row) => (
              <tr key={row.student_id} className={cn("border-b border-line transition last:border-0 hover:bg-surface-2", row.rank == null && "text-ink-muted")}>
                <td className="px-4 py-3">
                  {row.rank == null ? (
                    <span>—</span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <span className={cn("grid h-8 min-w-8 place-items-center rounded-full px-1.5 font-display text-sm font-bold tabular-nums", row.rank === 1 ? "bg-amber-400 text-amber-950" : row.rank === 2 ? "bg-slate-300 text-slate-800" : row.rank === 3 ? "bg-orange-300 text-orange-950" : "bg-surface-3")}>
                        {row.rank}
                      </span>
                      {ties.has(row.rank) && <span className="text-[10px] font-semibold uppercase text-ink-muted" title={t("Tied")}>=</span>}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/students/${row.student_id}`} className="flex items-center gap-3 font-semibold text-ink hover:text-brand-600 dark:hover:text-brand-300">
                    <Avatar name={row.name} size="sm" />
                    <span className="truncate">{row.name}</span>
                  </Link>
                </td>
                <td className="px-4 py-3">{row.class_group ?? "—"}</td>
                <td className="px-4 py-3 font-semibold tabular-nums">{formatScore(scale, row.average, row.gpa)}</td>
                <td className="px-4 py-3">{row.letter ? <Badge tone="brand">{row.letter}</Badge> : "—"}</td>
                <td className="px-4 py-3">{row.attendance_rate == null ? "—" : <Badge tone={rateTone(row.attendance_rate)}>{pct(row.attendance_rate)}</Badge>}</td>
                <td className="px-4 py-3">{row.rank == null ? <Badge>{t("Not ranked yet")}</Badge> : row.standing ? <Badge tone={standingTone[row.standing]}>{standingLabel(t, row.standing)}</Badge> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {unranked.length > 0 && (
        <p className="flex items-center gap-2 text-sm text-ink-muted">
          <Info className="h-4 w-4 shrink-0" /> {t("Students with no graded work yet are listed last and not ranked.")}
        </p>
      )}
    </div>
  );
}
