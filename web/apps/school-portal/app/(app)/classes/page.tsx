import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, Building2, CalendarCheck, DoorOpen, Layers, Plus, School, Settings2, Trophy, UserRound, Users } from "lucide-react";
import type { AcademicLevel, AcademicStage } from "@educloud/api-client";
import { Alert, Badge, Card, EmptyState, FadeIn, HeroBanner, SectionHeading, Stagger, StaggerItem, bannerButtonClass, buttonClass, cn } from "@educloud/ui";
import { getContext } from "@educloud/portal-kit/session";
import { getI18n, getT } from "@educloud/ui/locale";
import { AcademicSettingsForm, ClassDialog, DeleteStructure, LevelDialog, StructureButton } from "@/components/structure-editor";
import { STAGES, isUniversity, stageLabel } from "@/lib/academic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Classes & levels") };
}

/**
 * The school's structure: stages → levels (grades / years) → classes
 * (sections). Owners and admins edit it; teachers can look.
 */
export default async function ClassesPage() {
  const { api, can, workspace } = await getContext();
  if (!can("courses.manage") && !can("members.manage")) notFound();
  const { t } = await getI18n();
  const canManage = can("members.manage");
  const [structure, advisors] = await Promise.all([
    api.academicStructure(),
    canManage ? api.members({ role: "teacher" }).then((r) => r.data.map((m) => ({ id: m.user.id, name: m.user.name }))).catch(() => []) : Promise.resolve([]),
  ]);
  const university = isUniversity(structure.type);
  const stages: AcademicStage[] = structure.stages?.length ? structure.stages : STAGES;
  const classes = structure.levels.reduce((sum, l) => sum + l.groups.length, 0);
  const nextPosition = Math.max(0, ...structure.levels.map((l) => l.position + 1));

  // Group levels by stage, in the stage order, then (for universities) by department.
  const byStage = STAGES.map((stage) => ({ stage, levels: structure.levels.filter((l) => l.stage === stage).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)) })).filter((g) => g.levels.length > 0);

  return (
    <>
      <FadeIn>
        <HeroBanner
          eyebrow={
            <>
              <School className="h-3.5 w-3.5" /> {workspace.tenant.name}
            </>
          }
          title={university ? t("Years & sections") : t("Classes & levels")}
          subtitle={
            university
              ? t("Organise your departments into years and sections, assign advisors, and see how each section is doing.")
              : t("Organise your school into grades and classes, assign class teachers, and see how each class is doing.")
          }
          meta={
            <>
              <span className="inline-flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-brand-600 dark:text-brand-300" /> {university ? t("Years: {count}", { count: structure.levels.length }) : t("Levels: {count}", { count: structure.levels.length })}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <DoorOpen className="h-4 w-4 text-brand-600 dark:text-brand-300" /> {university ? t("Sections: {count}", { count: classes }) : t("Classes: {count}", { count: classes })}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4 text-brand-600 dark:text-brand-300" /> {t("{count} students", { count: structure.students_count })}
              </span>
            </>
          }
          actions={
            <>
              {canManage && (
                <LevelDialog stages={stages} university={university} nextPosition={nextPosition}>
                  <button type="button" className={bannerButtonClass()}>
                    <Plus className="h-4 w-4" /> {university ? t("Add a year") : t("Add a level")}
                  </button>
                </LevelDialog>
              )}
              <Link href="/rankings" className={bannerButtonClass(canManage ? "outline" : "solid")}>
                <Trophy className="h-4 w-4" /> {t("Rankings")}
              </Link>
              <Link href="/attendance" className={bannerButtonClass("outline")}>
                <CalendarCheck className="h-4 w-4" /> {t("Attendance")}
              </Link>
            </>
          }
        />
      </FadeIn>

      {structure.unassigned_students > 0 && (
        <div className="mb-6">
          <Alert tone="warning">
            {university
              ? t("Students without a section: {count}. Open a section to assign them.", { count: structure.unassigned_students })
              : t("Students without a class: {count}. Open a class to assign them.", { count: structure.unassigned_students })}
          </Alert>
        </div>
      )}

      {byStage.length === 0 ? (
        <EmptyState
          icon={<School className="h-6 w-6" />}
          title={university ? t("No years yet") : t("No levels yet")}
          description={university ? t("Add your first year of study, then its sections.") : t("Add your first grade or level, then its classes.")}
          action={
            canManage && (
              <LevelDialog stages={stages} university={university} nextPosition={nextPosition}>
                <button type="button" className={buttonClass("primary", "sm")}>
                  <Plus className="h-4 w-4" /> {university ? t("Add a year") : t("Add a level")}
                </button>
              </LevelDialog>
            )
          }
        />
      ) : (
        <div className="space-y-10">
          {byStage.map(({ stage, levels }) => (
            <section key={stage} aria-labelledby={`stage-${stage}`}>
              <SectionHeading title={<span id={`stage-${stage}`}>{stageLabel(t, stage)}</span>} description={university ? t("Years: {count}", { count: levels.length }) : t("Levels: {count}", { count: levels.length })} />
              <div className="space-y-5">
                {levels.map((level) => (
                  <LevelCard key={level.id} level={level} canManage={canManage} university={university} stages={stages} advisors={advisors} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {can("tenant.manage") && (
        <section aria-labelledby="settings-heading" className="mt-12">
          <SectionHeading title={<span id="settings-heading">{t("Grading & attendance rules")}</span>} description={t("How results are shown and when absences trigger a warning.")} />
          <Card className="p-5 shadow-[var(--shadow-soft)]">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/12 text-brand-700 dark:text-brand-300">
                <Settings2 className="h-5 w-5" />
              </span>
              <p className="text-sm text-ink-muted">{t("These apply to every subject in {name}.", { name: workspace.tenant.name })}</p>
            </div>
            <AcademicSettingsForm settings={structure.settings} />
          </Card>
        </section>
      )}
    </>
  );
}

async function LevelCard({ level, canManage, university, stages, advisors }: { level: AcademicLevel; canManage: boolean; university: boolean; stages: AcademicStage[]; advisors: { id: number; name: string }[] }) {
  const t = await getT();
  const students = level.groups.reduce((sum, g) => sum + (g.students_count ?? 0), 0);
  const { groups, ...rest } = level;

  return (
    <Card className="p-4 shadow-[var(--shadow-soft)] sm:p-5">
      <div className="mb-4 flex flex-wrap items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl fill-brand text-white">
          <Layers className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-bold text-heading">{level.name}</h3>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
            {university && level.department && (
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" /> {level.department}
              </span>
            )}
            <span>{university ? t("Sections: {count}", { count: groups.length }) : t("Classes: {count}", { count: groups.length })}</span>
            <span>{t("{count} students", { count: students })}</span>
            {level.courses_count != null && <span>{t("Subjects: {count}", { count: level.courses_count })}</span>}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Link href={`/rankings?scope=level&id=${level.id}`} className={buttonClass("ghost", "sm")}>
            <Trophy className="h-4 w-4" /> <span className="hidden sm:inline">{t("Rankings")}</span>
          </Link>
          {canManage && (
            <>
              <ClassDialog levelId={level.id} advisors={advisors} university={university}>
                <StructureButton kind="add" label={university ? t("Add a section") : t("Add a class")} />
              </ClassDialog>
              <LevelDialog level={rest} stages={stages} university={university}>
                <StructureButton kind="edit" label={t("Edit {name}", { name: level.name })} />
              </LevelDialog>
              <DeleteStructure kind="level" id={level.id} name={level.name} />
            </>
          )}
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-xl bg-surface-2 px-4 py-5 text-center text-sm text-ink-muted">{university ? t("No sections yet.") : t("No classes yet.")}</p>
      ) : (
        <Stagger className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((g) => {
            const count = g.students_count ?? 0;
            const full = g.capacity ? count / g.capacity : null;
            return (
              <StaggerItem key={g.id} className="relative">
                <Link href={`/classes/${g.id}`} className="group flex h-full flex-col rounded-2xl border border-line bg-surface-2/60 p-4 transition hover:-translate-y-0.5 hover:border-brand-300 hover:bg-surface hover:shadow-[var(--shadow-soft)]">
                  <div className="flex items-center gap-3 pe-16">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-peach font-display text-sm font-bold text-brand-700 dark:text-brand-300">{g.name.slice(0, 3)}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-heading">{g.name}</span>
                      <span className="flex items-center gap-1 truncate text-xs text-ink-muted">
                        <UserRound className="h-3.5 w-3.5 shrink-0" /> {g.advisor?.name ?? (university ? t("No advisor yet") : t("No class teacher yet"))}
                      </span>
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge>
                      <Users className="h-3 w-3" /> {g.capacity ? `${count}/${g.capacity}` : count}
                    </Badge>
                    <Badge>
                      <BookOpen className="h-3 w-3" /> {t("Subjects: {count}", { count: g.courses_count ?? 0 })}
                    </Badge>
                    {g.room && (
                      <Badge>
                        <DoorOpen className="h-3 w-3" /> {g.room}
                      </Badge>
                    )}
                  </div>
                  {full != null && (
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden>
                      <div className={cn("h-full rounded-full", full > 1 ? "bg-danger" : full > 0.9 ? "bg-warning" : "bg-brand-500")} style={{ width: `${Math.min(100, full * 100)}%` }} />
                    </div>
                  )}
                  <span className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-semibold text-brand-600 dark:text-brand-300">
                    {t("Open")} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
                  </span>
                </Link>
                {canManage && (
                  <div className="absolute end-2 top-2 flex">
                    <ClassDialog levelId={level.id} group={g} advisors={advisors} university={university}>
                      <StructureButton kind="edit" label={t("Edit {name}", { name: g.name })} />
                    </ClassDialog>
                    <DeleteStructure kind="class" id={g.id} name={g.name} />
                  </div>
                )}
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
    </Card>
  );
}
