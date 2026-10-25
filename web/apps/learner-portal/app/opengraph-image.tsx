import { ogImage, ogImageSize } from "@educloud/ui/og";

export const alt = "Manara — Learn from teachers, doctors and universities";
export const size = ogImageSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return ogImage({ title: "Learn from teachers, doctors and universities", subtitle: "Self-paced courses, live lessons and certificates." });
}
