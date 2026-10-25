"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, ArrowUp, ExternalLink, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import type { MarketingContent } from "@educloud/api-client";
import { Alert, Button, Card, ConfirmDialog, Field, Input, LOCALES, Select, Textarea, asKey, cn, useActionToast, useLocale, useT } from "@educloud/ui";
import { resetWebsiteSection, saveWebsiteSection } from "@/app/actions";

type Key = keyof MarketingContent;
type FieldDef = { key: string; label: string; kind: "text" | "long" | "lines" | "select"; options?: string[] };
type SectionDef = { label: string; description: string; list: boolean; fields: FieldDef[]; itemLabel?: string };

const ICONS = ["video", "grades", "attendance", "family", "messages", "analytics", "security", "mobile", "materials", "globe"];

/** How each section of the product website is edited. */
const SECTIONS: Record<Key, SectionDef> = {
  hero: {
    label: "Hero",
    description: "The first thing visitors see.",
    list: false,
    fields: [
      { key: "eyebrow", label: "Small line above the title", kind: "text" },
      { key: "title", label: "Headline", kind: "text" },
      { key: "subtitle", label: "Subtitle", kind: "long" },
      { key: "primary_cta", label: "Main button", kind: "text" },
      { key: "secondary_cta", label: "Second button", kind: "text" },
    ],
  },
  stats: { label: "Stats strip", description: "Short numbers under the hero.", list: true, itemLabel: "Stat", fields: [{ key: "value", label: "Value", kind: "text" }, { key: "label", label: "Label", kind: "text" }] },
  audiences: {
    label: "Who it's for",
    description: "Tabs for teachers & doctors, schools, universities and families.",
    list: true,
    itemLabel: "Audience",
    fields: [
      { key: "key", label: "Key (teacher, school, university, family…)", kind: "text" },
      { key: "title", label: "Title", kind: "text" },
      { key: "subtitle", label: "Subtitle", kind: "long" },
      { key: "benefits", label: "Benefits (one per line)", kind: "lines" },
    ],
  },
  features: {
    label: "Features",
    description: "The feature grid.",
    list: true,
    itemLabel: "Feature",
    fields: [
      { key: "icon", label: "Icon", kind: "select", options: ICONS },
      { key: "title", label: "Title", kind: "text" },
      { key: "body", label: "Description", kind: "long" },
    ],
  },
  testimonials: {
    label: "Testimonials",
    description: "Quotes from teachers, lecturers and parents.",
    list: true,
    itemLabel: "Testimonial",
    fields: [
      { key: "quote", label: "Quote", kind: "long" },
      { key: "name", label: "Name", kind: "text" },
      { key: "role", label: "Role", kind: "text" },
    ],
  },
  faq: { label: "FAQ", description: "Questions on the home and pricing pages.", list: true, itemLabel: "Question", fields: [{ key: "question", label: "Question", kind: "text" }, { key: "answer", label: "Answer", kind: "long" }] },
  cta: {
    label: "Final call to action",
    description: "The banner at the bottom of the home page.",
    list: false,
    fields: [
      { key: "title", label: "Title", kind: "text" },
      { key: "subtitle", label: "Subtitle", kind: "long" },
      { key: "button", label: "Button", kind: "text" },
    ],
  },
};

type Item = Record<string, unknown>;

export function WebsiteEditor({ content, siteUrl }: { content: MarketingContent; siteUrl: string }) {
  const t = useT();
  const locale = useLocale();
  const [active, setActive] = useState<Key>("hero");
  const keys = Object.keys(SECTIONS) as Key[];
  const language = LOCALES.find((l) => l.code === locale)!;

  return (
    <>
    <Alert tone="brand">{t("You're editing the {language} version of the website. Switch the dashboard language to edit another one.", { language: language.name })}</Alert>
    <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[15rem_1fr]">
      <nav aria-label={t("Website sections")} className="lg:sticky lg:top-6 lg:self-start">
        <ul className="flex gap-1 overflow-x-auto lg:flex-col">
          {keys.map((key) => (
            <li key={key}>
              <button
                type="button"
                onClick={() => setActive(key)}
                aria-current={active === key ? "true" : undefined}
                className={cn(
                  "relative w-full whitespace-nowrap rounded-xl px-4 py-2.5 text-start text-sm font-semibold transition-colors",
                  active === key ? "text-white" : "text-ink-muted hover:bg-surface hover:text-ink",
                )}
              >
                {active === key && <motion.span layoutId="website-section" className="absolute inset-0 rounded-xl bg-brand-600" />}
                <span className="relative">{t(asKey(SECTIONS[key].label))}</span>
              </button>
            </li>
          ))}
        </ul>
        <a href={siteUrl} target="_blank" rel="noreferrer" className="mt-4 hidden items-center gap-1.5 px-4 text-sm font-semibold text-brand-600 hover:underline lg:inline-flex">
          {t("View website")}{" "}<ExternalLink className="h-4 w-4" />
        </a>
      </nav>

      <AnimatePresence mode="wait">
        <motion.div key={active} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          <SectionEditor sectionKey={active} initial={content[active]} />
        </motion.div>
      </AnimatePresence>
    </div>
    </>
  );
}

