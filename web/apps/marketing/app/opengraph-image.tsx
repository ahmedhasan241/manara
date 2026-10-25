import { ogImage, ogImageSize } from "@educloud/ui/og";

export const alt = "Manara — Classes, grades and live lectures in one place";
export const size = ogImageSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return ogImage({ title: "Classes, grades and live lectures in one place", subtitle: "For teachers, lecturers, schools and universities." });
}
