"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, CornerDownLeft, Moon, Search } from "lucide-react";
import { cn } from "./components";
import { useT } from "./i18n-provider";

export interface CommandItem {
  id: string;
  label: string;
  group: "pages" | "actions" | "courses";
  href?: string;
  hint?: string;
  keywords?: string;
  run?: () => void;
}

/** Opens the palette from anywhere: dispatch this event (e.g. from a search button). */
export const OPEN_COMMAND_PALETTE = "educloud:open-command-palette";

function score(item: CommandItem, query: string) {
  if (!query) return 1;
  const haystack = `${item.label} ${item.keywords ?? ""} ${item.hint ?? ""}`.toLowerCase();
  const q = query.toLowerCase().trim();
  if (haystack.startsWith(q)) return 3;
  if (haystack.includes(q)) return 2;
  // Loose match: every character in order.
  let i = 0;
  for (const c of haystack) if (c === q[i]) i++;
  return i === q.length ? 1 : 0;
}

/**
 * ⌘K / Ctrl+K command palette: jump to any page or course, run quick actions,
 * or switch dark mode — all from the keyboard.
 */
export function CommandPalette({ items }: { items: CommandItem[] }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_COMMAND_PALETTE, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_COMMAND_PALETTE, onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => input.current?.focus(), 10);
    }
  }, [open]);

  const builtIn: CommandItem[] = useMemo(
    () => [
      {
        id: "toggle-dark",
        label: t("Toggle dark mode"),
        group: "actions",
        keywords: "theme night light",
        run: () => {
          const dark = !document.documentElement.classList.contains("dark");
          document.documentElement.classList.toggle("dark", dark);
          try {
            localStorage.setItem("educloud-theme", dark ? "dark" : "light");
          } catch {}
        },
      },
    ],
    [t],
  );

  const results = useMemo(
    () =>
      [...items, ...builtIn]
        .map((item) => ({ item, s: score(item, query) }))
        .filter((r) => r.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, 30)
        .map((r) => r.item),
    [builtIn, items, query],
  );

  const groups = (["pages", "courses", "actions"] as const)
    .map((g) => ({ g, list: results.filter((r) => r.group === g) }))
    .filter((x) => x.list.length > 0);
  const flat = groups.flatMap((g) => g.list);

  function choose(item: CommandItem | undefined) {
    if (!item) return;
    setOpen(false);
    if (item.run) item.run();
    else if (item.href) router.push(item.href);
  }

  const groupLabel = { pages: t("Pages"), courses: t("Courses"), actions: t("Quick actions") };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]">
          <motion.div className="absolute inset-0 bg-nav/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t("Search or jump to…")}
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="gradient-border relative w-full max-w-xl overflow-hidden rounded-3xl bg-surface shadow-[var(--shadow-soft)]"
          >
            <div className="flex items-center gap-3 border-b border-line px-5">
              <Search className="h-5 w-5 shrink-0 text-ink-muted" />
              <input
                ref={input}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActive((a) => Math.min(a + 1, flat.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActive((a) => Math.max(a - 1, 0));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    choose(flat[active]);
                  } else if (e.key === "Escape") {
                    setOpen(false);
                  }
                }}
                placeholder={t("Type a page, course or action")}
                aria-label={t("Type a page, course or action")}
                role="combobox"
                aria-expanded="true"
                aria-controls="command-results"
                aria-activedescendant={flat[active] ? `cmd-${flat[active]!.id}` : undefined}
                className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-ink-muted/70"
              />
              <kbd className="hidden rounded-md border border-line px-1.5 py-0.5 text-[11px] font-semibold text-ink-muted sm:block">Esc</kbd>
            </div>

            <div id="command-results" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
              {flat.length === 0 && <p className="px-3 py-8 text-center text-sm text-ink-muted">{t("Nothing found")}</p>}
              {groups.map(({ g, list }) => (
                <div key={g} className="mb-1">
                  <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">{groupLabel[g]}</p>
                  {list.map((item) => {
                    const index = flat.indexOf(item);
                    const selected = index === active;
                    const Icon = item.id === "toggle-dark" ? Moon : ArrowRight;
                    return (
                      <button
                        key={item.id}
                        id={`cmd-${item.id}`}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onMouseEnter={() => setActive(index)}
                        onClick={() => choose(item)}
                        className={cn("relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm transition-colors", selected ? "text-white" : "text-ink")}
                      >
                        {selected && <motion.span layoutId="cmd-active" className="absolute inset-0 rounded-xl bg-brand-600" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
                        <Icon className={cn("relative h-4 w-4 shrink-0 rtl:rotate-180", selected ? "text-white" : "text-ink-muted")} />
                        <span className="relative flex-1 truncate font-medium">{item.label}</span>
                        {item.hint && <span className={cn("relative truncate text-xs", selected ? "text-white/75" : "text-ink-muted")}>{item.hint}</span>}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4 border-t border-line px-5 py-2.5 text-[11px] text-ink-muted">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-line px-1">↑</kbd>
                <kbd className="rounded border border-line px-1">↓</kbd> {t("to navigate")}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-line px-1">
                  <CornerDownLeft className="inline h-3 w-3" />
                </kbd>{" "}
                {t("to select")}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-line px-1">Esc</kbd> {t("to close")}
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