function SectionEditor({ sectionKey, initial }: { sectionKey: Key; initial: MarketingContent[Key] }) {
  const t = useT();
  const def = SECTIONS[sectionKey];
  const [value, setValue] = useState<Item | Item[]>(() => structuredClone(initial) as Item | Item[]);
  const notify = useActionToast();
  const [pending, start] = useTransition();
  const items = def.list ? (value as Item[]) : null;

  function save() {
    start(async () => void notify(await saveWebsiteSection(sectionKey, value as never)));
  }

  function reset() {
    start(async () => void notify(await resetWebsiteSection(sectionKey)));
  }

  const updateItem = (index: number, key: string, v: unknown) =>
    setValue((current) => (current as Item[]).map((item, i) => (i === index ? { ...item, [key]: v } : item)));
  const move = (index: number, by: number) =>
    setValue((current) => {
      const list = [...(current as Item[])];
      const [moved] = list.splice(index, 1);
      list.splice(index + by, 0, moved!);
      return list;
    });

  return (
    <Card>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">{t(asKey(def.label))}</h2>
          <p className="text-sm text-ink-muted">{t(asKey(def.description))}</p>
        </div>
        <div className="flex gap-2">
          <ConfirmDialog title={t("Restore the default text for “{section}”?", { section: t(asKey(def.label)) })} confirmLabel={t("Restore")} onConfirm={reset}>
            <Button variant="ghost" size="sm" disabled={pending}>
              <RotateCcw className="h-4 w-4" /> {t("Default")}
            </Button>
          </ConfirmDialog>
          <Button size="sm" onClick={save} disabled={pending}>
            <Save className="h-4 w-4" /> {pending ? t("Saving…") : t("Save")}
          </Button>
        </div>
      </div>

      {items ? (
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {items.map((item, index) => (
              <motion.div key={index} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="rounded-2xl border border-line bg-surface-2 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                      {t(asKey(def.itemLabel ?? ""))} {index + 1}
                    </span>
                    <div className="flex gap-1">
                      <IconButton label={t("Move up")} disabled={index === 0} onClick={() => move(index, -1)}>
                        <ArrowUp className="h-4 w-4" />
                      </IconButton>
                      <IconButton label={t("Move down")} disabled={index === items.length - 1} onClick={() => move(index, 1)}>
                        <ArrowDown className="h-4 w-4" />
                      </IconButton>
                      <IconButton label={t("Remove")} danger onClick={() => setValue(items.filter((_, i) => i !== index))}>
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {def.fields.map((f) => (
                      <div key={f.key} className={f.kind === "long" || f.kind === "lines" ? "sm:col-span-2" : undefined}>
                        <FieldInput def={f} id={`${sectionKey}-${index}-${f.key}`} value={item[f.key]} onChange={(v) => updateItem(index, f.key, v)} />
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <Button
            variant="soft"
            onClick={() => setValue([...items, Object.fromEntries(def.fields.map((f) => [f.key, f.kind === "lines" ? [] : f.kind === "select" ? f.options![0] : ""]))])}
          >
            <Plus className="h-4 w-4" /> {t("Add")}{" "}{t(asKey(def.itemLabel ?? ""))}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {def.fields.map((f) => (
            <FieldInput key={f.key} def={f} id={`${sectionKey}-${f.key}`} value={(value as Item)[f.key]} onChange={(v) => setValue({ ...(value as Item), [f.key]: v })} />
          ))}
        </div>
      )}
    </Card>
  );
}

function FieldInput({ def, id, value, onChange }: { def: FieldDef; id: string; value: unknown; onChange: (v: unknown) => void }) {
  const t = useT();
  return (
    <Field label={t(asKey(def.label))} htmlFor={id}>
      {def.kind === "long" ? (
        <Textarea id={id} rows={3} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />
      ) : def.kind === "lines" ? (
        <Textarea
          id={id}
          rows={4}
          value={((value as string[] | undefined) ?? []).join("\n")}
          onChange={(e) => onChange(e.target.value.split("\n"))}
          onBlur={(e) => onChange(e.target.value.split("\n").map((l) => l.trim()).filter(Boolean))}
        />
      ) : def.kind === "select" ? (
        <Select id={id} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>
          {def.options!.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      ) : (
        <Input id={id} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />
      )}
    </Field>
  );
}

function IconButton({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn("grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition disabled:opacity-30", danger ? "hover:bg-danger/10 hover:text-danger" : "hover:bg-surface-3 hover:text-ink")}
    >
      {children}
    </button>
  );
}
