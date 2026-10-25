import type { Metadata, Viewport } from "next";
import { Logo, MotionProvider, ThemeScript } from "@educloud/ui";
import { SiteHeader } from "@/components/site-header";
import { LOGO_ON_NAVY } from "@/components/brand-art";
import { fontClasses } from "@educloud/ui/fonts";
import { THEME_COLORS, rootMetadata, siteUrl } from "@educloud/ui/seo";
import { portals } from "@/lib/content";
import "./globals.css";
import { I18nRoot, getI18n } from "@educloud/ui/locale";

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getI18n();
  return rootMetadata({
    base: siteUrl(3000),
    locale,
    name: "Manara",
    title: t("Manara — classes, grades and live lectures in one place"),
    description: t("Manara helps teachers, lecturers, schools and universities run classes, grades, attendance and live lectures — with a free portal for students and families."),
    keywords: ["online courses","e-learning","school management","LMS","live lessons","gradebook","attendance","تعليم إلكتروني","دورات أونلاين","إدارة مدرسية"],
  });
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: THEME_COLORS };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { t, locale, dir } = await getI18n();
  return (
    <html lang={locale} dir={dir} className={fontClasses} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-dvh bg-surface">
        <I18nRoot>
        <MotionProvider>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2">
            {t("Skip to content")}
          </a>
          <SiteHeader portals={portals} />
          <main id="main">{children}</main>
          <footer className="bg-nav text-nav-ink">
            <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Logo className={LOGO_ON_NAVY} />
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">{t("Guiding every learner")}</p>
                <p className="mt-3 max-w-xs text-sm text-nav-muted">{t("Classes, grades and live lectures for teachers, schools and universities.")}</p>
              </div>
              <FooterColumn title={t("Product")} links={[[t("Features"), "/#features"], [t("Packages"), "/pricing"], [t("Security"), "/security"]]} />
              <FooterColumn title={t("Sign in")} links={[[t("Staff portal"), `${portals.staff}/login`], [t("Students & parents"), `${portals.learner}/login`]]} />
              <FooterColumn title={t("Company")} links={[[t("Contact"), "mailto:hello@manara.app"], [t("Sales"), "mailto:sales@manara.app"]]} />
            </div>
            <p className="border-t border-white/10 py-6 text-center text-xs text-nav-muted">© {new Date().getFullYear()} Manara</p>
          </footer>
        </MotionProvider>
        </I18nRoot>
      </body>
    </html>
  );
}

function FooterColumn({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-white">{title}</p>
      <ul className="space-y-2 text-sm text-nav-muted">
        {links.map(([label, href]) => (
          <li key={label}>
            <a href={href} className="link-draw hover:text-brand-300">
              {label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
