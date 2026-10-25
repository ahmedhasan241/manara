import { LoginForm } from "@educloud/ui";
import { FlashToast } from "@educloud/portal-kit/flash-toast";
import { login } from "../actions";
import { getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Sign in") };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; switch?: string; suspended?: string; signed_out?: string; expired?: string }>;
}) {
  const t = await getT();
  const { email, switch: switched, suspended, signed_out: signedOut, expired } = await searchParams;
  const notice = suspended
    ? t("This account has been suspended. Contact your school or Manara support.")
    : switched
      ? t("You were signed in with an account that doesn’t belong to this workspace. Please sign in again.")
      : t("Welcome back. Sign in to continue.");

  return (
    <>
      {signedOut && <FlashToast message={t("You've been signed out.")} />}
      {expired && <FlashToast tone="info" message={t("Your session has expired. Please sign in again.")} />}
      <LoginForm action={login} title={t("Sign in to your school")} subtitle={notice} defaultEmail={email} forgotPasswordHref={`${process.env.NEXT_PUBLIC_LEARNER_PORTAL_URL ?? "http://localhost:3004"}/?auth=forgot`} />
    </>
  );
}
