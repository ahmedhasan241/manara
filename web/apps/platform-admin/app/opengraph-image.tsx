import { ogImage, ogImageSize } from "@educloud/ui/og";

export const alt = "Manara — Manara Admin";
export const size = ogImageSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return ogImage({ title: "Manara Admin", subtitle: "Platform administration." });
}
