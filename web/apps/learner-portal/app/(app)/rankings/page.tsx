import Link from "next/link";
import { Crown, Lock, Medal, School, Sparkles, Trophy, Users } from "lucide-react";
import { ApiError, type RankingRow, type RankingScope, type Rankings } from "@educloud/api-client";
import { Avatar, Card, EmptyState, FadeIn, HeroBanner, SectionHeading, Stagger, StaggerItem, Tabs, buttonClass, cn, firstName } from "@educloud/ui";
import { requireAudience } from "@educloud/portal-kit/session";
import { getI18n, getT } from "@educloud/ui/locale";
import { formatScore, loadReportCard } from "@/lib/academics";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Honor roll") };
}

type Scope = Extract<RankingScope, "school" | "level" | "group">;

/**
 * The honor roll: the top students in the school, the year or the class, a
 * podium for the first three, and where the student stands. Students and
 * parents only ever see what the school chooses to share.
 */
export default async function RankingsPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const { api, workspace } = await requireAudience("learner", "/staff-account");
  const { t, fmt } = await getI18n();
  const isParent = workspace.role === "parent";
  const card = await loadReportCard(() => api.reportCard());

  if (!card) {
    return <EmptyState icon={<Trophy className="h-6 w-6" />} title={isParent ? t("No student linked yet") : t("No rankings yet")} description={isParent ? t("Ask the school office to link your child to your account. Their grades and attendance will appear here.") : undefined} />;
  }
  if (!card.settings.rankings_visible) return <Private />;

  const child = isParent ? firstName(card.student.name) : null;
  const group = card.class_group;
  const scopes: { key: Scope; id?: string; label: string; icon: React.ReactNode }[] = [
    { key: "school", label: t("Whole school"), icon: <School className="h-4 w-4" /> },
    ...(group?.level ? [{ key: "level" as const, id: group.level.id, label: group.level.name, icon: <Trophy className="h-4 w-4" /> }] : []),
    ...(group ? [{ key: "group" as const, id: group.id, label: group.name, icon: <Users className="h-4 w-4" /> }] : []),
  ];
  const requested = (await searchParams).scope;
  const scope = scopes.find((s) => s.key === requested) ?? scopes[0]!;

  let rankings: Rankings;
  try {
    rankings = await api.rankings({ scope: scope.key, id: scope.id });
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) return <Private />;
    throw error;
  }

  const scale = rankings.grading_scale;
  const me = rankings.me;
  const podium = rankings.rows.filter((r) => r.rank != null && r.rank <= 3).slice(0, 3);
  const onRoll = !!me && rankings.rows.some((r) => r.student_id === me.student_id);
  const isMe = (row: RankingRow) => !!me && row.student_id === me.student_id;

  return (
    <>
      <FadeIn>
        <HeroBanner
          eyebrow={
            <>
              <Trophy className="h-3.5 w-3.5" /> {workspace.tenant.name}
            </>
          }
          title={t("Honor roll")}
          subtitle={t("Celebrating the top {count} students. Hard work shows!", { count: card.settings.rankings_top })}
        />
      </FadeIn>

      <Tabs id="rankings-scope" active={scope.key} tabs={scopes.map((s) => ({ key: s.key, label: s.label, href: `?scope=${s.key}`, icon: s.icon }))} />

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          {rankings.rows.length === 0 ? (
            <EmptyState icon={<Trophy className="h-6 w-6" />} title={t("No rankings yet")} description={t("The honor roll fills in once grades are posted.")} />
          ) : (
            <>
              {podium.length > 0 && <Podium rows={podium} scale={scale} isMe={isMe} />}

              <section aria-labelledby="list-heading">
                <SectionHeading title={<span id="list-heading">{t("Top {count}", { count: rankings.rows.length })}</span>} description={rankings.label} />
                <Card className="p-2 shadow-[var(--shadow-soft)]">
                  <Stagger as="ol" className="divide-y divide-line">
                    {rankings.rows.map((row) => (
                      <StaggerItem as="li" key={row.student_id} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5", isMe(row) && "bg-peach/70 dark:bg-brand-500/10")}>
                        <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg font-display text-sm font-bold tabular-nums", row.rank != null && row.rank <= 3 ? "bg-brand-600 text-white" : "bg-surface-3 text-ink-muted")}>{row.rank ?? "—"}</span>
                        <Avatar name={row.name} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">
                            {row.name} {isMe(row) && <span className="text-xs font-bold text-brand-700 dark:text-brand-300">{child ? t("(your child)") : t("(you)")}</span>}
                          </span>
                          {row.class_group && <span className="block truncate text-xs text-ink-muted">{row.class_group}</span>}
                        </span>
                        {row.letter && <span className="hidden rounded-md bg-surface-3 px-1.5 py-0.5 text-xs font-bold sm:inline">{row.letter}</span>}
                        <span className="w-16 text-end font-display font-bold tabular-nums">{formatScore(row, scale, fmt)}</span>
                      </StaggerItem>
                    ))}
                  </Stagger>
                </Card>
              </section>
            </>
          )}
        </div>

        <aside>
          <FadeIn delay={0.1}>
            <Card className="relative overflow-hidden shadow-[var(--shadow-soft)] xl:sticky xl:top-24">
              <div aria-hidden className="absolute -end-10 -top-10 h-32 w-32 rounded-full bg-brand-500/10" />
              <p className="relative text-sm font-semibold text-ink-muted">{child ? t("{name}'s place", { name: child }) : t("Your place")}</p>
              {me?.rank != null ? (
                <>
                  <p className="relative mt-2 font-display text-4xl font-bold tabular-nums text-brand-700 dark:text-brand-300">
                    {t("#{rank} of {total}", { rank: me.rank, total: rankings.total })}
                  </p>
                  <p className="relative mt-1 text-sm text-ink-muted">
                    {scale === "gpa" ? t("GPA") : t("Average")}: <span className="font-semibold text-ink">{formatScore(me, scale, fmt)}</span>
                    {me.letter && ` · ${me.letter}`}
                  </p>
                  <p className="relative mt-4 flex gap-2 rounded-xl bg-surface-2 p-3 text-sm">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                    {onRoll
                      ? child
                        ? t("{name} is on the honor roll. Something to celebrate together!", { name: child })
                        : t("You're on the honor roll. Amazing work!")
                      : child
                        ? t("Every grade counts. A little steady effort can move {name} up the list.", { name: child })
                        : t("Every grade counts. Keep going and you can climb the list!")}
                  </p>
                </>
              ) : (
                <p className="relative mt-2 text-sm text-ink-muted">{child ? t("{name} will get a place once their first grades are posted.", { name: child }) : t("You'll get a place once your first grades are posted.")}</p>
              )}
              <Link href="/report-card" className={cn(buttonClass("soft"), "relative mt-4 w-full")}>
                {isParent ? t("Report card") : t("My grades")}
              </Link>
            </Card>
          </FadeIn>
        </aside>
      </div>
    </>
  );
}

