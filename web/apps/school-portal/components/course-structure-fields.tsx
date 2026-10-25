"use client";

import { useState } from "react";
import { Field, Input, Select, useT } from "@educloud/ui";

export interface LevelOption {
  id: string;
  name: string;
  department: string | null;
  groups: { id: string; name: string }[];
}

/**
 * Subject, level, class, credit hours, periods per week and pass mark — the
 * course's place in the school or university. Picking a class sets its level.
 */
export function CourseStructureFields({
  levels,
  university,
  defaults = {},
  idPrefix = "course",
}: {
  levels: LevelOption[];
  university: boolean;
  defaults?: { subject?: string | null; academic_level_id?: string | null; class_group_id?: string | null; credit_hours?: number | null; periods_per_week?: number | null; pass_percent?: number | null };
  idPrefix?: string;
}) {
  const t = useT();
  const [levelId, setLevelId] = useState(defaults.academic_level_id ?? "");
  const [groupId, setGroupId] = useState(defaults.class_group_id ?? "");
  const level = levels.find((l) => l.id === levelId);
  const groups = level ? level.groups : [];
  const id = (name: string) => `${idPrefix}-${name}`;
  const subjects = [t("Mathematics"), t("Science"), t("Physics"), t("Chemistry"), t("Biology"), t("Arabic"), t("English"), t("History"), t("Geography"), t("Computer science")];

  return (
    <>
      <Field label={t("Subject")} htmlFor={id("subject")} hint={t("Shown on report cards, e.g. Mathematics.")}>
        <Input id={id("subject")} name="subject" list={id("subjects")} defaultValue={defaults.subject ?? ""} placeholder={t("Mathematics")} />
      </Field>
      <datalist id={id("subjects")}>
        {subjects.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <Field label={t("Pass mark (%)")} htmlFor={id("pass")}>
        <Input id={id("pass")} name="pass_percent" type="number" min={0} max={100} step="0.5" defaultValue={defaults.pass_percent ?? 50} />
      </Field>
      {levels.length > 0 && (
        <>
          <Field label={university ? t("Year") : t("Level")} htmlFor={id("level")}>
            <Select
              id={id("level")}
              name="academic_level_id"
              value={levelId}
              onChange={(e) => {
                setLevelId(e.target.value);
                setGroupId("");
              }}
            >
              <option value="">{t("Not set")}</option>
              {levels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.department ? `${l.name} · ${l.department}` : l.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={university ? t("Section") : t("Class")} htmlFor={id("group")} hint={t("Taught to the whole class: its students can be enrolled in one go.")}>
            <Select id={id("group")} name="class_group_id" value={groupId} onChange={(e) => setGroupId(e.target.value)} disabled={!level}>
              <option value="">{level ? t("Every class in the level") : t("Pick a level first")}</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </Field>
        </>
      )}
      {university && (
        <Field label={t("Credit hours")} htmlFor={id("credits")}>
          <Input id={id("credits")} name="credit_hours" type="number" min={0} max={30} defaultValue={defaults.credit_hours ?? 3} />
        </Field>
      )}
      <Field label={t("Periods per week")} htmlFor={id("periods")}>
        <Input id={id("periods")} name="periods_per_week" type="number" min={0} max={40} defaultValue={defaults.periods_per_week ?? ""} placeholder={university ? "3" : "5"} />
      </Field>
    </>
  );
}
