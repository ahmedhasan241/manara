"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Search, UserCheck, Users } from "lucide-react";
import { Avatar, Badge, Button, Checkbox, Input, Switch, cn, toast, useT } from "@educloud/ui";
import { setClassStudents } from "@/app/academic-actions";

type Student = { id: number; name: string; email: string };

/**
 * Pick who is in a class. Saving moves the chosen students into this class
 * (out of any other) and, with "enroll", into every subject taught to it.
 */
export function ClassStudentsPicker({ groupId, students, current, capacity, subjects }: { groupId: string; students: Student[]; current: number[]; capacity: number | null; subjects: number }) {
  const t = useT();
  const router = useRouter();
  const [selected, setSelected] = useState(() => new Set(current));
  const [query, setQuery] = useState("");
  const [onlySelected, setOnlySelected] = useState(false);
  const [enroll, setEnroll] = useState(subjects > 0);
  const [pending, start] = useTransition();

  const initial = useMemo(() => new Set(current), [current]);
  const dirty = selected.size !== initial.size || [...selected].some((id) => !initial.has(id));
  const q = query.trim().toLowerCase();
  const shown = students.filter((s) => (!onlySelected || selected.has(s.id)) && (!q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)));
  const allShown = shown.length > 0 && shown.every((s) => selected.has(s.id));
  const over = capacity != null && selected.size > capacity;

  function toggle(id: number, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleShown(on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const s of shown) {
        if (on) next.add(s.id);
        else next.delete(s.id);
      }
      return next;
    });
  }

  function save() {
    start(async () => {
      const result = await setClassStudents(groupId, [...selected], enroll);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(enroll && subjects > 0 ? t("Class saved and students enrolled in its subjects.") : t("Class saved."));
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Search name or email")} aria-label={t("Search students")} className="ps-9" />
        </div>
        <Button type="button" variant={onlySelected ? "soft" : "secondary"} size="sm" onClick={() => setOnlySelected((v) => !v)} aria-pressed={onlySelected}>
          <UserCheck className="h-4 w-4" /> {t("In this class only")}
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <label className="inline-flex items-center gap-2 font-medium">
          <Checkbox checked={allShown} onCheckedChange={(v) => toggleShown(v === true)} aria-label={t("Select all shown")} />
          {t("Select all shown")}
        </label>
        <Badge tone={over ? "danger" : "brand"}>
          <Users className="h-3 w-3" /> {capacity ? t("{count} of {capacity} places", { count: selected.size, capacity }) : t("Selected: {count}", { count: selected.size })}
        </Badge>
      </div>

      <ul className="max-h-[26rem] divide-y divide-line overflow-y-auto rounded-2xl border border-line">
        {shown.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-ink-muted">{students.length === 0 ? t("No students in this school yet. Add them on the People page.") : t("No one matches your search.")}</li>
        ) : (
          shown.map((s) => {
            const on = selected.has(s.id);
            return (
              <li key={s.id}>
                <label className={cn("flex cursor-pointer items-center gap-3 px-4 py-2.5 transition", on ? "bg-brand-500/[0.06]" : "hover:bg-surface-2")}>
                  <Checkbox checked={on} onCheckedChange={(v) => toggle(s.id, v === true)} aria-label={s.name} />
                  <Avatar name={s.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{s.name}</span>
                    <span className="block truncate text-xs text-ink-muted">{s.email}</span>
                  </span>
                  {initial.has(s.id) !== on && <Badge tone={on ? "success" : "warning"}>{on ? t("Adding") : t("Removing")}</Badge>}
                </label>
              </li>
            );
          })
        )}
      </ul>

      <div className="flex flex-col gap-3 rounded-2xl bg-surface-2 p-4 sm:flex-row sm:items-center">
        <label className="flex flex-1 items-start gap-3">
          <Switch checked={enroll} onCheckedChange={setEnroll} disabled={subjects === 0} className="mt-0.5" aria-label={t("Also enroll them in this class's subjects")} />
          <span className="min-w-0">
            <span className="block text-sm font-semibold">{t("Also enroll them in this class's subjects")}</span>
            <span className="block text-xs text-ink-muted">{subjects === 0 ? t("No subjects are taught to this class yet.") : t("Subjects taught to this class: {count}", { count: subjects })}</span>
          </span>
        </label>
        <Button type="button" onClick={save} disabled={pending || (!dirty && !enroll)}>
          <Save className="h-4 w-4" /> {pending ? t("Saving…") : t("Save class list")}
        </Button>
      </div>
      <p className="text-xs text-ink-muted">{t("Students you add here leave their previous class.")}</p>
    </div>
  );
}
