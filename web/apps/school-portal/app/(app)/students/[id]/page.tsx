import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Award, BookOpen, CalendarCheck, CalendarX, CheckCircle2, GraduationCap, Layers, School, UserRound, XCircle } from "lucide-react";
import { ApiError, type ReportCard } from "@educloud/api-client";
import { Avatar, Badge, Card, EmptyState, FadeIn, Stagger, StaggerItem, cn } from "@educloud/ui";
import { getContext } from "@educloud/portal-kit/session";
import { getI18n, getT } from "@educloud/ui/locale";
import { Meter, ScoreRing } from "@/components/meter";
import { PrintButton } from "@/components/print-button";
import { attendanceLabel, attendanceTone, formatScore, isUniversity, pct, rateTone, round1, stageLabel, standingLabel, standingTone } from "@/lib/academic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  const { api } = await getContext();
  const card = await api.reportCard(Number((await params).id)).catch(() => null);
  return { title: card ? `${t("Report card")} · ${card.student.name}` : t("Report card") };
}

export default async function StudentReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const studentId = Number(id);
  if (!Number.isInteger(studentId) || studentId <= 0) notFound();
  const { api, workspace } = await getContext();
  const { t, fmt } = await getI18n();
  const card = await api.reportCard(studentId).catch((error) => {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403 || error.status === 422)) notFound();
    throw error;
  });
  const university = isUniversity(workspace.tenant.type);
  const scale = card.settings.grading_scale;
  const overall = card.overall;
  const group = card.class_group;
  const back = group ? { href: `/classes/${group.id}`, label: group.name } : { href: "/rankings", label: t("Rankings") };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={back.href} className="inline-flex items-center gap-1 text-sm font-semibold text-ink-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {back.label}
        </Link>
        <PrintButton />
      </div>

      <FadeIn>
        <div data-print-card className="band-peach relative mb-6 overflow-hidden rounded-[1.75rem] border border-brand-100 p-5 sm:p-7 dark:border-line">
          <div aria-hidden className="absolute -end-16 -top-20 h-60 w-60 rounded-full border-2 border-dashed border-brand-200 dark:border-brand-900 print:hidden" />
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-brand-700 shadow-[var(--shadow-soft)] dark:text-brand-300">
            <GraduationCap className="h-3.5 w-3.5" /> {t("Report card")} · {workspace.tenant.name}
          </p>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar name={card.student.name} size="lg" className="!h-16 !w-16 !text-xl" />
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{card.student.name}</h1>
              <p className="text-sm text-ink-muted">{card.student.email}</p>
              <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
                {group?.level && (
                  <span className="inline-flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-brand-600 dark:text-brand-300" /> {[stageLabel(t, group.level.stage), group.level.name, university ? group.level.department : null].filter(Boolean).join(" · ")}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <School className="h-4 w-4 text-brand-600 dark:text-brand-300" /> {group ? group.name : university ? t("No section") : t("No class")}
                  {group?.room && <span className="text-ink-muted">· {t("Room {room}", { room: group.room })}</span>}
                </span>
                {group?.advisor && (
                  <span className="inline-flex items-center gap-1.5">
                    <UserRound className="h-4 w-4 text-brand-600 dark:text-brand-300" /> {university ? t("Advisor: {name}", { name: group.advisor.name }) : t("Class teacher: {name}", { name: group.advisor.name })}
                  </span>
                )}
              </p>
            </div>
            <p className="text-xs text-ink-muted sm:self-start">{t("Issued {date}", { date: fmt.date(new Date()) })}</p>
          </div>
        </div>
      </FadeIn>

      {!overall ? (
        <EmptyState icon={<BookOpen className="h-6 w-6" />} title={t("No results yet")} description={t("This student has no graded subjects yet.")} />
      ) : (
        <>
          <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <Card data-print-card className="flex flex-col gap-5 shadow-[var(--shadow-soft)] sm:flex-row sm:items-center">
              <ScoreRing
                size="lg"
                value={scale === "gpa" ? (overall.gpa == null ? null : (overall.gpa / 4) * 100) : overall.average}
                label={formatScore(scale, overall.average, overall.gpa)}
                tone={overall.standing === "at_risk" ? "danger" : overall.standing === "warning" ? "warning" : overall.standing === "honors" ? "success" : "brand"}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink-muted">{scale === "gpa" ? t("Cumulative GPA") : t("Overall average")}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2">
                  {overall.letter && <span className="font-display text-3xl font-bold text-brand-700 dark:text-brand-300">{overall.letter}</span>}
                  <Badge tone={standingTone[overall.standing]}>{standingLabel(t, overall.standing)}</Badge>
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
                  {scale === "gpa" && overall.average != null && (
                    <div>
                      <dt className="text-xs text-ink-muted">{t("Average")}</dt>
                      <dd className="font-semibold tabular-nums">{pct(overall.average)}</dd>
                    </div>
                  )}
                  {(university || overall.credits > 0) && (
                    <div>
                      <dt className="text-xs text-ink-muted">{t("Credits earned")}</dt>
                      <dd className="font-semibold tabular-nums">
                        {overall.credits_earned} / {overall.credits}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs text-ink-muted">{t("Subjects")}</dt>
                    <dd className="font-semibold tabular-nums">{overall.courses}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-muted">{t("Failing")}</dt>
                    <dd className={cn("font-semibold tabular-nums", overall.failing > 0 && "text-danger")}>{overall.failing}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-muted">{t("Attendance")}</dt>
                    <dd className="font-semibold tabular-nums">{pct(overall.attendance_rate)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-muted">{t("Absences")}</dt>
                    <dd className="font-semibold tabular-nums">{overall.absences}</dd>
                  </div>
                </dl>
              </div>
            </Card>

            <Stagger className="grid grid-cols-3 gap-3">
              <RankTile label={university ? t("In section") : t("In class")} rank={card.ranks.group} />
              <RankTile label={university ? t("In year") : t("In level")} rank={card.ranks.level} />
              <RankTile label={university ? t("In university") : t("In school")} rank={card.ranks.school} />
            </Stagger>
          </div>

          <SubjectsTable card={card} university={university} />
        </>
      )}

      <section aria-labelledby="absences-heading" className="mt-8">
        <h2 id="absences-heading" className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
          <CalendarX className="h-5 w-5 text-brand-500" /> {t("Recent absences")}
        </h2>
        {card.absences.length === 0 ? (
          <Card data-print-card className="flex items-center gap-3 text-sm text-ink-muted">
            <CalendarCheck className="h-5 w-5 text-success" /> {t("No absences or late arrivals recorded.")}
          </Card>
        ) : (
          <Card data-print-card className="p-0">
            <ul className="divide-y divide-line">
              {card.absences.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
                  <Badge tone={a.status === "absent" ? "danger" : a.status === "late" ? "warning" : "neutral"}>{a.status === "absent" ? t("Absent") : a.status === "late" ? t("Late") : t("Excused")}</Badge>
                  <span className="font-semibold">{a.course?.subject ?? a.course?.title ?? "—"}</span>
                  {a.topic && <span className="text-ink-muted">{a.topic}</span>}
                  {a.note && <span className="text-xs italic text-ink-muted">“{a.note}”</span>}
                  <span className="ms-auto text-xs tabular-nums text-ink-muted">{a.date ? fmt.date(a.date) : "—"}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </>
  );
}

async function RankTile({ label, rank }: { label: string; rank: { rank: number | null; of: number } | null }) {
  const t = await getT();
  return (
    <StaggerItem>
      <Card data-print-card className="flex h-full flex-col items-center justify-center p-3 text-center shadow-[var(--shadow-soft)] sm:p-4">
        <Award className={cn("mb-1 h-5 w-5", rank?.rank === 1 ? "text-amber-400" : "text-brand-500")} />
        <p className="font-display text-2xl font-bold tabular-nums sm:text-3xl">{rank?.rank ? `#${rank.rank}` : "—"}</p>
        <p className="text-xs text-ink-muted">{rank && rank.of ? t("of {count}", { count: rank.of }) : t("Not ranked yet")}</p>
        <p className="mt-1 text-xs font-semibold">{label}</p>
      </Card>
    </StaggerItem>
  );
}

async function SubjectsTable({ card, university }: { card: ReportCard; university: boolean }) {
  const t = await getT();
  const scale = card.settings.grading_scale;

  return (
    <Card data-print-card className="overflow-x-auto p-0 shadow-[var(--shadow-soft)]">
      <table className="w-full min-w-[46rem] text-sm">
        <caption className="px-4 pt-4 text-start font-display text-lg font-bold">{t("Subjects")}</caption>
        <thead className="border-b border-line text-ink-muted">
          <tr>
            <th className="px-4 py-3 text-start font-medium">{t("Subject")}</th>
            {university && <th className="px-4 py-3 text-start font-medium">{t("Credits")}</th>}
            <th className="w-52 px-4 py-3 text-start font-medium">{t("Result")}</th>
            <th className="px-4 py-3 text-start font-medium">{t("Grade")}</th>
            <th className="px-4 py-3 text-start font-medium">{t("Pass / fail")}</th>
            <th className="px-4 py-3 text-start font-medium">{t("Attendance")}</th>
            <th className="px-4 py-3 text-start font-medium">{t("Rank")}</th>
          </tr>
        </thead>
        <tbody>
          {card.subjects.map((s) => {
            const pass = s.course.pass_percent ?? 50;
            return (
              <tr key={s.course.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/courses/${s.course.id}?tab=grades`} className="font-semibold hover:text-brand-600 dark:hover:text-brand-300">
                    {s.course.subject ?? s.course.title}
                  </Link>
                  <p className="text-xs text-ink-muted">{[s.course.code, s.course.teacher?.name].filter(Boolean).join(" · ")}</p>
                </td>
                {university && <td className="px-4 py-3 tabular-nums">{s.credit_hours ?? s.course.credit_hours ?? "—"}</td>}
                <td className="px-4 py-3">
                  <Meter
                    label={t("Pass mark {percent}%", { percent: pass })}
                    value={s.percent ?? null}
                    marker={pass}
                    tone={s.percent == null ? "neutral" : s.percent >= pass ? (s.percent >= 85 ? "success" : "brand") : "danger"}
                    display={s.percent == null ? "—" : `${round1(s.percent)}%${scale === "gpa" && s.points != null ? ` · ${s.points.toFixed(1)}` : ""}`}
                  />
                </td>
                <td className="px-4 py-3">{s.letter ? <Badge tone="brand">{s.letter}</Badge> : "—"}</td>
                <td className="px-4 py-3">
                  {s.passed == null ? (
                    <span className="text-ink-muted">{t("Not graded")}</span>
                  ) : s.passed ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-success">
                      <CheckCircle2 className="h-4 w-4" /> {t("Passed")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-semibold text-danger">
                      <XCircle className="h-4 w-4" /> {t("Failed")}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {s.attendance ? (
                    <span className="flex flex-col items-start gap-1">
                      <Badge tone={s.attendance.status === "ok" ? rateTone(s.attendance.rate) : attendanceTone[s.attendance.status]}>{pct(s.attendance.rate)}</Badge>
                      {s.attendance.status !== "ok" && <span className="text-[11px] text-ink-muted">{attendanceLabel(t, s.attendance.status)}</span>}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 tabular-nums">{s.rank ? t("{rank} of {count}", { rank: s.rank, count: s.of }) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
