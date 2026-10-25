import { ogImage, ogImageSize } from "@educloud/ui/og";

export const alt = "Manara — Teaching, beautifully organised";
export const size = ogImageSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return ogImage({ title: "Teaching, beautifully organised", subtitle: "Classes, grades, attendance and live lessons." });
}
