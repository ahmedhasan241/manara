import type { Metadata, Viewport } from "next";
import { ThemeScript } from "@educloud/ui";
import { fontClasses } from "@educloud/ui/fonts";
import { THEME_COLORS, rootMetadata, siteUrl } from "@educloud/ui/seo";
import { I18nRoot, getI18n, getRequestLocale } from "@educloud/ui/locale";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getI18n();
  return rootMetadata({
    base: siteUrl(3001),
    locale,
    name: t("Manara Admin"),
    title: t("Manara Admin"),
    description: t("Manara platform administration."),
    index: false,
  });
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: THEME_COLORS };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, dir } = await getRequestLocale();

  return (
    <html lang={locale} dir={dir} className={fontClasses} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-dvh">
        <I18nRoot>{children}</I18nRoot>
      </body>
    </html>
  );
}
