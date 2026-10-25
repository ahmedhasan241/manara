"use client";

import { useState } from "react";
import type { AttendanceStatus, ClassSession } from "@educloud/api-client";
import { Button, Card, cn, toast, useFormat, useT } from "@educloud/ui";
import { attendanceChangeId, enqueue } from "@/lib/offline-queue";

const STATUSES = [
  { value: "present", label: "Present", className: "bg-success text-white" },
  { value: "late", label: "Late", className: "bg-warning text-white" },
  { value: "absent", label: "Absent", className: "bg-danger text-white" },
  { value: "excused", label: "Excused", className: "fill-brand text-white" },
] as const satisfies readonly { value: AttendanceStatus; label: string; className: string }[];

/**
 * Roll call for the latest session. Marks go into the offline queue first, so
 * taking attendance works with no connection; the queue syncs when online.
 */
export function RollCall({ session, students }: { session: ClassSession; students: { id: number; name: string }[] }) {
  const fmt = useFormat();
  const t = useT();
  const [marks, setMarks] = useState<Record<number, AttendanceStatus>>(
    Object.fromEntries(session.attendances.map((a) => [a.student_id, a.status])),
  );
  const [saved, setSaved] = useState(false);

  function mark(studentId: number, status: AttendanceStatus) {
    setMarks((m) => ({ ...m, [studentId]: status }));
    setSaved(false);
  }

  function save() {
    enqueue(
      Object.entries(marks).map(([studentId, status]) => ({
        entity: "attendance" as const,
        id: attendanceChangeId(session.id, Number(studentId)),
        data: { class_session_id: session.id, student_id: Number(studentId), status },
      })),
    );
    setSaved(true);
    const count = Object.keys(marks).length;
    // Marks sync in the background (see OfflineSync), so this works offline too.
    if (navigator.onLine) toast.success(t("Attendance saved. Students marked: {count}.", { count }));
    else toast.info(t("Attendance saved on this device. Students marked: {count}. It will sync when you are back online.", { count }));
  }

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">{t("Roll call")}</h2>
          <p className="text-sm text-ink-muted">
            {fmt.dateTime(session.starts_at)} {session.topic && `· ${session.topic}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setMarks(Object.fromEntries(students.map((s) => [s.id, "present" as const])))}>
            {t("Mark all present")}
          </Button>
          <Button size="sm" onClick={save} disabled={Object.keys(marks).length === 0}>
            {saved ? t("Saved") : t("Save attendance")}
          </Button>
        </div>
      </div>
      <ul className="divide-y divide-line">
        {students.map((s) => (
          <li key={s.id} className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between">
            <span>{s.name}</span>
            <div role="radiogroup" aria-label={t("Attendance for {name}", { name: s.name })} className="flex gap-1">
              {STATUSES.map((st) => (
                <button
                  key={st.value}
                  type="button"
                  role="radio"
                  aria-checked={marks[s.id] === st.value}
                  onClick={() => mark(s.id, st.value)}
                  className={cn(
                    "min-h-9 rounded-md border border-line px-3 text-xs font-medium",
                    marks[s.id] === st.value ? st.className : "bg-surface text-ink-muted hover:text-ink",
                  )}
                >
                  {t(st.label)}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
