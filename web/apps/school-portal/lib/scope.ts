import type { AcademicStructure, Course, RankingScope } from "@educloud/api-client";
import type { ScopeOptions } from "@/components/scope-filter";

const SCOPES: RankingScope[] = ["school", "level", "group", "course"];

/** Reads ?scope=&id= safely; anything unknown falls back to the whole school. */
export function parseScope(params: { scope?: string; id?: string }): { scope: RankingScope; id?: string } {
  const scope = SCOPES.includes(params.scope as RankingScope) ? (params.scope as RankingScope) : "school";
  return scope === "school" || !params.id ? { scope: "school" } : { scope, id: params.id };
}

/** Level, class and subject choices for the scope filter. */
export function scopeOptions(structure: AcademicStructure | null, courses: Course[]): ScopeOptions {
  const levels = [...(structure?.levels ?? [])].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
  return {
    levels: levels.map((l) => ({ id: l.id, name: l.department ? `${l.name} · ${l.department}` : l.name })),
    groups: levels.flatMap((l) => l.groups.map((g) => ({ id: g.id, name: g.name, level: l.name }))),
    courses: courses.map((c) => ({ id: c.id, name: [c.subject ?? c.title, c.class_group?.name].filter(Boolean).join(" · ") })),
  };
}

/** Levels with their classes, for the course form's level and class pickers. */
export function levelOptions(structure: AcademicStructure | null) {
  return [...(structure?.levels ?? [])]
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
    .map((l) => ({ id: l.id, name: l.name, department: l.department, groups: l.groups.map((g) => ({ id: g.id, name: g.name })) }));
}
