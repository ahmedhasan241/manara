"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, DoorOpen, Layers, Loader2, School } from "lucide-react";
import type { RankingScope } from "@educloud/api-client";
import { Select, cn, useT } from "@educloud/ui";

export interface ScopeOptions {
  levels: { id: string; name: string }[];
  groups: { id: string; name: string; level: string }[];
  courses: { id: string; name: string }[];
}

/**
 * Whole school / level / class / subject, then which one: two searchable
 * dropdowns. Changes are kept in the URL (?scope=&id=), along with `keep` params.
 */
export function ScopeFilter({ scope, id, options, university, keep = {} }: { scope: RankingScope; id?: string; options: ScopeOptions; university: boolean; keep?: Record<string, string | undefined> }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();

  const scopes: { key: RankingScope; label: string; icon: typeof School; items: { id: string; name: string }[] }[] = [
    { key: "school", label: university ? t("Whole university") : t("Whole school"), icon: School, items: [] },
    { key: "level", label: university ? t("Year") : t("Level"), icon: Layers, items: options.levels },
    { key: "group", label: university ? t("Section") : t("Class"), icon: DoorOpen, items: options.groups.map((g) => ({ id: g.id, name: `${g.level} · ${g.name}` })) },
    { key: "course", label: t("Subject"), icon: BookOpen, items: options.courses },
  ];
  const current = scopes.find((s) => s.key === scope) ?? scopes[0]!;
  const field = "sm:w-auto sm:min-w-52 [&>button]:h-11 [&>button]:rounded-xl [&>button]:shadow-[var(--shadow-soft)]";

  function go(next: RankingScope, nextId?: string) {
    const params = new URLSearchParams(Object.entries(keep).filter((e): e is [string, string] => !!e[1]));
    if (next !== "school") {
      params.set("scope", next);
      const target = nextId ?? scopes.find((s) => s.key === next)?.items[0]?.id;
      if (target) params.set("id", target);
    }
    start(() => router.push(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false }));
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <Select
        aria-label={t("Show results for")}
        prefix={`${t("Show results for")}:`}
        value={current.key}
        clearable={current.key !== "school"}
        onChange={(event) => go((event.target.value || "school") as RankingScope)}
        items={scopes.map((s) => {
          const Icon = s.icon;
          return { value: s.key, label: s.label, icon: <Icon />, disabled: s.key !== "school" && s.items.length === 0, count: s.key === "school" ? undefined : s.items.length };
        })}
        className={field}
      />
      {current.key !== "school" && (
        <Select
          aria-label={current.label}
          prefix={`${current.label}:`}
          value={id ?? current.items[0]?.id ?? ""}
          clearable={false}
          onChange={(event) => go(current.key, event.target.value)}
          items={current.items.map((item) => ({ value: item.id, label: item.name }))}
          className={cn(field, "sm:min-w-64")}
        />
      )}
      {pending && <Loader2 className="h-5 w-5 animate-spin text-brand-500" aria-label={t("Loading…")} />}
    </div>
  );
}
