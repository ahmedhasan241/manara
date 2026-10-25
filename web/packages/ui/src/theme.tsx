"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { MODE_KEY } from "./theme-script";
import { useT } from "./i18n-provider";
import { cn } from "./components";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger, ToggleGroup, ToggleGroupItem } from "./primitives";

export type Mode = "light" | "dark" | "system";

function applyMode(mode: Mode) {
  const dark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

const MODES = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "system", label: "System", Icon: Monitor },
  { value: "dark", label: "Dark", Icon: Moon },
] as const;

/** The saved mode (light / dark / follow the system), applied and kept in sync with the OS. */
export function useMode(): [Mode, (mode: Mode) => void] {
  const [mode, setMode] = useState<Mode>("system");

  useEffect(() => {
    try {
      setMode((localStorage.getItem(MODE_KEY) as Mode | null) ?? "system");
    } catch {}
  }, []);

  useEffect(() => {
    if (mode !== "system") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyMode("system");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [mode]);

  return [
    mode,
    (next) => {
      setMode(next);
      try {
        localStorage.setItem(MODE_KEY, next);
      } catch {}
      applyMode(next);
    },
  ];
}

/** Light / system / dark segmented switch (settings pages, menus). */
export function ThemeToggle({ className }: { className?: string; variant?: "default" | "nav" }) {
  const t = useT();
  const [mode, setMode] = useMode();
  return (
    <ToggleGroup
      type="single"
      value={mode}
      onValueChange={(value) => value && setMode(value as Mode)}
      aria-label={t("Color theme")}
      className={cn("inline-flex gap-0.5 rounded-xl border border-line bg-surface-3 p-0.5", className)}
    >
      {MODES.map(({ value, label, Icon }) => (
        <ToggleGroupItem key={value} value={value} aria-label={t(label)} title={t(label)} className="h-7 w-8 px-0">
          <Icon className="h-3.5 w-3.5" />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/** Header button: the current mode's icon, with a menu to pick light, dark or system. */
export function AppearanceMenu() {
  const t = useT();
  const [mode, setMode] = useMode();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={t("Appearance")} className="grid h-10 w-10 place-items-center rounded-xl text-ink-muted transition hover:bg-surface-3 hover:text-ink data-[state=open]:bg-surface-3 data-[state=open]:text-ink">
        <Sun className="h-[18px] w-[18px] dark:hidden" />
        <Moon className="hidden h-[18px] w-[18px] dark:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-40">
        <DropdownMenuLabel>{t("Appearance")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={mode} onValueChange={(value) => setMode(value as Mode)}>
          {MODES.map(({ value, label, Icon }) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <Icon /> {t(label)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
