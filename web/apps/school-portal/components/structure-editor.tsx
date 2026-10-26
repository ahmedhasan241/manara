"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Save, Trash2 } from "lucide-react";
import type { AcademicLevel, AcademicSettings, AcademicStage, ClassGroup } from "@educloud/api-client";
import { Alert, Button, ConfirmDialog, Field, FormActions, FormSection, Input, Select, Switch, cn, toast, useT } from "@educloud/ui";
import { createClassGroup, createLevel, deleteClassGroup, deleteLevel, saveAcademicSettings, updateClassGroup, updateLevel, type AcademicResult } from "@/app/academic-actions";
import { stageLabel } from "@/lib/academic";

type Person = { id: number; name: string };

/** Runs a server action, toasts the outcome and refreshes the page. */
function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (action: () => Promise<AcademicResult>, success: string, done?: () => void) =>
    start(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(success);
      done?.();
      router.refresh();
    });
  return { pending, run };
}

const text = (form: FormData, name: string) => String(form.get(name) ?? "").trim();
const numberOrNull = (form: FormData, name: string) => (text(form, name) === "" ? null : Number(text(form, name)));

/**
 * Create or edit a grade / year, on its own page (/classes/levels/new,
 * /classes/levels/[id]/edit). Saving returns to `backHref`.
 */
export function LevelForm({ level, stages, university, nextPosition = 0, backHref }: { level?: Omit<AcademicLevel, "groups">; stages: AcademicStage[]; university: boolean; nextPosition?: number; backHref: string }) {
  const t = useT();
  const router = useRouter();
  const { pending, run } = useAction();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data = {
      stage: text(form, "stage") as AcademicStage,
      name: text(form, "name"),
      department: text(form, "department") || null,
      position: Number(text(form, "position") || nextPosition),
    };
    run(() => (level ? updateLevel(level.id, data) : createLevel(data)), level ? (university ? t("Year saved.") : t("Level saved.")) : university ? t("Year added.") : t("Level added."), () => router.push(backHref));
  }

  return (
    <form onSubmit={submit}>
      <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-soft)] sm:p-6">
        <FormSection title={university ? t("Year") : t("Level")} description={university ? t("A year of study, e.g. Year 1 in the Engineering department.") : t("A grade or level, e.g. Grade 10. Classes belong to a level.")}>
          <div className="sm:col-span-2">
            <Field label={t("Name")} htmlFor="level-name">
              <Input id="level-name" name="name" required autoFocus defaultValue={level?.name} placeholder={university ? t("Year 1") : t("Grade 10")} />
            </Field>
          </div>
          <Field label={university ? t("Programme") : t("Stage")} htmlFor="level-stage">
            <Select id="level-stage" name="stage" defaultValue={level?.stage ?? stages[0]}>
              {stages.map((s) => (
                <option key={s} value={s}>
                  {stageLabel(t, s)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("Order")} htmlFor="level-position" hint={t("Lower numbers come first.")}>
            <Input id="level-position" name="position" type="number" min={0} defaultValue={level?.position ?? nextPosition} />
          </Field>
          {university && (
            <div className="sm:col-span-2">
              <Field label={t("Department")} htmlFor="level-department">
                <Input id="level-department" name="department" defaultValue={level?.department ?? ""} placeholder={t("Engineering")} />
              </Field>
            </div>
          )}
        </FormSection>
      </div>
      <FormActions cancel={{ href: backHref, label: t("Cancel") }}>
        <Button type="submit" disabled={pending}>
          {pending ? t("Saving…") : t("Save")}
        </Button>
      </FormActions>
    </form>
  );
}

/**
 * Create or edit a class / section, on its own page (/classes/new,
 * /classes/[groupId]/edit). A new class picks its level here.
 */
export function ClassForm({
  levels,
  levelId,
  group,
  advisors,
  university,
  backHref,
}: {
  /** Levels to choose from when creating; leave out when editing. */
  levels?: { id: string; name: string }[];
  levelId?: string;
  group?: ClassGroup;
  advisors: Person[];
  university: boolean;
  backHref: string;
}) {
  const t = useT();
  const router = useRouter();
  const { pending, run } = useAction();
  const people = group?.advisor && !advisors.some((a) => a.id === group.advisor!.id) ? [group.advisor, ...advisors] : advisors;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data = {
      name: text(form, "name"),
      room: text(form, "room") || null,
      capacity: numberOrNull(form, "capacity"),
      advisor_id: numberOrNull(form, "advisor_id"),
    };
    const level = text(form, "level_id") || levelId || "";
    run(
      () => (group ? updateClassGroup(group.id, data) : createClassGroup(level, data)),
      group ? (university ? t("Section saved.") : t("Class saved.")) : university ? t("Section added.") : t("Class added."),
      () => router.push(backHref),
    );
  }

  return (
    <form onSubmit={submit}>
      <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-soft)] sm:p-6">
        <FormSection title={university ? t("Section") : t("Class")} description={t("Students belong to one class. Subjects can be taught to a whole class.")}>
          <div className="sm:col-span-2">
            <Field label={t("Name")} htmlFor="class-name">
              <Input id="class-name" name="name" required autoFocus defaultValue={group?.name} placeholder={university ? t("Section 1") : t("10-A")} />
            </Field>
          </div>
          {!group && levels && (
            <div className="sm:col-span-2">
              <Field label={university ? t("Year") : t("Level")} htmlFor="class-level">
                <Select id="class-level" name="level_id" required defaultValue={levelId ?? levels[0]?.id}>
                  {levels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          )}
          <div className="sm:col-span-2">
            <Field label={university ? t("Academic advisor") : t("Class teacher")} htmlFor="class-advisor">
              <Select id="class-advisor" name="advisor_id" defaultValue={group?.advisor_id ?? ""}>
                <option value="">{t("No one yet")}</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label={t("Room")} htmlFor="class-room">
            <Input id="class-room" name="room" defaultValue={group?.room ?? ""} placeholder={t("B-204")} />
          </Field>
          <Field label={t("Capacity")} htmlFor="class-capacity">
            <Input id="class-capacity" name="capacity" type="number" min={1} defaultValue={group?.capacity ?? ""} placeholder="30" />
          </Field>
        </FormSection>
      </div>
      <FormActions cancel={{ href: backHref, label: t("Cancel") }}>
        <Button type="submit" disabled={pending}>
          {pending ? t("Saving…") : t("Save")}
        </Button>
      </FormActions>
    </form>
  );
}

