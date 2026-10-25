import type { MetadataRoute } from "next";
import { getI18n } from "@educloud/ui/locale";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { t, locale, dir } = await getI18n();
  return {
    lang: locale,
    dir,
    name: "Manara",
    short_name: "Manara",
    description: t("Manara helps teachers, lecturers, schools and universities run classes, grades, attendance and live lectures — with a free portal for students and families."),
    start_url: "/",
    display: "standalone",
    background_color: "#f9f8f5",
    theme_color: "#132544",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
