import { Character } from "@educloud/ui";
import { ResetPasswordForm } from "@/components/site/reset-password-form";
import { getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Set your password") };
}

/** From the emailed link: invited students, teachers and parents set their password here too. */
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; email?: string }> }) {
  const t = await getT();
  const { token = "", email = "" } = await searchParams;

  return (
    <div className="mx-auto grid grid-cols-1 max-w-4xl items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-2">
      <div className="mx-auto hidden w-64 md:block">
        <Character variant="laptop" tone={2} hair={0} hairStyle="short" backdrop="mint" />
      </div>
      <div className="rounded-[2rem] bg-surface p-6 shadow-[var(--shadow-lift)] sm:p-8">
        <h1 className="font-display text-2xl font-bold">{t("Set your password")}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t("Choose a password for {email}. You'll use it to sign in to Manara.", { email: email || t("your account") })}</p>
        <ResetPasswordForm token={token} email={email} />
      </div>
    </div>
  );
}
