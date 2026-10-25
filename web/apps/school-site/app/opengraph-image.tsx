import { ogImage, ogImageSize } from "@educloud/ui/og";

export const alt = "Manara — Your school, online";
export const size = ogImageSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return ogImage({ title: "Your school, online", subtitle: "News, programs and sign-in for students and staff." });
}
