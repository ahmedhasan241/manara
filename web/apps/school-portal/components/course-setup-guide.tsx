import Link from "next/link";
import { ArrowRight, Check, FolderOpen, Globe2, ListChecks, Rocket, Video, type LucideIcon } from "lucide-react";
import type { LiveLesson } from "@educloud/api-client";
import { Card, ProgressBar, cn } from "@educloud/ui";
import { getContext } from "@educloud/portal-kit/session";
import { getT } from "@educloud/ui/locale";

interface Step {
  key: string;
  label: string;
  hint: string;
  href: string;
  icon: LucideIcon;
  done: boolean;
  optional?: boolean;
}

/**
 * The teacher's checklist for a new course: schedule a lesson, share
 * materials, add an assessment, build an online exam and (optionally) sell it
 * online. Each step links to the tab where it's done; the guide disappears
 * once the required steps are complete.
 */
export async function CourseSetupGuide({ courseId, lessons }: { courseId: string; lessons: LiveLesson[] }) {
  const t = await getT();
  const { api } = await getContext();
  const [materials, assessments, online] = await Promise.all([
    api.materials(courseId).catch(() => []),
    api.assessments(courseId).catch(() => []),
    api.curriculum(courseId).catch(() => null),
  ]);

  const steps: Step[] = [
    { key: "live", label: t("Schedule a live lesson"), hint: t("Students are notified and the recording is added for you."), href: "?tab=live", icon: Video, done: lessons.length > 0 },
    { key: "materials", label: t("Share material"), hint: t("Slides, worksheets and links for the course."), href: "?tab=materials", icon: FolderOpen, done: materials.length > 0 },
    { key: "grades", label: t("Add an assessment"), hint: t("Assignments, quizzes and exams for the gradebook."), href: "?tab=grades", icon: ListChecks, done: assessments.length > 0 },
    { key: "exam", label: t("Build online exam"), hint: t("Turn any assessment into an online exam students take in the learner portal."), href: "?tab=grades", icon: Rocket, done: assessments.some((a) => a.is_online) },
    { key: "online", label: t("Publish course"), hint: t("Optional: sell the course to anyone on the Manara website."), href: "?tab=online", icon: Globe2, done: online?.settings.marketplace_status === "published", optional: true },
  ];
  const required = steps.filter((s) => !s.optional);
  if (required.every((s) => s.done)) return null;
  const done = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);

  return (
    <Card className="mb-6 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <h2 className="font-display font-bold">{t("Set up this course")}</h2>
          <p className="text-sm text-ink-muted">{t("{done} of {total} done", { done, total: steps.length })}</p>
        </div>
        <ProgressBar value={done} max={steps.length} className="h-2 w-full sm:w-48" label={t("{done} of {total} done", { done, total: steps.length })} />
      </div>
      <ol className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
        {steps.map((step, i) => {
          const Icon = step.done ? Check : step.icon;
          const current = step === next;
          return (
            <li key={step.key}>
              <Link
                href={step.href}
                scroll={false}
                className={cn(
                  "group flex h-full gap-3 rounded-xl border p-3 transition",
                  step.done ? "border-transparent bg-success/8" : current ? "border-brand-300 bg-brand-500/8 hover:bg-brand-500/12" : "border-line hover:border-brand-300/70 hover:bg-surface-2",
                )}
              >
                <span
                  className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-bold",
                    step.done ? "bg-success text-white" : current ? "bg-brand-600 text-white" : "bg-surface-3 text-ink-muted",
                  )}
                  aria-hidden
                >
                  {step.done ? <Icon className="h-4 w-4" /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className={cn("flex items-center gap-1 text-sm font-semibold", step.done && "text-ink-muted line-through decoration-ink-muted/40")}>
                    {step.label}
                    {current && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-brand-600 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 dark:text-brand-300" />}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-ink-muted">{step.hint}</span>
                  <span className="sr-only">{step.done ? t("Done") : ""}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
