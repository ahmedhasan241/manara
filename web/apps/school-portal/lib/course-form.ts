const text = (value: FormDataEntryValue | null) => String(value ?? "").trim();
const numberOrNull = (value: FormDataEntryValue | null) => (text(value) === "" ? null : Number(text(value)));

/**
 * Subject, level, class, credit hours, periods and pass mark from a course form.
 * Only fields the form actually shows are sent, so saving a form without (say)
 * the level picker never clears a level set elsewhere.
 */
export function courseStructureFields(form: FormData) {
  const pass = numberOrNull(form.get("pass_percent"));
  return {
    ...(form.has("subject") ? { subject: text(form.get("subject")) || null } : {}),
    ...(form.has("academic_level_id") ? { academic_level_id: text(form.get("academic_level_id")) || null } : {}),
    ...(form.has("class_group_id") ? { class_group_id: text(form.get("class_group_id")) || null } : {}),
    ...(form.has("credit_hours") ? { credit_hours: numberOrNull(form.get("credit_hours")) } : {}),
    ...(form.has("periods_per_week") ? { periods_per_week: numberOrNull(form.get("periods_per_week")) } : {}),
    ...(pass == null ? {} : { pass_percent: pass }),
  };
}
