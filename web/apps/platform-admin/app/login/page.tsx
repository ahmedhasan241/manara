import { LoginForm } from "@educloud/ui";
import { getT } from "@educloud/ui/locale";
import { FlashToast } from "@/components/flash-toast";
import { login } from "../actions";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Sign in") };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ signed_out?: string; expired?: string }> }) {
  const t = await getT();
  const { signed_out: signedOut, expired } = await searchParams;
  return (
    <>
      <LoginForm action={login} forgotPasswordHref={`${process.env.NEXT_PUBLIC_LEARNER_PORTAL_URL ?? "http://localhost:3004"}/?auth=forgot`} title={t("Staff sign in")} subtitle={expired ? t("Your session has expired. Please sign in again.") : t("Manara platform administration.")} />
      {signedOut && <FlashToast message={t("You've been signed out.")} />}
      {expired && <FlashToast tone="info" message={t("Your session has expired. Please sign in again.")} />}
    </>
  );
}
