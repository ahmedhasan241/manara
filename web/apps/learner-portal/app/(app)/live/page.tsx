import { Radio, Video } from "lucide-react";
import type { LiveLesson } from "@educloud/api-client";
import { EmptyState, PageHeader, Stagger, StaggerItem } from "@educloud/ui";
import { requireAudience } from "@educloud/portal-kit/session";
import { LessonCard } from "@educloud/portal-kit/lesson-card";
import { getFormat, getT } from "@educloud/ui/locale";
import { LessonPlanPeek } from "@/components/academics/lesson-plan";

export { generateMetadata } from "@educloud/portal-kit/pages/live";

/** Live and upcoming lessons, each with a peek at the teacher's plan. */
export default async function LearnerLivePage() {
  const fmt = await getFormat();
  const t = await getT();
  const { api } = await requireAudience("learner", "/staff-account");
  const lessons = await api.upcomingLessons();

  const live = lessons.filter((l) => l.status === "live");
  const upcoming = lessons.filter((l) => l.status === "scheduled");
  const byDay = Map.groupBy(upcoming, (l) => new Date(l.scheduled_at).toDateString());

  const card = (lesson: LiveLesson) => (
    <StaggerItem key={lesson.id}>
      <div className="relative z-10">
        <LessonCard lesson={lesson} canHost={false} />
      </div>
      <LessonPlanPeek plan={lesson} ended={false} />
    </StaggerItem>
  );

  return (
    <>
      <PageHeader eyebrow={t("Online classroom")} title={t("Live lessons")} description={t("Join lectures from anywhere. Recordings appear on the course page when a lesson ends.")} />

      {live.length > 0 && (
        <section aria-labelledby="live-heading" className="mb-10">
          <h2 id="live-heading" className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-live-600">
            <Radio className="h-5 w-5 animate-pulse" /> {t("Happening now")}
          </h2>
          <Stagger className="grid items-start gap-4 lg:grid-cols-2">{live.map(card)}</Stagger>
        </section>
      )}

      <section aria-labelledby="upcoming-heading">
        <h2 id="upcoming-heading" className="mb-4 font-display text-lg font-bold">
          {t("Coming up")}
        </h2>
        {upcoming.length === 0 ? (
          <EmptyState icon={<Video className="h-6 w-6" />} title={t("No lessons scheduled")} description={t("When your teachers schedule a live lesson, it will appear here.")} />
        ) : (
          <div className="space-y-8">
            {[...byDay.entries()].map(([day, dayLessons]) => (
              <div key={day}>
                <p className="mb-3 text-sm font-semibold text-ink-muted">{fmt.date(day, { weekday: "long", month: "long", day: "numeric" })}</p>
                <Stagger className="grid items-start gap-4 lg:grid-cols-2">{dayLessons.map(card)}</Stagger>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
