import { ArrowDown, ArrowUp, Check, Eye, EyeOff, ExternalLink, FileText, Globe2, PlayCircle, Plus, Rocket, Trash2, Users } from "lucide-react";
import type { CourseMarketplaceSettings, CurriculumSection } from "@educloud/api-client";
import { Badge, Card, Field, Input, Select, Textarea, asKey, buttonClass, cn } from "@educloud/ui";
import { ToastButton } from "@educloud/portal-kit/toast-button";
import { ToastForm } from "@educloud/portal-kit/toast-form";
import { ActionForm } from "./action-form";
import { LectureTypeFields } from "./lecture-type-fields";
import { addLecture, addSection, moveItem, removeLecture, removeSection, renameSection, saveMarketplace, setPublished, toggleLecturePreview } from "@/app/builder-actions";
import { getT } from "@educloud/ui/locale";

const LEARNER_URL = process.env.NEXT_PUBLIC_LEARNER_PORTAL_URL ?? "http://localhost:3004";

const iconButton = "grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition hover:bg-surface-3 hover:text-ink disabled:opacity-30";

/**
 * Turn a class into an online course anyone can buy: landing page, price,
 * curriculum of sections and lectures, and publishing.
 */
export async function CourseBuilder({ courseId, settings, curriculum, students }: { courseId: string; settings: CourseMarketplaceSettings; curriculum: CurriculumSection[]; students: number }) {
  const t = await getT();
  const lectures = curriculum.flatMap((s) => s.lectures);
  const published = settings.marketplace_status === "published";
  const minutes = Math.round(lectures.reduce((s, l) => s + l.duration_seconds, 0) / 60);
  // What a good listing needs. Only the first is required to publish.
  const checks = [
    { label: t("Add at least one lecture"), done: lectures.length > 0, required: true },
    { label: t("Subtitle and description"), done: !!settings.subtitle && !!settings.description },
    { label: t("What learners will learn"), done: (settings.outcomes ?? []).length > 0 },
    { label: t("A free preview lecture"), done: lectures.some((l) => l.is_preview) },
  ];
  const ready = checks.every((c) => !c.required || c.done);

  return (
    <div className="space-y-8">
      {/* Status */}
      <Card className="p-5">
      <div className="flex flex-wrap items-center gap-4">
        <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl", published ? "bg-mint text-brand-700 dark:text-brand-300" : "bg-peach text-brand-700 dark:text-brand-300")}>
          {published ? <Globe2 className="h-6 w-6" /> : <Rocket className="h-6 w-6" />}
        </span>
        <div className="min-w-[14rem] flex-1">
          <p className="flex flex-wrap items-center gap-2 font-semibold">
            {t("Online course")}{" "}<Badge tone={published ? "success" : settings.marketplace_status === "suspended" ? "danger" : "warning"}>{t(asKey(settings.marketplace_status))}</Badge>
          </p>
          <p className="text-sm text-ink-muted">
            {t("{count} sections", { count: curriculum.length })} · {t("{count} lectures", { count: lectures.length })} · {t("{count} min", { count: minutes })} ·{" "}
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> {t("{count} learners", { count: students })}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {settings.slug && (
            <a href={`${LEARNER_URL}/course/${settings.slug}`} target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm")}>
              <ExternalLink className="h-4 w-4" /> {t("View public page")}
            </a>
          )}
          {published || ready ? (
            <ActionForm action={setPublished.bind(null, courseId, !published)} submit={published ? t("Unpublish") : t("Publish course")} className="flex flex-wrap items-center gap-2 space-y-0 [&>[role=alert]]:order-last [&>[role=alert]]:basis-full" submitClassName={published ? "!bg-none !bg-surface-3 !text-ink !shadow-none" : ""}>
              {null}
            </ActionForm>
          ) : (
            <span className={cn(buttonClass("primary"), "pointer-events-none opacity-55")} aria-disabled title={t("Add at least one lecture")}>
              {t("Publish course")}
            </span>
          )}
        </div>
      </div>
      {!published && (
        <ul className="mt-4 grid gap-2 border-t border-line pt-4 sm:grid-cols-2">
          {checks.map((c) => (
            <li key={c.label} className={cn("flex items-center gap-2 text-sm", c.done ? "text-ink-muted" : "text-ink")}>
              <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full", c.done ? "bg-success text-white" : c.required ? "border-2 border-brand-500" : "border-2 border-line")}>
                {c.done && <Check className="h-3 w-3" />}
              </span>
              <span className={cn(c.done && "line-through decoration-ink-muted/40")}>{c.label}</span>
              {c.required && !c.done && <Badge tone="brand">{t("Required")}</Badge>}
            </li>
          ))}
        </ul>
      )}
      </Card>

      <div className="grid grid-cols-1 gap-8 2xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* Landing page & price */}
        <Card className="h-fit p-5 sm:p-6 2xl:order-last">
          <h2 className="mb-1 font-display text-lg font-bold">{t("Landing page & price")}</h2>
          <p className="mb-5 text-sm text-ink-muted">{t("What learners see before they buy.")}</p>
          <ActionForm action={saveMarketplace.bind(null, courseId)} submit={t("Save details")}>
            <label className="flex items-center gap-3 rounded-xl bg-surface-2 p-3 text-sm font-semibold">
              <input type="checkbox" name="is_public" defaultChecked={settings.is_public} className="h-4 w-4 accent-[var(--brand-500)]" />
              {t("List this course on the Manara website")}
            </label>
            <Field label={t("Subtitle")} htmlFor="subtitle">
              <Input id="subtitle" name="subtitle" defaultValue={settings.subtitle ?? ""} maxLength={255} placeholder={t("One line that sells the course")} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("Price (USD)")} htmlFor="price" hint={t("0 makes it free.")}>
                <Input id="price" name="price" type="number" min="0" step="0.01" defaultValue={(settings.price_cents / 100).toFixed(2)} />
              </Field>
              <Field label={t("Category")} htmlFor="category">
                <Input id="category" name="category" defaultValue={settings.category ?? ""} placeholder={t("Science")} />
              </Field>
              <Field label={t("Level")} htmlFor="level">
                <Select id="level" name="level" defaultValue={t(asKey(settings.level))}>
                  <option value="all">{t("All levels")}</option>
                  <option value="beginner">{t("Beginner")}</option>
                  <option value="intermediate">{t("Intermediate")}</option>
                  <option value="advanced">{t("Advanced")}</option>
                </Select>
              </Field>
              <Field label={t("Language")} htmlFor="language">
                <Select id="language" name="language" defaultValue={settings.language}>
                  {[["en", t("English")], ["ar", t("Arabic")], ["fr", t("French")], ["es", t("Spanish")], ["pt", t("Portuguese")], ["zh", t("Chinese")]].map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label={t("Web address")} htmlFor="slug" hint={t("Letters, numbers and dashes. Filled in from the title if empty.")}>
              <Input id="slug" name="slug" defaultValue={settings.slug ?? ""} placeholder={t("my-course")} />
            </Field>
            <Field label={t("What learners will learn")} htmlFor="outcomes" hint={t("One per line.")}>
              <Textarea id="outcomes" name="outcomes" rows={4} defaultValue={(settings.outcomes ?? []).join("\n")} />
            </Field>
            <Field label={t("Requirements")} htmlFor="requirements" hint={t("One per line.")}>
              <Textarea id="requirements" name="requirements" rows={2} defaultValue={(settings.requirements ?? []).join("\n")} />
            </Field>
            <Field label={t("Description")} htmlFor="description">
              <Textarea id="description" name="description" rows={5} defaultValue={settings.description ?? ""} />
            </Field>
          </ActionForm>
        </Card>

        {/* Curriculum: first, since a course needs lectures before anything else matters */}
        <div className="order-first space-y-4 2xl:order-none">
          <div>
            <h2 className="font-display text-lg font-bold">{t("Curriculum")}</h2>
            <p className="text-sm text-ink-muted">{t("Sections hold lectures: upload a video, paste a YouTube/Vimeo/MP4 link, or write an article. Mark a lecture as a free preview to let anyone watch it.")}</p>
          </div>

          {curriculum.map((section, s) => (
            <Card key={section.id} className="p-4">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky text-sm font-bold text-brand-700 dark:text-brand-300">{s + 1}</span>
                <ToastForm action={renameSection.bind(null, courseId, section.id)} className="min-w-0 flex-1">
                  <input name="title" required defaultValue={section.title} aria-label={t("Section title")} title={t("Edit the title and press Enter to save")} className="w-full rounded-lg bg-transparent px-2 py-1 font-semibold outline-none focus:bg-surface-2" />
                </ToastForm>
                <ToastButton action={moveItem.bind(null, courseId, "sections", section.id, "up")} disabled={s === 0} unstyled className={iconButton} label={t("Move section up")}>
                    <ArrowUp className="h-4 w-4" />
                  </ToastButton>
                <ToastButton action={moveItem.bind(null, courseId, "sections", section.id, "down")} disabled={s === curriculum.length - 1} unstyled className={iconButton} label={t("Move section down")}>
                    <ArrowDown className="h-4 w-4" />
                  </ToastButton>
                <ToastButton
                  action={removeSection.bind(null, courseId, section.id)}
                  unstyled
                  className={cn(iconButton, "hover:text-danger")}
                  label={t("Delete section and its lectures")}
                  confirm={{ title: t("Delete the section “{title}”?", { title: section.title }), description: t("Its lectures are deleted too. Learners lose access to them."), confirmLabel: t("Delete") }}
                >
                  <Trash2 className="h-4 w-4" />
                </ToastButton>
              </div>

              <ul className="mt-3 space-y-1.5">
                {section.lectures.map((lecture, l) => (
                  <li key={lecture.id} className={cn("flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm", ["bg-sky/60", "bg-peach/60", "bg-mint/60", "bg-blush/60", "bg-lilac/60"][l % 5])}>
                    {lecture.type === "article" ? <FileText className="h-4 w-4 shrink-0 text-ink-muted" /> : <PlayCircle className="h-4 w-4 shrink-0 text-ink-muted" />}
                    <span className="min-w-0 flex-1 truncate font-medium">{lecture.title}</span>
                    <span className="text-xs text-ink-muted">{t("{count} min", { count: Math.round(lecture.duration_seconds / 60) })}</span>
                    <ToastButton
                      action={toggleLecturePreview.bind(null, courseId, lecture.id, !lecture.is_preview)}
                      unstyled
                      className={cn(iconButton, lecture.is_preview && "text-brand-600 dark:text-brand-300")}
                      label={lecture.is_preview ? t("Free preview (click to turn off)") : t("Make free preview")}
                    >
                      {lecture.is_preview ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </ToastButton>
                    <ToastButton action={moveItem.bind(null, courseId, "lectures", lecture.id, "up")} disabled={l === 0} unstyled className={iconButton} label={t("Move lecture up")}>
                        <ArrowUp className="h-4 w-4" />
                      </ToastButton>
                    <ToastButton action={moveItem.bind(null, courseId, "lectures", lecture.id, "down")} disabled={l === section.lectures.length - 1} unstyled className={iconButton} label={t("Move lecture down")}>
                        <ArrowDown className="h-4 w-4" />
                      </ToastButton>
                    <ToastButton
                      action={removeLecture.bind(null, courseId, lecture.id)}
                      unstyled
                      className={cn(iconButton, "hover:text-danger")}
                      label={t("Delete lecture")}
                      confirm={{ title: t("Delete the lecture “{title}”?", { title: lecture.title }), confirmLabel: t("Delete") }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </ToastButton>
                  </li>
                ))}
              </ul>

              <details className="group mt-3 rounded-xl border border-dashed border-line p-3 open:border-brand-300">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-brand-600 dark:text-brand-300 [&::-webkit-details-marker]:hidden">
                  <Plus className="h-4 w-4" /> {t("Add lecture")}
                </summary>
                <ActionForm action={addLecture.bind(null, courseId, section.id)} submit={t("Add lecture")} className="mt-3" resetOnSuccess>
                  <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
                    <Field label={t("Title")} htmlFor={`title-${section.id}`}>
                      <Input id={`title-${section.id}`} name="title" required />
                    </Field>
                    <Field label={t("Minutes")} htmlFor={`min-${section.id}`}>
                      <Input id={`min-${section.id}`} name="duration_minutes" type="number" min="0" step="1" defaultValue="10" />
                    </Field>
                  </div>
                  <LectureTypeFields idPrefix={section.id} />
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="is_preview" className="h-4 w-4 accent-[var(--brand-500)]" /> {t("Free preview (anyone can watch)")}
                  </label>
                </ActionForm>
              </details>
            </Card>
          ))}

          <Card className="border-dashed p-4">
            <ActionForm action={addSection.bind(null, courseId)} submit={<><Plus className="h-4 w-4" /> {t("Add section")}</>} className="flex flex-wrap items-end gap-3 space-y-0" resetOnSuccess>
              <div className="min-w-0 flex-1">
                <Field label={t("New section")} htmlFor="new-section">
                  <Input id="new-section" name="title" required placeholder={curriculum.length ? t("e.g. Going deeper") : t("e.g. Getting started")} />
                </Field>
              </div>
            </ActionForm>
          </Card>

        </div>
      </div>
    </div>
  );
}
