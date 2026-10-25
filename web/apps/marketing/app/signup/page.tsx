import { BarChart3, CalendarCheck, GraduationCap, HeartHandshake, Video } from "lucide-react";
import { ArchPhoto } from "@educloud/ui";
import { Reveal } from "@educloud/ui/product";
import { signupMetadata } from "@educloud/ui/product/server";
import { getT } from "@educloud/ui/locale";
import { LighthouseBeams } from "@/components/brand-art";
import { SignupForm } from "@/components/signup-form";

export const generateMetadata = signupMetadata;

/** Workspace sign-up on the navy lighthouse band, beside what's included. */
export default async function SignupPage({ searchParams }: { searchParams: Promise<{ plan?: string; type?: string }> }) {
  const { plan, type } = await searchParams;
  const t = await getT();

  return (
    <section className="banner-brand relative isolate overflow-hidden">
      <LighthouseBeams className="-z-10" />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-12 sm:py-16 lg:grid-cols-[1fr_30rem] lg:py-20">
        <Reveal className="hidden text-white lg:block">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-brand-300">{t("Guiding every learner")}</p>
          <h1 className="font-display text-4xl font-bold tracking-tight !text-white">{t("Start your free trial")}</h1>
          <p className="mt-3 text-lg text-nav-muted">{t("14 days free. No credit card needed.")}</p>
          <ul className="mt-8 grid grid-cols-2 gap-3 text-sm">
            {[
              { icon: GraduationCap, text: t("Gradebook & attendance") },
              { icon: Video, text: t("Live lectures & recordings") },
              { icon: HeartHandshake, text: t("Parent portal") },
              { icon: BarChart3, text: t("Analytics") },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-nav-ink">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-400/15 text-brand-300">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
          <ArchPhoto photo="teacher" alt="" className="mt-10 max-w-[16rem]" badge={{ icon: <CalendarCheck className="h-4 w-4" />, title: t("Set up your classroom in five minutes") }} />
        </Reveal>
        <div className="min-w-0">
          <div className="mb-6 text-center lg:hidden">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">{t("Guiding every learner")}</p>
            <h1 className="font-display text-3xl font-bold tracking-tight !text-white">{t("Start your free trial")}</h1>
            <p className="mt-2 text-nav-muted">{t("14 days free. No credit card needed.")}</p>
          </div>
          <SignupForm plan={plan} type={type} />
        </div>
      </div>
    </section>
  );
}
