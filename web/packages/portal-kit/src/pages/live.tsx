import { Radio, Video } from "lucide-react";
import Link from "next/link";
import { Alert, EmptyState, PageHeader, Stagger, StaggerItem } from "@educloud/ui";
import { getContext } from "../session";
import { LessonCard } from "../lesson-card";
import { ScheduleLessonLink } from "../schedule-lesson-form";
import { getFormat, getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Live lessons") };
}

export default async function LivePage() {
  const fmt = await getFormat();
  const t = await getT();
  const { api, can } = await getContext();
  const canHost = can("courses.manage");
  // Owners and admins can see the package; teachers can't (and get the reason when they try to start).
  const [lessons, billing] = await Promise.all([api.upcomingLessons(), can("tenant.manage") ? api.billing().catch(() => null) : null]);

  const live = lessons.filter((l) => l.status === "live");
  const upcoming = lessons.filter((l) => l.status === "scheduled");
  const byDay = Map.groupBy(upcoming, (l) => new Date(l.scheduled_at).toDateString());

  return (
    <>
      <PageHeader
        icon={<Video />}
        eyebrow={t("Online classroom")}
        title={t("Live lessons")}
        description={t("Join lectures from anywhere. Recordings appear on the course page when a lesson ends.")}
        actions={canHost && <ScheduleLessonLink />}
      />

      {billing && !billing.video_meetings && (
        <div className="mb-8">
          <Alert tone="warning">
            {t("Your package doesn't include video meetings, so live lessons can't be scheduled or started.")}{" "}
            <Link href="/billing" className="font-semibold underline underline-offset-2">
              {t("Add video meetings")}
            </Link>
          </Alert>
        </div>
      )}

      {live.length > 0 && (
        <section aria-labelledby="live-heading" className="mb-10">
          <h2 id="live-heading" className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-live-600">
            <Radio className="h-5 w-5 animate-pulse" /> {t("Happening now")}
          </h2>
          <Stagger className="grid gap-4 lg:grid-cols-2">
            {live.map((lesson) => (
              <StaggerItem key={lesson.id}>
                <LessonCard lesson={lesson} canHost={canHost} />
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}

      <section aria-labelledby="upcoming-heading">
        <h2 id="upcoming-heading" className="mb-4 font-display text-lg font-bold">
          {t("Coming up")}
        </h2>
        {upcoming.length === 0 ? (
          <EmptyState
            icon={<Video className="h-6 w-6" />}
            title={t("No lessons scheduled")}
            description={canHost ? t("Schedule your first live lesson above. Students will be notified right away.") : t("When your teachers schedule a live lesson, it will appear here.")}
          />
        ) : (
          <div className="space-y-8">
            {[...byDay.entries()].map(([day, dayLessons]) => (
              <div key={day}>
                <p className="mb-3 text-sm font-semibold text-ink-muted">
                  {fmt.date(day, { weekday: "long", month: "long", day: "numeric" })}
                </p>
                <Stagger className="grid gap-4 lg:grid-cols-2">
                  {dayLessons.map((lesson) => (
                    <StaggerItem key={lesson.id}>
                      <LessonCard lesson={lesson} canHost={canHost} />
                    </StaggerItem>
                  ))}
                </Stagger>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
