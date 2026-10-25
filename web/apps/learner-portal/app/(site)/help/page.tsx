import Link from "next/link";
import { BookOpenCheck, HeartHandshake, Mail, Rocket, ShieldCheck, UserRound } from "lucide-react";
import { ArchPhoto, LogoMark, Swoosh, buttonClass, cn } from "@educloud/ui";
import { getT } from "@educloud/ui/locale";
import { HelpCenter, type HelpTopic } from "@/components/site/help-center";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Help center"), description: t("Answers for students, parents and families.") };
}

/** Help for students, parents and families: browse by topic or search every answer. */
export default async function HelpPage() {
  const t = await getT();

  const topics: HelpTopic[] = [
    {
      id: "start",
      title: t("Getting started"),
      icon: <Rocket />,
      items: [
        { question: t("Is Manara free for students and parents?"), answer: t("Yes. Joining your school's classes and following your child's progress are always free. Some online courses from independent teachers are paid, and you always see the price before you enroll.") },
        { question: t("How do I join my school's classes?"), answer: t("Your school adds you with your email address. Sign in with the details they send you, and your classes, timetable and grades appear on your dashboard.") },
        { question: t("Which devices can I use?"), answer: t("Any modern browser on a phone, tablet or computer, plus the Manara mobile app.") },
      ],
    },
    {
      id: "parents",
      title: t("For parents & families"),
      icon: <HeartHandshake />,
      items: [
        { question: t("How do I follow my child's progress?"), answer: t("Sign in with the parent account your school created. You'll see grades, attendance, homework and live classes for each of your children.") },
        { question: t("I have more than one child. Can I see them all?"), answer: t("Yes. Use the child switcher at the top of the page to move between your children.") },
        { question: t("How do I contact my child's teacher?"), answer: t("Open Messages and start a conversation with any of your child's teachers.") },
      ],
    },
    {
      id: "courses",
      title: t("Courses & certificates"),
      icon: <BookOpenCheck />,
      items: [
        { question: t("Can I watch lessons I missed?"), answer: t("Yes. Recorded live lessons appear in the course under Recordings, and online courses can be watched at any time.") },
        { question: t("How do certificates work?"), answer: t("Finish every lecture of an online course and your certificate is created. Each one has a code anyone can use to check it's genuine.") },
        { question: t("What if a video doesn't play?"), answer: t("Check your connection and choose Try again. If it still doesn't play, open it in a new tab or let your teacher know.") },
      ],
    },
    {
      id: "account",
      title: t("Account & sign-in"),
      icon: <UserRound />,
      items: [
        { question: t("I forgot my password. What do I do?"), answer: t("Choose “Forgot password?” in the sign-in window and we'll email you a link to set a new one.") },
        { question: t("How do I change the language or currency?"), answer: t("Use the globe button at the top of any page. Everything switches straight away, without reloading.") },
        { question: t("Is my information private?"), answer: t("Yes. Students and parents only ever see their own records. Read more on our Security & privacy page.") },
      ],
    },
  ];

  return (
    <>
      <section className="band-peach relative overflow-hidden">
        <div aria-hidden className="absolute -start-20 -top-20 h-64 w-64 rounded-full border-2 border-dashed border-brand-200 dark:border-brand-900" />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 pb-20 pt-16 text-center">
          <LogoMark className="mb-5 h-14 w-14 shadow-[var(--shadow-glow)] [border-radius:14px]" />
          <p className="mb-3 flex flex-col items-center gap-1 text-sm font-semibold text-brand-600 dark:text-brand-300">
            {t("Help center")}
            <Swoosh className="h-2 w-16" />
          </p>
          <h1 className="text-display-lg font-display font-bold">{t("How can we help?")}</h1>
          <p className="mt-3 text-lg text-ink-muted">{t("Answers for students, parents and families.")}</p>
        </div>
      </section>

      <HelpCenter
        topics={topics}
        footer={
          <section className="band-peach grid grid-cols-1 items-center gap-8 overflow-hidden rounded-[2rem] p-8 sm:grid-cols-[1fr_10rem] sm:p-10">
            <div>
              <h2 className="font-display text-2xl font-bold">{t("Still need help?")}</h2>
              <p className="mt-2 text-ink-muted">{t("Your school can help with classes and grades. For anything else, write to us.")}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="mailto:hello@manara.app" className={cn(buttonClass("primary", "lg"), "rounded-full px-6")}>
                  <Mail className="h-4 w-4" /> {t("Email us")}
                </a>
                <Link href="/security" className={cn(buttonClass("secondary", "lg"), "rounded-full px-6")}>
                  <ShieldCheck className="h-4 w-4" /> {t("Security & privacy")}
                </Link>
              </div>
            </div>
            <ArchPhoto photo="parentDaughter" alt="" className="hidden max-w-[10rem] sm:block" />
          </section>
        }
      />
    </>
  );
}
