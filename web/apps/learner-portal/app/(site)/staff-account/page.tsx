import Link from "next/link";
import { redirect } from "next/navigation";
import { UsersRound } from "lucide-react";
import { buttonClass, cn } from "@educloud/ui";
import { getT } from "@educloud/ui/locale";
import { SignOutButton } from "@/components/sign-out-button";
import { getViewer } from "@/lib/viewer";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("This portal is for students and parents"), robots: { index: false } };
}

/**
 * Where teacher and school accounts land if they sign in here. This portal is
 * only for students, learners and parents, so it explains that and offers to
 * sign out, without linking to the staff apps.
 */
export default async function StaffAccountPage() {
  const t = await getT();
  const { me, isStaff } = await getViewer();
  if (!me || !isStaff) redirect(me ? "/dashboard" : "/");

  return (
    <section className="band-peach">
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-20 text-center">
        <span className="mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-brand-600 text-white shadow-[var(--shadow-glow)]">
          <UsersRound className="h-8 w-8" />
        </span>
        <h1 className="font-display text-3xl font-bold tracking-tight">{t("This portal is for students and parents")}</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-muted">{t("You are signed in with a teacher or school account. Sign out, then sign in with a student or parent account to continue.")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <SignOutButton className={cn(buttonClass("primary", "lg"), "rounded-full px-7")} />
          <Link href="/explore" className={cn(buttonClass("secondary", "lg"), "rounded-full px-7")}>
            {t("Explore courses")}
          </Link>
        </div>
      </div>
    </section>
  );
}
