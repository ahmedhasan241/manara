import { redirect } from "next/navigation";
import { KeyRound, Palette, UserRound } from "lucide-react";
import { Card, ThemeToggle, buttonClass } from "@educloud/ui";
import { getT } from "@educloud/ui/locale";
import { AccountHeader, SectionTitle } from "@/components/account/account-header";
import { PasswordForm } from "@/components/account/password-form";
import { ProfileForm } from "@/components/account/profile-form";
import { AuthRequired } from "@/components/site/auth-required";
import { SignOutButton } from "@/components/sign-out-button";
import { getViewer } from "@/lib/viewer";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Profile & settings"), robots: { index: false } };
}

/**
 * Profile and password for online learners who don't belong to a school
 * (school students and parents use Settings in their portal, which has more).
 */
export default async function AccountPage() {
  const t = await getT();
  const { me, dashboardUrl, isStaff } = await getViewer();
  if (!me) return <AuthRequired title={t("Sign in to see your profile")} description={t("Your profile, password and preferences live in your account.")} />;
  if (isStaff) redirect("/staff-account");
  if (dashboardUrl) redirect("/settings");

  return (
    <div className="mx-auto max-w-4xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
      <AccountHeader user={me} actions={<SignOutButton className={buttonClass("secondary", "sm")} />} />
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <SectionTitle icon={<UserRound />} title={t("Profile")} description={t("Your name on certificates and reviews, and where you live.")} />
          <ProfileForm user={{ name: me.name, email: me.email, phone: me.phone, country: me.country, city: me.city, area: me.area, locale: me.locale }} />
        </Card>
        <Card>
          <SectionTitle icon={<KeyRound />} title={t("Password")} description={t("Use a password you don't use anywhere else.")} />
          <PasswordForm />
        </Card>
        <Card>
          <SectionTitle icon={<Palette />} title={t("Appearance")} />
          <ThemeToggle />
        </Card>
      </div>
    </div>
  );
}
