import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError, createClient, type PublicSite } from "@educloud/api-client";
import { Mail, MapPin, Phone, type LucideIcon } from "lucide-react";
import { ArchPhoto, Card, LogoMark, ScrollHighlight, ScrollProgress, ThemeToggle, WordReveal, buttonClass } from "@educloud/ui";
import { getT } from "@educloud/ui/locale";

export const revalidate = 120;

async function loadSite(slug: string): Promise<PublicSite> {
  try {
    return await createClient({ baseUrl: process.env.API_URL ?? "http://localhost:8001", init: { next: { revalidate: 120, tags: [`site:${slug}`] } } }).site(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const site = await loadSite((await params).slug);
  return { title: site.name, description: site.site.tagline ?? site.site.about?.slice(0, 160) };
}

export default async function SchoolHome({ params }: { params: Promise<{ slug: string }> }) {
  const t = await getT();
  const { slug } = await params;
  const site = await loadSite(slug);
  const accent = site.branding.primary_color ?? "#9c6b1c";
  const portal = process.env.NEXT_PUBLIC_PORTAL_URL ?? "http://localhost:3003";

  return (
    <div style={{ ["--accent" as string]: accent }}>
      <ScrollProgress />
      <header className="scroll-condense sticky top-0 z-40">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <span className="flex min-w-0 items-center gap-2.5 font-semibold">
            {site.branding.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={site.branding.logo_url} alt="" className="h-8 w-8 rounded" />
            ) : (
              <span aria-hidden className="grid h-8 w-8 place-items-center rounded bg-[var(--accent)] text-sm text-white">
                {site.name.charAt(0)}
              </span>
            )}
            <span className="truncate">{site.name}</span>
          </span>
          <nav className="flex shrink-0 items-center gap-3 text-sm sm:gap-5" aria-label={t("Site")}>
            <a href="#about" className="link-draw hidden text-ink-muted hover:text-ink sm:inline">{t("About")}</a>
            <a href="#programs" className="link-draw hidden text-ink-muted hover:text-ink sm:inline">{t("Programs")}</a>
            <a href="#news" className="link-draw hidden text-ink-muted hover:text-ink sm:inline">{t("News")}</a>
            <a href="#contact" className="link-draw hidden text-ink-muted hover:text-ink sm:inline">{t("Contact")}</a>
            <span aria-hidden className="hidden h-6 w-px bg-line sm:block" />
            <ThemeToggle />
            <a href={`${portal}/login`} className={`${buttonClass("primary", "sm")} press`} style={{ background: accent }}>
              {t("Portal sign in")}
            </a>
          </nav>
        </div>
      </header>

      <main>
        <section className="band-peach relative isolate overflow-hidden">
          <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 pb-20 pt-16 sm:pt-20 md:grid-cols-[1.2fr_1fr]">
            <div>
              <span aria-hidden className="reveal-blur mb-8 grid h-16 w-16 place-items-center rounded-2xl bg-[var(--accent)] font-display text-3xl font-bold text-white shadow-[var(--shadow-lift)]">
                {site.name.charAt(0)}
              </span>
              <WordReveal as="h1" text={site.name} stagger={0.08} className="block max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl" />
              <svg aria-hidden viewBox="0 0 120 12" preserveAspectRatio="none" className="mt-3 h-3 w-32 rtl:-scale-x-100">
                <path d="M2 9 C 30 3, 70 2, 118 6" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
              </svg>
              {site.site.tagline && <p className="reveal-blur mt-5 max-w-2xl text-xl text-ink-muted">{site.site.tagline}</p>}
              <div className="mt-10 flex flex-wrap gap-3">
                <a href={`${portal}/login`} className={`${buttonClass("primary", "lg")} press rounded-full px-7`} style={{ background: accent }}>
                  {t("Portal sign in")}
                </a>
                {!!site.site.programs?.length && (
                  <a href="#programs" className={`${buttonClass("secondary", "lg")} press rounded-full px-7`}>
                    {t("Programs")}
                  </a>
                )}
              </div>
            </div>
            <ArchPhoto photo="kidsClass" alt="" className="max-w-[20rem]" />
          </div>
        </section>

        {site.site.about && (
          <section id="about" className="border-t border-line bg-surface-2 py-20">
            <div className="mx-auto max-w-3xl px-4">
              <h2 className="reveal text-sm font-bold uppercase tracking-[0.16em] !text-[var(--accent)]">{t("About us")}</h2>
              {site.site.about.length <= 420 ? (
                <ScrollHighlight text={site.site.about} className="mt-5 text-2xl font-semibold leading-snug text-heading sm:text-3xl" />
              ) : (
                <p className="reveal mt-5 whitespace-pre-line text-lg leading-relaxed text-ink-muted">{site.site.about}</p>
              )}
            </div>
          </section>
        )}

        {!!site.site.programs?.length && (
          <section id="programs" className="mx-auto max-w-5xl px-4 py-20">
            <h2 className="reveal text-2xl font-semibold">{t("Programs")}</h2>
            <div className="reveal-children mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {site.site.programs.map((p, i) => (
                <Card key={p.title} interactive className="group relative overflow-hidden">
                  <span aria-hidden className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-[var(--accent)] transition-transform duration-500 group-hover:scale-x-100 rtl:origin-right" />
                  <span aria-hidden className="font-mono text-xs font-semibold text-[var(--accent)]">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-2 font-semibold">{p.title}</h3>
                  {p.description && <p className="mt-2 text-sm text-ink-muted">{p.description}</p>}
                </Card>
              ))}
            </div>
          </section>
        )}

        {site.news.length > 0 && (
          <section id="news" className="border-t border-line py-20">
            <div className="mx-auto max-w-5xl px-4">
              <h2 className="reveal text-2xl font-semibold">{t("News")}</h2>
              <ul className="rail mt-8 space-y-6">
                {site.news.map((n) => (
                  <li key={n.id} className="reveal relative ps-10">
                    <span aria-hidden className="absolute start-1.5 top-6 z-10 h-3.5 w-3.5 rounded-full border-[3px] border-surface bg-[var(--accent)] ring-1 ring-line" />
                    <Card interactive>
                      <time className="text-xs text-ink-muted" dateTime={n.published_at}>
                        {new Date(n.published_at).toLocaleDateString(site.locale, { dateStyle: "long" })}
                      </time>
                      <h3 className="mt-1 font-semibold">{n.title}</h3>
                      <p className="mt-2 line-clamp-3 text-sm text-ink-muted">{n.body}</p>
                    </Card>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <section id="contact" className="border-t border-line bg-surface-2 py-20">
          <div className="mx-auto max-w-5xl px-4">
            <h2 className="reveal text-2xl font-semibold">{t("Contact")}</h2>
            <dl className="reveal-children mt-8 grid gap-4 sm:grid-cols-3">
              {site.site.contact_email && (
                <ContactCard icon={Mail} label={t("Email")}>
                  <a className="link-draw" href={`mailto:${site.site.contact_email}`}>{site.site.contact_email}</a>
                </ContactCard>
              )}
              {site.site.contact_phone && (
                <ContactCard icon={Phone} label={t("Phone")}>
                  <a className="link-draw" href={`tel:${site.site.contact_phone}`}>{site.site.contact_phone}</a>
                </ContactCard>
              )}
              {site.site.address && (
                <ContactCard icon={MapPin} label={t("Address")}>
                  {site.site.address}
                </ContactCard>
              )}
            </dl>
          </div>
        </section>
      </main>

      <footer className="flex items-center justify-center gap-2 py-8 text-xs text-ink-muted">
        <LogoMark className="h-5 w-5 rounded-[0.3rem]" />
        {t("Powered by Manara")}
      </footer>
    </div>
  );
}

function ContactCard({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <Card interactive className="flex items-start gap-3">
      <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--accent)] text-white">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-ink-muted">{label}</dt>
        <dd className="truncate font-medium">{children}</dd>
      </div>
    </Card>
  );
}