/** First, second and third place, with first in the middle. */
async function Podium({ rows, scale, isMe }: { rows: RankingRow[]; scale: Rankings["grading_scale"]; isMe: (row: RankingRow) => boolean }) {
  const { t, fmt } = await getI18n();
  const byRank = (n: number) => rows.find((r) => r.rank === n);
  const places = [byRank(2), byRank(1), byRank(3)].filter((r): r is RankingRow => !!r);
  const looks: Record<number, { step: string; ring: string; icon: React.ReactNode }> = {
    1: { step: "h-32 sm:h-36 bg-brand-600 text-white", ring: "ring-brand-400", icon: <Crown className="h-5 w-5 text-amber-400" /> },
    2: { step: "h-24 sm:h-28 bg-peach text-brand-700 dark:text-brand-300", ring: "ring-brand-200", icon: <Medal className="h-5 w-5 text-slate-400" /> },
    3: { step: "h-20 sm:h-24 bg-blush text-brand-700 dark:text-brand-300", ring: "ring-brand-200", icon: <Medal className="h-5 w-5 text-amber-700" /> },
  };

  return (
    <section aria-label={t("Top three")} className="mb-10">
      <Stagger className="mx-auto flex max-w-xl items-end justify-center gap-2 sm:gap-4">
        {places.map((row) => {
          const look = looks[row.rank!]!;
          return (
            <StaggerItem key={row.student_id} className="flex min-w-0 flex-1 flex-col items-center">
              {look.icon}
              <Avatar name={row.name} size="lg" className={cn("mt-1 ring-4", look.ring, isMe(row) && "ring-brand-600")} />
              <p className="mt-2 w-full truncate text-center text-sm font-semibold">{firstName(row.name)}</p>
              <p className="mb-2 text-xs font-bold tabular-nums text-ink-muted">{formatScore(row, scale, fmt)}</p>
              <div className={cn("grid w-full place-items-center rounded-t-2xl font-display text-3xl font-bold shadow-[var(--shadow-soft)]", look.step)}>{row.rank}</div>
            </StaggerItem>
          );
        })}
      </Stagger>
    </section>
  );
}

async function Private() {
  const t = await getT();
  return (
    <EmptyState
      icon={<Lock className="h-6 w-6" />}
      title={t("Rankings are private at this school")}
      description={t("Your school has chosen not to share rankings. Your own grades are always on your report card.")}
      action={
        <Link href="/report-card" className={buttonClass("secondary")}>
          {t("Open report card")}
        </Link>
      }
    />
  );
}
