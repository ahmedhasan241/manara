import type { LessonPlan } from "@educloud/api-client";

/** Local datetime-local value + the browser's offset → ISO string the API understands. */
function toIso(local: string, offsetMinutes: number) {
  const utc = new Date(`${local}:00Z`).getTime() + offsetMinutes * 60_000;
  return new Date(utc).toISOString();
}

const text = (value: FormDataEntryValue | null) => String(value ?? "").trim();

/**
 * Reads the fields rendered by <LessonPlanFields> (unit, objectives,
 * homework, due date, resources and, when present, summary).
 */
export function planFromForm(form: FormData): Partial<LessonPlan> {
  const offset = Number(form.get("tz_offset") ?? 0);
  const titles = form.getAll("resource_title");
  const resources = form
    .getAll("resource_url")
    .map((url, i) => ({ url: text(url), title: text(titles[i] ?? null) }))
    .filter((r) => r.url)
    .map((r) => ({ url: /^[a-z]+:\/\//i.test(r.url) ? r.url : `https://${r.url}`, title: r.title || r.url }));
  const due = text(form.get("homework_due_at"));

  return {
    unit: text(form.get("unit")) || null,
    objectives: form.getAll("objectives").map(text).filter(Boolean),
    homework: text(form.get("homework")) || null,
    homework_due_at: due ? toIso(due, offset) : null,
    resources,
    ...(form.has("summary") ? { summary: text(form.get("summary")) || null } : {}),
  };
}