/** Small icon links on level and class cards (add a class, edit). */
export function StructureLink({ kind, label, href, className }: { kind: "add" | "edit"; label: string; href: string; className?: string }) {
  const Icon = kind === "add" ? Plus : Pencil;
  return (
    <Link href={href} aria-label={label} title={label} className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-muted transition hover:bg-surface-3 hover:text-ink", className)}>
      <Icon className="h-4 w-4" />
    </Link>
  );
}

export function DeleteStructure({ kind, id, name }: { kind: "level" | "class"; id: string; name: string }) {
  const t = useT();
  const { pending, run } = useAction();
  return (
    <ConfirmDialog
      title={t("Delete {name}?", { name })}
      description={kind === "level" ? t("Its classes are deleted too. Students and subjects stay, but lose their link to it.") : t("Students in this class become unassigned. Their grades and attendance are kept.")}
      confirmLabel={t("Delete")}
      onConfirm={() => run(() => (kind === "level" ? deleteLevel(id) : deleteClassGroup(id)), t("{name} deleted.", { name }))}
    >
      <button type="button" disabled={pending} aria-label={t("Delete {name}", { name })} title={t("Delete {name}", { name })} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-muted transition hover:bg-danger/10 hover:text-danger">
        <Trash2 className="h-4 w-4" />
      </button>
    </ConfirmDialog>
  );
}

/** Grading scale, lateness and absence thresholds, and ranking visibility. */
export function AcademicSettingsForm({ settings }: { settings: AcademicSettings }) {
  const t = useT();
  const { pending, run } = useAction();
  const [values, setValues] = useState(settings);
  const invalid = values.absence_limit_percent < values.absence_warning_percent;
  const set = <K extends keyof AcademicSettings>(key: K, value: AcademicSettings[K]) => setValues((v) => ({ ...v, [key]: value }));
  const num = (raw: string) => (raw === "" ? 0 : Number(raw));

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!invalid) run(() => saveAcademicSettings(values), t("Settings saved."));
      }}
      className="grid gap-4 sm:grid-cols-2"
    >
      <Field label={t("Grading scale")} htmlFor="grading_scale">
        <Select id="grading_scale" value={values.grading_scale} onChange={(e) => set("grading_scale", e.target.value as AcademicSettings["grading_scale"])}>
          <option value="percent">{t("Percentage (0–100%)")}</option>
          <option value="gpa">{t("GPA (4.0 scale)")}</option>
        </Select>
      </Field>
      <Field label={t("Late after (minutes)")} htmlFor="late_after_minutes" hint={t("Joining a live lesson later than this counts as late.")}>
        <Input id="late_after_minutes" type="number" min={0} max={120} value={values.late_after_minutes} onChange={(e) => set("late_after_minutes", num(e.target.value))} />
      </Field>
      <Field label={t("Absence warning at (%)")} htmlFor="absence_warning_percent" hint={t("Students and parents get a warning at this share of absences.")}>
        <Input id="absence_warning_percent" type="number" min={0} max={100} value={values.absence_warning_percent} onChange={(e) => set("absence_warning_percent", num(e.target.value))} />
      </Field>
      <Field label={t("Absence limit (%)")} htmlFor="absence_limit_percent" hint={t("At this share of absences a student is barred or at risk.")} error={invalid ? t("The limit must be at least the warning level.") : undefined}>
        <Input id="absence_limit_percent" type="number" min={0} max={100} value={values.absence_limit_percent} onChange={(e) => set("absence_limit_percent", num(e.target.value))} />
      </Field>
      <label className="flex items-start gap-3 rounded-xl border border-line p-3 sm:col-span-2">
        <Switch checked={values.rankings_visible} onCheckedChange={(v) => set("rankings_visible", v)} aria-label={t("Show rankings to students and parents")} className="mt-0.5" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{t("Show rankings to students and parents")}</span>
          <span className="block text-xs text-ink-muted">{t("They see the top of each list and their own rank. Staff always see everything.")}</span>
        </span>
      </label>
      {values.rankings_visible && (
        <Field label={t("How many top places to show")} htmlFor="rankings_top">
          <Input id="rankings_top" type="number" min={1} max={100} value={values.rankings_top} onChange={(e) => set("rankings_top", num(e.target.value) || 1)} />
        </Field>
      )}
      {invalid && (
        <div className="sm:col-span-2">
          <Alert tone="warning">{t("The limit must be at least the warning level.")}</Alert>
        </div>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending || invalid}>
          <Save className="h-4 w-4" /> {pending ? t("Saving…") : t("Save settings")}
        </Button>
      </div>
    </form>
  );
}
