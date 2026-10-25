import type { AcademicSettings, AcademicStage, AttendanceStanding, StudentStanding, TenantType } from "@educloud/api-client";
import type { Translate } from "@educloud/ui";

export type Tone = "neutral" | "brand" | "accent" | "success" | "warning" | "danger" | "live";

export const STAGES: AcademicStage[] = ["kindergarten", "primary", "preparatory", "secondary", "diploma", "undergraduate", "postgraduate"];

/** Localised name of a school stage or university programme level. */
export function stageLabel(t: Translate, stage: AcademicStage) {
  const labels: Record<AcademicStage, string> = {
    kindergarten: t("Kindergarten"),
    primary: t("Primary school"),
    preparatory: t("Preparatory school"),
    secondary: t("Secondary school"),
    diploma: t("Diploma"),
    undergraduate: t("Undergraduate"),
    postgraduate: t("Postgraduate"),
  };
  return labels[stage];
}

export const standingTone: Record<StudentStanding, Tone> = { honors: "success", good: "brand", warning: "warning", at_risk: "danger" };

export function standingLabel(t: Translate, standing: StudentStanding) {
  const labels: Record<StudentStanding, string> = { honors: t("Honors"), good: t("Good standing"), warning: t("Needs attention"), at_risk: t("At risk") };
  return labels[standing];
}

export const attendanceTone: Record<AttendanceStanding, Tone> = { ok: "success", warning: "warning", limit: "danger" };

export function attendanceLabel(t: Translate, status: AttendanceStanding) {
  const labels: Record<AttendanceStanding, string> = { ok: t("On track"), warning: t("Absence warning"), limit: t("Over the absence limit") };
  return labels[status];
}

/** Universities call levels "years" and group them by department. */
export const isUniversity = (type: TenantType) => type === "university";

/** "86.5%" or "3.42" depending on the grading scale. */
export function formatScore(scale: AcademicSettings["grading_scale"], average: number | null | undefined, gpa: number | null | undefined) {
  if (scale === "gpa") return gpa == null ? "—" : gpa.toFixed(2);
  return average == null ? "—" : `${round1(average)}%`;
}

export const round1 = (n: number) => Math.round(n * 10) / 10;

export const pct = (n: number | null | undefined) => (n == null ? "—" : `${round1(n)}%`);

/** Tone for a percentage against a pass mark. */
export function scoreTone(percent: number | null | undefined, pass = 50): Tone {
  if (percent == null) return "neutral";
  if (percent >= Math.max(pass + 25, 85)) return "success";
  if (percent >= pass) return "brand";
  return "danger";
}

export function rateTone(rate: number | null | undefined): Tone {
  if (rate == null) return "neutral";
  return rate >= 90 ? "success" : rate >= 75 ? "warning" : "danger";
}
