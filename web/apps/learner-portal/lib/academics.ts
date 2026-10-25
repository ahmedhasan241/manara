/* Report card, attendance and ranking helpers shared by server and client components (no server-only imports). */

import { ApiError, type AcademicSettings, type AttendanceStanding, type ReportCard, type StudentStanding } from "@educloud/api-client";
import type { Formatters, Translate } from "@educloud/ui";

export type ScoreTone = "success" | "warning" | "danger" | "neutral";

/** Universities grade on a 4.0 GPA scale; schools in percent. */
export const usesGpa = (settings: Pick<AcademicSettings, "grading_scale">) => settings.grading_scale === "gpa";

/** "87%" or "3.42" depending on the school's scale. */
export function formatScore(row: { average?: number | null; gpa?: number | null }, scale: AcademicSettings["grading_scale"], fmt: Formatters) {
  if (scale === "gpa") return row.gpa == null ? "—" : fmt.number(row.gpa, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return row.average == null ? "—" : `${fmt.number(row.average, { maximumFractionDigits: 1 })}%`;
}

export function formatPercent(value: number | null | undefined, fmt: Formatters) {
  return value == null ? "—" : `${fmt.number(value, { maximumFractionDigits: 1 })}%`;
}

/** Green comfortably above the pass mark, amber just above it, red below. */
export function scoreTone(percent: number | null | undefined, pass = 50): ScoreTone {
  if (percent == null) return "neutral";
  if (percent < pass) return "danger";
  if (percent < Math.min(pass + 15, 100)) return "warning";
  return "success";
}

export const attendanceTone = (status: AttendanceStanding | undefined): ScoreTone => (status === "limit" ? "danger" : status === "warning" ? "warning" : status === "ok" ? "success" : "neutral");

const STANDING_TONES = { honors: "success", good: "brand", warning: "warning", at_risk: "danger" } as const satisfies Record<StudentStanding, string>;
export const standingTone = (standing: StudentStanding) => STANDING_TONES[standing];

export const TONE_TEXT: Record<ScoreTone, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  neutral: "text-ink-muted",
};

export const TONE_FILL: Record<ScoreTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-ink-muted/40",
};

export const TONE_SOFT: Record<ScoreTone, string> = {
  success: "bg-success/12 text-success",
  warning: "bg-warning/12 text-warning",
  danger: "bg-danger/12 text-danger",
  neutral: "bg-surface-3 text-ink-muted",
};

export function standingLabel(standing: StudentStanding, t: Translate) {
  return { honors: t("Honor roll"), good: t("Good standing"), warning: t("Needs attention"), at_risk: t("At risk") }[standing];
}

/** A short, kind explanation of what the standing means and what to do next. */
export function standingExplanation(standing: StudentStanding, t: Translate, child: string | null) {
  if (child) {
    return {
      honors: t("{name} is averaging 90% or more with no subject at risk. Wonderful work!", { name: child }),
      good: t("{name} is passing every subject and attending regularly. Keep encouraging them.", { name: child }),
      warning: t("{name} is below the pass mark in one subject or missing lessons. A little support now goes a long way.", { name: child }),
      at_risk: t("{name} is struggling in more than one subject or has missed too many lessons. Talking to their teachers can really help.", { name: child }),
    }[standing];
  }
  return {
    honors: t("You're averaging 90% or more with no subject at risk. Brilliant work!"),
    good: t("You're passing every subject and attending regularly. Keep it up!"),
    warning: t("One subject is below the pass mark or you've missed some lessons. You can turn this around."),
    at_risk: t("A few subjects need attention. Your teachers are here to help, so reach out to them."),
  }[standing];
}

export function attendanceStatusLabel(status: AttendanceStanding, t: Translate) {
  return { ok: t("On track"), warning: t("Warning"), limit: t("Over the limit") }[status];
}

/** "3rd of 15" style rank text: "#3 of 15". */
export function rankText(rank: { rank: number | null; of: number } | null | undefined, t: Translate) {
  if (!rank || rank.rank == null) return null;
  return t("#{rank} of {total}", { rank: rank.rank, total: rank.of });
}

/** The report card, or null when there's no student to show (e.g. a parent with no child linked yet). */
export async function loadReportCard(load: () => Promise<ReportCard>): Promise<ReportCard | null> {
  try {
    return await load();
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) return null;
    throw error;
  }
}
