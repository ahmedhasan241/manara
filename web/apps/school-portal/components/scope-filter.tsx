"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { BookOpen, DoorOpen, Layers, Loader2, School } from "lucide-react";
import type { RankingScope } from "@educloud/api-client";
import { Select, cn, useT } from "@educloud/ui";

export interface ScopeOptions {
  levels: { id: string; name: string }[];
  groups: { id: string; name: string; level: string }[];
  courses: { id: string; name: string }[];
}

/**
 * Whole school / level / class / subject switch with a picker for the chosen
 * one. Changes are kept in the URL (?scope=&id=), along with `keep` params.
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
    <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
      <div role="tablist" aria-label={t("Show results for")} className="inline-flex w-full gap-1 overflow-x-auto rounded-2xl border border-line bg-surface p-1.5 shadow-[var(--shadow-soft)] lg:w-auto">
        {scopes.map((s) => {
          const selected = s.key === current.key;
          const disabled = s.key !== "school" && s.items.length === 0;
          const Icon = s.icon;
          return (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={selected}
              disabled={disabled}
              onClick={() => !selected && go(s.key)}
              className={cn("relative flex h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 text-sm font-semibold transition-colors disabled:opacity-40 lg:flex-none lg:px-4", selected ? "text-white" : "text-ink-muted hover:text-ink")}
            >
              {selected && <motion.span layoutId="scope-indicator" className="fill-brand absolute inset-0 rounded-xl shadow-[var(--shadow-soft)]" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
              <span className="relative flex items-center gap-2">
                <Icon className="h-4 w-4" /> <span className="hidden sm:inline">{s.label}</span>
              </span>
            </button>
          );
        })}
      </div>
      {current.key !== "school" && (
        <Select aria-label={current.label} value={id ?? current.items[0]?.id ?? ""} onChange={(e) => go(current.key, e.target.value)} className="lg:w-72">
          {current.items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>
      )}
      {pending && <Loader2 className="h-5 w-5 animate-spin text-brand-500" aria-label={t("Loading…")} />}
    </div>
  );
}
