import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { ApiError } from "@educloud/api-client";
import { DoodleStar, Logo, LogoMark, Squiggle } from "@educloud/ui";
import { getI18n, getT } from "@educloud/ui/locale";
import { PrintButton } from "@/components/site/print-button";
import { getViewer, formatDuration } from "@/lib/viewer";

async function load(code: string) {
  const { api } = await getViewer();
  return api.verifyCertificate(code).catch((error) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const t = await getT();
  const certificate = await load((await params).code);
  return { title: t("Certificate: {course}", { course: certificate.course_title }), robots: { index: false } };
}

/**
 * A certificate of completion, laid out like paper so it prints well. The
 * same page is the public proof: anyone with the link sees it is genuine.
 */
export default async function CertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { t, fmt } = await getI18n();
  const certificate = await load((await params).code);
  const issuer = [certificate.instructor_name, certificate.organization_name].filter(Boolean).join(" · ");

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6 print:p-0">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1.5 text-sm font-semibold text-success">
          <BadgeCheck className="h-4 w-4" /> {t("Verified by Manara")}
        </p>
        <PrintButton />
      </div>

      <article className="relative overflow-hidden rounded-[1.25rem] [--heading:#132544] border-2 border-[#132544]/80 bg-[#fffdf7] p-2 text-[#132544] shadow-[6px_6px_0_0_var(--brand-700)] print:shadow-none">
        <div className="relative rounded-[0.9rem] border border-dashed border-[#132544]/40 px-6 py-10 text-center sm:px-14 sm:py-14">
          <DoodleStar className="absolute start-6 top-6 h-10 w-10 text-brand-500" />
          <DoodleStar className="absolute bottom-8 end-8 h-7 w-7 rotate-12 text-brand-500" />
          {/* Always the light-mode wordmark: the certificate is paper, in dark mode too. */}
          <div className="flex justify-center"><Logo className="text-lg [&_.text-heading]:!text-[#132544] [&_[dir=ltr]>span:first-child]:!text-brand-600 [&_[lang=ar]]:!text-brand-600" /></div>

          <p className="mt-8 text-xs font-bold uppercase tracking-[0.3em] text-[#132544]/60">{t("Certificate of completion")}</p>
          <p className="mt-6 text-sm text-[#132544]/70">{t("This certifies that")}</p>
          <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">{certificate.recipient_name}</h1>
          <Squiggle className="mx-auto mt-2 max-w-sm text-brand-500" />

          <p className="mt-6 text-sm text-[#132544]/70">{t("has completed every lecture of")}</p>
          <h2 className="mx-auto mt-2 max-w-2xl font-display text-2xl font-bold text-brand-700 sm:text-3xl">{certificate.course_title}</h2>
          {issuer && <p className="mt-3 text-sm text-[#132544]/70">{t("Taught by {issuer}", { issuer })}</p>}

          <dl className="mx-auto mt-10 grid max-w-xl grid-cols-1 gap-4 border-t border-[#132544]/15 pt-6 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-[#132544]/60">{t("Issued")}</dt>
              <dd className="font-semibold">{fmt.date(certificate.issued_at, { dateStyle: "long" })}</dd>
            </div>
            <div>
              <dt className="text-[#132544]/60">{t("Duration")}</dt>
              <dd className="font-semibold">{formatDuration(certificate.duration_seconds, t)}</dd>
            </div>
            <div>
              <dt className="text-[#132544]/60">{t("Certificate no.")}</dt>
              <dd className="font-mono font-semibold" dir="ltr">{certificate.code}</dd>
            </div>
          </dl>

          <div className="absolute end-6 top-6 hidden h-20 w-20 -rotate-12 place-items-center rounded-full border-2 border-dashed border-brand-600 text-brand-700 shadow-[inset_0_0_0_4px_#fffdf7,inset_0_0_0_5px_rgb(156_107_28_/_0.35)] sm:grid" aria-hidden>
            <LogoMark className="h-11 w-11" />
          </div>
        </div>
      </article>

      <p className="mt-6 text-center text-sm text-ink-muted print:hidden">
        {t("Anyone can check this certificate at this address.")}{" "}
        {certificate.course_slug && (
          <Link href={`/course/${certificate.course_slug}`} className="font-semibold text-brand-600 hover:underline dark:text-brand-300">
            {t("View course")}
          </Link>
        )}
      </p>
    </div>
  );
}
