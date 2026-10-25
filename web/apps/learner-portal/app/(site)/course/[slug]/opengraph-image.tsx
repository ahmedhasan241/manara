import { createClient } from "@educloud/api-client";
import { courseImage, ogImageSize } from "@educloud/ui/og";

export const alt = "Manara course";
export const size = ogImageSize;
export const contentType = "image/png";
export const revalidate = 3600;

/** The share card for a course link (WhatsApp, X, LinkedIn, Slack…). */
export default async function CourseImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const api = createClient({ baseUrl: process.env.API_URL ?? "http://localhost:8001", init: { next: { revalidate: 3600 } } });
  const course = await api.catalogCourse(slug).catch(() => null);
  return courseImage({
    title: course?.title ?? "Manara",
    teacher: [course?.instructor?.name, course?.organization?.name].filter(Boolean).join(" · ") || "Manara",
    label: course?.category ?? "Online course",
  });
}
