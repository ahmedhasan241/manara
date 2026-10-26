"use client";

import { Children, Fragment, isValidElement, useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactElement, type ReactNode, type SelectHTMLAttributes } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { PopoverContent, PopoverRoot, PopoverTrigger } from "./primitives";
import { cn } from "./components";
import { useT } from "./i18n-provider";

export interface SelectItem {
  value: string;
  label: string;
  icon?: ReactNode;
  count?: number;
  /** A small coloured dot (statuses). */
  tone?: "danger" | "warning" | "success";
  disabled?: boolean;
  group?: string;
}

const toneDot = { danger: "bg-danger", warning: "bg-warning", success: "bg-success" } as const;

/** The <option>s (and <optgroup>s) a caller passed as children, as plain items. */
function itemsFrom(children: ReactNode, group?: string): SelectItem[] {
  return Children.toArray(children).flatMap((child): SelectItem[] => {
    if (!isValidElement(child)) return [];
    const el = child as ReactElement<{ value?: string | number; children?: ReactNode; disabled?: boolean; label?: string }>;
    if (el.type === Fragment) return itemsFrom(el.props.children, group);
    if (el.type === "optgroup") return itemsFrom(el.props.children, el.props.label);
    if (el.type !== "option") return [];
    const label = Children.toArray(el.props.children).join("");
    return [{ value: String(el.props.value ?? label), label, disabled: el.props.disabled, group }];
  });
}

/** Case-, accent- and Arabic-diacritic-insensitive text for matching. */
function fold(text: string) {
  return text.normalize("NFKD").replace(/[̀-ًͯ-ٰٟـ]/g, "").toLowerCase();
}

type NativeProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "value" | "defaultValue" | "prefix">;

/**
 * Every dropdown in the product: a button that opens a searchable list, with
 * × to clear an optional choice. Takes <option> children like a native
 * select (or `items` with icons and counts), keeps a hidden native <select>
 * so forms submit, validate (`required`) and reset as before, and calls
 * `onChange` with an event whose `target.value` is the new value.
 */
