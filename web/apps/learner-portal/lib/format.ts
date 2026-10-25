/* Formatting shared by server and client components (no server-only imports). */

import type { Translate } from "@educloud/ui";

/** "1h 20m" / "45m" for course and lecture lengths, with the language's short units. */
export function formatDuration(seconds: number, t: Translate) {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return t("{minutes}m", { minutes });
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? t("{hours}h {minutes}m", { hours, minutes: rest }) : t("{hours}h", { hours });
}

export const LEVEL_LABELS = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced", all: "All levels" } as const;
export const ORG_LABELS = { school: "School", university: "University", teacher: "Independent teacher" } as const;
