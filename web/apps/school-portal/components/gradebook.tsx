"use client";

import { useState, useTransition } from "react";
import type { Assessment, GradeRow } from "@educloud/api-client";
import { Button, Card, useActionToast, useT } from "@educloud/ui";
import { saveGrades } from "@/app/actions";

/**
 * Spreadsheet-style gradebook: one row per student, one column per assessment.
 * Teachers edit scores inline and save one column at a time.
 */
export function Gradebook({
  courseId,
  assessments,
  students,
  grades,
  canWrite,
}: {
  courseId: string;
  assessments: Assessment[];
  students: { id: number; name: string }[];
  grades: GradeRow[];
  canWrite: boolean;
}) {
  const t = useT();
  const initial = Object.fromEntries(grades.map((g) => [`${g.assessment_id}:${g.student_id}`, g.score == null ? "" : String(Number(g.score))]));
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const notify = useActionToast();
  const [saving, startSaving] = useTransition();

  function save(assessment: Assessment) {
    const payload = students
      .filter((s) => dirty.has(`${assessment.id}:${s.id}`))
      .map((s) => {
        const raw = values[`${assessment.id}:${s.id}`] ?? "";
        return { student_id: s.id, score: raw === "" ? null : Number(raw) };
      });
    if (payload.length === 0) return;

    startSaving(async () => {
      const result = await saveGrades(assessment.id, courseId, payload);
      if (!notify(result, { success: t("Grades saved for {title}. Students graded: {count}.", { title: assessment.title, count: payload.length }) })) return;
      setDirty((prev) => new Set([...prev].filter((key) => !key.startsWith(`${assessment.id}:`))));
    });
  }

  const average = (assessment: Assessment) => {
    const scores = students.map((s) => values[`${assessment.id}:${s.id}`]).filter((v): v is string => !!v).map(Number);
    return scores.length ? ((scores.reduce((a, b) => a + b, 0) / scores.length / Number(assessment.max_score)) * 100).toFixed(0) + "%" : "—";
  };

  return (
    <div className="space-y-3">
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-max text-sm">
          <thead className="border-b border-line text-ink-muted">
            <tr>
              <th scope="col" className="sticky start-0 bg-surface px-4 py-3 text-start font-medium">
                {t("Student")}
              </th>
              {assessments.map((a) => (
                <th key={a.id} scope="col" className="px-3 py-3 text-start font-medium">
                  <span className="block text-ink">{a.title}</span>
                  <span className="text-xs">{t("/ {max} · avg {average}", { max: Number(a.max_score), average: average(a) })}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-b border-line last:border-0">
                <th scope="row" className="sticky start-0 bg-surface px-4 py-2 text-start font-normal">
                  {s.name}
                </th>
                {assessments.map((a) => {
                  const key = `${a.id}:${s.id}`;
                  return (
                    <td key={a.id} className="px-3 py-2">
                      {canWrite ? (
                        <input
                          aria-label={`${s.name}, ${a.title}`}
                          inputMode="decimal"
                          className="h-9 w-20 rounded-md border border-line bg-surface px-2 tabular-nums focus:border-brand-500 focus:outline-none"
                          value={values[key] ?? ""}
                          onChange={(e) => {
                            setValues((v) => ({ ...v, [key]: e.target.value.replace(/[^\d.]/g, "") }));
                            setDirty((d) => new Set(d).add(key));
                          }}
                        />
                      ) : (
                        <span className="tabular-nums">{values[key] || "—"}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          {canWrite && (
            <tfoot>
              <tr>
                <td className="sticky start-0 bg-surface px-4 py-3" />
                {assessments.map((a) => (
                  <td key={a.id} className="px-3 py-3">
                    <Button size="sm" variant="secondary" disabled={saving || ![...dirty].some((k) => k.startsWith(`${a.id}:`))} onClick={() => save(a)}>
                      {saving ? t("Saving…") : t("Save")}
                    </Button>
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </Card>
    </div>
  );
}