export function Select({
  children,
  items: given,
  value,
  defaultValue,
  onChange,
  name,
  id,
  required,
  disabled,
  className,
  placeholder,
  prefix,
  icon,
  clearable,
  searchable,
  "aria-label": ariaLabel,
  ...rest
}: NativeProps & {
  items?: SelectItem[];
  value?: string | number | readonly string[];
  defaultValue?: string | number | readonly string[];
  /** Shown when nothing is picked and there's no empty option. */
  placeholder?: string;
  /** A label inside the button, e.g. "Status:" in a filter bar. */
  prefix?: ReactNode;
  icon?: ReactNode;
  /** Defaults to true for optional selects that have an empty ("Any…") option. */
  clearable?: boolean;
  /** Defaults to true. */
  searchable?: boolean;
}) {
  const t = useT();
  const items = useMemo(() => given ?? itemsFrom(children), [given, children]);
  const initial = String(defaultValue ?? items.find((i) => !i.disabled)?.value ?? "");
  const [inner, setInner] = useState(initial);
  const current = value !== undefined ? String(value) : inner;
  const selected = items.find((i) => i.value === current);
  const empty = items.find((i) => i.value === "");
  const canClear = (clearable ?? (!required && !!empty)) && current !== "" && !disabled;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const native = useRef<HTMLSelectElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const listId = useId();
  const shown = useMemo(() => (query ? items.filter((i) => fold(i.label).includes(fold(query))) : items), [items, query]);

  // A form reset (after a successful save) goes back to the starting value.
  useEffect(() => {
    const form = native.current?.form;
    if (!form) return;
    const reset = () => setInner(initial);
    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, [initial]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(Math.max(0, items.findIndex((i) => i.value === current)));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function choose(next: string) {
    setOpen(false);
    if (next === current) return;
    if (value === undefined) setInner(next);
    onChange?.({ target: { value: next, name }, currentTarget: { value: next, name } } as unknown as ChangeEvent<HTMLSelectElement>);
  }

  function onKey(event: KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      let next = active;
      for (let n = 0; n < shown.length; n++) {
        next = (next + step + shown.length) % shown.length;
        if (!shown[next]?.disabled) break;
      }
      setActive(next);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = shown[active];
      if (item && !item.disabled) choose(item.value);
    }
  }

  const label = selected?.label ?? placeholder ?? "";
  const muted = !selected || selected.value === "";

  return (
    <div className={cn("relative w-full", className)}>
      {/* The real select: what forms submit and validate; kept under the button so "required" messages point at it. */}
      <select
        ref={native}
        name={name}
        required={required}
        disabled={disabled}
        value={current}
        onChange={() => {}}
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        {...rest}
      >
        {!items.some((i) => i.value === current) && <option value={current} />}
        {items.map((i) => (
          <option key={i.value} value={i.value} disabled={i.disabled}>
            {i.label}
          </option>
        ))}
      </select>
      <PopoverRoot open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            disabled={disabled}
            aria-label={ariaLabel}
            aria-haspopup="listbox"
            aria-expanded={open}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                setOpen(true);
              }
            }}
            className={cn(
              "relative flex h-10 w-full items-center gap-2 rounded-lg border border-line bg-surface ps-3 text-start text-sm text-ink transition hover:border-ink-muted/40 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/15 disabled:cursor-not-allowed disabled:opacity-55",
              canClear ? "pe-16" : "pe-9",
              open && "border-brand-500 ring-3 ring-brand-500/15",
            )}
          >
            {icon && <span className="grid shrink-0 place-items-center text-ink-muted [&_svg]:h-4 [&_svg]:w-4">{icon}</span>}
            {prefix && <span className="shrink-0 text-ink-muted">{prefix}</span>}
            {selected?.icon && <span className="grid shrink-0 place-items-center text-brand-600 dark:text-brand-300 [&_svg]:h-4 [&_svg]:w-4">{selected.icon}</span>}
            <span className={cn("min-w-0 flex-1 truncate", muted ? "text-ink-muted" : prefix && "font-semibold")}>{label}</span>
            <ChevronDown className={cn("pointer-events-none absolute end-3 h-4 w-4 text-ink-muted transition-transform", open && "rotate-180")} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[max(var(--radix-popover-trigger-width),14rem)] p-1.5" onOpenAutoFocus={(event) => searchable === false && event.preventDefault()}>
          {searchable !== false && (
            <div className="relative mb-1.5">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActive(0);
                }}
                onKeyDown={onKey}
                placeholder={t("Search")}
                aria-label={t("Search")}
                aria-controls={listId}
                className="h-9 w-full rounded-lg border border-line bg-surface-2 ps-8 pe-8 text-sm outline-none focus:border-brand-500"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} aria-label={t("Clear search")} className="absolute end-1.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-ink-muted hover:bg-surface-3 hover:text-ink">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
          <ul ref={list} id={listId} role="listbox" aria-label={ariaLabel} className="max-h-64 overflow-y-auto" onKeyDown={onKey}>
            {shown.length === 0 && <li className="px-3 py-6 text-center text-sm text-ink-muted">{t("Nothing found")}</li>}
            {shown.map((item, index) => {
              const isSelected = item.value === current;
              const groupStart = item.group && item.group !== shown[index - 1]?.group;
              return (
                <li key={item.value} role="none">
                  {groupStart && <p className="px-2.5 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-ink-muted">{item.group}</p>}
                  <button
                    type="button"
                    role="option"
                    data-index={index}
                    aria-selected={isSelected}
                    disabled={item.disabled}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => choose(item.value)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start text-sm transition disabled:opacity-40",
                      index === active ? "bg-surface-3" : "",
                      isSelected ? "font-semibold text-brand-700 dark:text-brand-300" : "text-ink",
                    )}
                  >
                    {item.tone && <span className={cn("h-2 w-2 shrink-0 rounded-full", toneDot[item.tone])} aria-hidden />}
                    {item.icon && <span className="grid shrink-0 place-items-center text-ink-muted [&_svg]:h-4 [&_svg]:w-4">{item.icon}</span>}
                    <span className={cn("min-w-0 flex-1 truncate", item.value === "" && !isSelected && "text-ink-muted")}>{item.label}</span>
                    {item.count !== undefined && <span className="rounded-full bg-surface-3 px-1.5 text-xs tabular-nums text-ink-muted">{item.count}</span>}
                    <Check className={cn("h-4 w-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                  </button>
                </li>
              );
            })}
          </ul>
        </PopoverContent>
      </PopoverRoot>
      {canClear && (
        <button
          type="button"
          onClick={() => choose("")}
          aria-label={t("Clear selection")}
          className="absolute end-8 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-ink-muted transition hover:bg-surface-3 hover:text-ink"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
