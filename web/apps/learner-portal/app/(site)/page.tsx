import Link from "next/link";
import { ArrowRight, Award, Bell, BookOpen, Building2, CalendarCheck, CheckCircle2, Compass, GraduationCap, HeartHandshake, MessageCircle, NotebookPen, PlayCircle, Radio, Search, Sparkles, Star, Target, Users } from "lucide-react";
import { ArchPhoto, CategoryTile, Scene, CountUp, FadeIn, MarginNote, Marquee, PhotoTile, SectionHeading, Stagger, StaggerItem, Swoosh, asKey, buttonClass, cn, rich } from "@educloud/ui";
import { CourseFilter, HowItWorks } from "@/components/site/landing";
import { InstructorCard } from "@/components/site/instructor-card";
import { MarketCourseCard, OrganizationCard } from "@/components/site/market-card";
import { AuthLink } from "@/components/site/auth-dialog";
import { getViewer } from "@/lib/viewer";
import { getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: { absolute: t("Manara · Learn from teachers, doctors and universities") } };
}

export default async function HomePage() {
  const t = await getT();
  const { api, me } = await getViewer();
  const [stats, categories, popular, free, organizations, instructors] = await Promise.all([
    api.catalogStats(),
    api.catalogCategories(),
    api.catalogCourses({ sort: "popular", per_page: 8 }),
    api.catalogCourses({ price: "free", per_page: 4 }),
    api.catalogOrganizations(),
    api.catalogInstructors().catch(() => []),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="relative -mt-14 overflow-hidden pt-14 sm:-mt-16 sm:pt-16">
        <div aria-hidden className="band-peach absolute inset-0 -z-10" />
        <div aria-hidden className="absolute -start-24 top-1/3 -z-10 h-72 w-72 rounded-full border-2 border-dashed border-brand-200 dark:border-brand-900" />
        <div className="mx-auto grid grid-cols-1 max-w-7xl items-center gap-10 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:px-8 lg:pb-24 lg:pt-16">
          <FadeIn>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-[var(--shadow-soft)] dark:text-brand-200">
              <Sparkles className="h-3.5 w-3.5" /> {t("Online courses + live classes + school tools")}
            </p>
            <h1 className="text-display-lg font-display font-bold">
              {rich(t("<accent>Learn</accent> anything from the best <hl>teachers, doctors & universities</hl>"), { accent: (w) => <span className="text-brand-500">{w}</span>, hl: (w) => <span className="text-marked">{w}</span> })}
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink-muted">
              {t("Self-paced courses from real educators, live lessons with your school, and progress you can see. Start free and learn at your own pace.")}
            </p>
            <form action="/explore" className="mt-8 flex max-w-xl items-center gap-2 rounded-full bg-surface p-2 shadow-[var(--shadow-lift)]">
              <Search className="ms-3 h-5 w-5 shrink-0 text-ink-muted" />
              <input name="search" placeholder={t("What do you want to learn today?")} aria-label={t("Search courses")} className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-muted/70" />
              <button type="submit" className={cn(buttonClass("primary"), "!rounded-full px-6")}>
                {t("Search")}
              </button>
            </form>
            {categories.length > 0 && (
              <div className="mt-4 flex max-w-xl flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold text-ink-muted">{t("Trending:")}</span>
                {categories.slice(0, 5).map((c) => (
                  <Link key={c.name} href={`/explore?category=${encodeURIComponent(c.name)}`} className="press rounded-full border border-brand-200 bg-surface/80 px-3 py-1 font-medium text-ink transition-colors hover:border-brand-400 hover:text-brand-700 dark:border-line dark:hover:text-brand-300">
                    {t(asKey(c.name))}
                  </Link>
                ))}
              </div>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/explore" className={cn(buttonClass("primary", "lg"), "!rounded-full")}>
                {t("Explore courses")}{" "}<ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Link>
              {!me && (
                <AuthLink mode="register" className={cn(buttonClass("secondary", "lg"), "!rounded-full")}>
                  {t("Join for free")}
                </AuthLink>
              )}
              <Link href="/explore?price=free" className="inline-flex items-center gap-2 px-2 text-sm font-semibold text-ink-muted hover:text-ink">
                <PlayCircle className="h-6 w-6 text-accent-500" /> {t("Try a free course")}
              </Link>
            </div>
            <MarginNote arrow="before" className="ms-40 mt-2 hidden sm:inline-flex">{t("Lots of courses are free!")}</MarginNote>
          </FadeIn>

          <FadeIn delay={0.1} className="relative mx-auto w-full max-w-[30rem] px-8 sm:px-12">
            <ArchPhoto photo="studentNotebook" alt="" badge={{ icon: <Star className="h-4 w-4 fill-current" />, title: t("Loved by learners"), body: "4.8 / 5" }} />
            <div className="animate-float absolute start-0 top-[10%] hidden items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-[var(--shadow-lift)] sm:flex">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white">
                <BookOpen className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-display text-lg font-bold leading-none">
                  <CountUp value={stats.courses} />+
                </span>
                <span className="text-xs text-ink-muted">{t("courses to explore")}</span>
              </span>
            </div>
            <div className="animate-float absolute bottom-[8%] start-[-4%] hidden items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-[var(--shadow-lift)] [animation-delay:-3s] sm:flex">
              <span className="flex -space-x-2 rtl:space-x-reverse">
                {[BookOpen, GraduationCap, PlayCircle].map((Icon, i) => (
                  <span key={i} aria-hidden className="grid h-9 w-9 place-items-center rounded-full border-2 border-surface bg-nav-2 text-brand-300">
                    <Icon className="h-4 w-4" />
                  </span>
                ))}
              </span>
              <span>
                <span className="block font-display text-lg font-bold leading-none">
                  <CountUp value={stats.learners} />
                </span>
                <span className="text-xs text-ink-muted">{t("learners enrolled")}</span>
              </span>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Numbers */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative z-10 -mt-8 grid grid-cols-2 gap-4 rounded-[2rem] border border-line bg-surface p-6 shadow-[var(--shadow-lift)] sm:p-8 md:grid-cols-4">
          {[
            { value: stats.courses, label: t("Online courses"), icon: BookOpen, tint: "bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300" },
            { value: stats.instructors, label: t("Teachers & doctors"), icon: GraduationCap, tint: "bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300" },
            { value: stats.organizations, label: t("Schools & universities"), icon: Building2, tint: "bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300" },
            { value: stats.lectures, label: t("Video lectures"), icon: PlayCircle, tint: "bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300" },
          ].map(({ value, label, icon: Icon, tint }) => (
            <div key={label} className="flex items-center gap-3">
              <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl", tint)}>
                <Icon className="h-6 w-6" />
              </span>
              <span>
                <span className="block font-display text-2xl font-bold text-heading">
                  <CountUp value={value} />
                </span>
                <span className="text-xs text-ink-muted sm:text-sm">{label}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h2 className="text-display-md font-display font-bold">
              {rich(t("Choose a <hl>category</hl>"), { hl: (w) => <span className="text-brand-500">{w}</span> })}
            </h2>
            <p className="mt-2 text-ink-muted">{t("From maths and medicine to design and code.")}</p>
          </div>
          <Stagger className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:mx-0 sm:grid sm:overflow-visible sm:px-0 sm:pb-0 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            {categories.map((c) => (
              <StaggerItem key={c.name} className="w-36 shrink-0 snap-start sm:w-auto">
                <CategoryTile href={`/explore?category=${encodeURIComponent(c.name)}`} title={t(asKey(c.name))} iconKey={c.name} count={t("{count} courses", { count: c.courses })} />
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}

      {/* Popular courses */}
      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading title={t("Popular right now")} description={t("What learners are taking this month.")} href="/explore" linkLabel={t("See all")} />
        <CourseFilter items={popular.data.map((course) => ({ id: course.id, category: course.category, card: <MarketCourseCard course={course} /> }))} />
      </section>

      {/* How it works */}
      <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="mb-2 flex flex-col items-center gap-1 text-sm font-semibold text-brand-600 dark:text-brand-300">
            {t("How it works")}
            <Swoosh className="h-2 w-16" />
          </p>
          <h2 className="text-display-md font-display font-bold">{rich(t("Learning made <hl>simple</hl>"), { hl: (w) => <span className="text-marked">{w}</span> })}</h2>
        </div>
        <HowItWorks
          steps={[
            { icon: <Compass />, title: t("Find your course"), body: t("Search by subject, level or teacher, and watch free previews first.") },
            { icon: <PlayCircle />, title: t("Learn at your pace"), body: t("Watch lessons, take notes and pick up where you left off on any device.") },
            { icon: <Award />, title: t("Earn your certificate"), body: t("Finish every lecture to get a certificate you can share.") },
          ]}
        />
      </section>

      {/* Parents & families */}
      <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
          <FadeIn className="relative px-8 sm:px-12">
            <ArchPhoto photo="parentChild" alt="" badge={{ icon: <HeartHandshake className="h-4 w-4" />, title: t("For parents & families") }} />
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
              <Users className="h-4 w-4" /> {t("For parents & families")}
            </p>
            <h2 className="text-display-md font-display font-bold">{rich(t("Stay close to your child's <hl>learning</hl>"), { hl: (w) => <span className="text-marked">{w}</span> })}</h2>
            <ul className="reveal-children mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { icon: CalendarCheck, text: t("See grades, attendance and homework as soon as teachers post them.") },
                { icon: MessageCircle, text: t("Message teachers safely, right from your phone.") },
                { icon: Bell, text: t("Get a reminder before every live class.") },
                { icon: Users, text: t("Switch between your children in one tap.") },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-soft)]">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm leading-relaxed">{text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              {me ? (
                <Link href="/dashboard" className={cn(buttonClass("primary", "lg"), "!rounded-full")}>
                  {t("Open the family portal")}{" "}<ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </Link>
              ) : (
                <AuthLink mode="login" className={cn(buttonClass("primary", "lg"), "!rounded-full")}>
                  {t("Open the family portal")}{" "}<ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </AuthLink>
              )}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* What learners get */}
      <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-display-md font-display font-bold">{rich(t("Everything you need to <hl>learn well</hl>"), { hl: (w) => <span className="text-marked">{w}</span> })}</h2>
        </div>
        <Stagger className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: NotebookPen, title: t("Notes with timestamps"), body: t("Jump back to the exact moment you wrote them.") },
            { icon: Award, title: t("Certificates you can share"), body: t("Every finished course earns a certificate anyone can verify.") },
            { icon: Radio, title: t("Live classes"), body: t("Join your school's lessons and catch up on recordings.") },
            { icon: Target, title: t("Weekly learning goals"), body: t("Set a goal and keep your streak going.") },
          ].map(({ icon: Icon, title, body }) => (
            <StaggerItem key={title} className="lift group h-full rounded-[var(--radius-card)] bg-brand-50 p-6 dark:bg-surface">
              <span className="mb-5 grid h-12 w-12 place-items-center rounded-full bg-surface text-brand-500 shadow-[var(--shadow-soft)] transition-all duration-300 group-hover:-rotate-6 group-hover:bg-brand-600 group-hover:text-white">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="font-display text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{body}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* Free courses */}
      {free.data.length > 0 && (
        <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading title={t("Start for free")} description={t("No card needed. Enroll and start learning in seconds.")} href="/explore?price=free" linkLabel={t("All free courses")} />
          <Stagger className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:mx-0 sm:grid sm:overflow-visible sm:px-0 sm:pb-0 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            {free.data.map((course) => (
              <StaggerItem key={course.id} className="w-[80vw] max-w-xs shrink-0 snap-start sm:w-auto sm:max-w-none">
                <MarketCourseCard course={course} />
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}

      {/* Teachers & doctors */}
      {instructors.length > 0 && (
        <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading title={t("Teachers & doctors to learn from")} description={t("Every course comes with a real person behind it.")} href="/instructors" linkLabel={t("All teachers")} />
          <Stagger className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
            {instructors.slice(0, 4).map((instructor) => (
              <StaggerItem key={instructor.id} className="w-[75vw] max-w-xs shrink-0 snap-start sm:w-auto sm:max-w-none">
                <InstructorCard instructor={instructor} />
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}

      {/* Institutions */}
      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading title={t("Learn with schools & universities")} description={t("Every course comes from a real educator or institution.")} href="/institutions" linkLabel={t("All institutions")} />
        <Marquee className="py-2">
          {organizations.map((org) => (
            <div key={org.slug} className="w-72 shrink-0 px-2">
              <OrganizationCard org={org} />
            </div>
          ))}
        </Marquee>
      </section>

      {/* Call to action */}
      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="banner-brand relative grid grid-cols-1 items-center gap-6 overflow-hidden rounded-[2.5rem] p-8 text-white sm:p-12 md:grid-cols-[1fr_16rem]">
          <div aria-hidden className="absolute -end-20 -top-24 h-72 w-72 rounded-full border-[36px] border-white/10" />
          <div className="relative">
            <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              <Star className="h-3.5 w-3.5 fill-brand-300 text-brand-300" /> {t("Rated by real learners")}
            </p>
            <h2 className="font-display text-3xl font-bold !text-white sm:text-4xl">{t("Your next skill is one lesson away.")}</h2>
            <p className="mt-3 max-w-xl text-white/85">{t("Create a free account to save courses, track your progress and pick up where you left off on any device.")}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {me ? (
                <Link href="/my-learning" className="inline-flex h-12 items-center gap-2 rounded-full bg-brand-400 px-6 font-semibold text-nav shadow-[var(--shadow-soft)] transition hover:bg-brand-300">
                  {t("Go to my learning")}{" "}<ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </Link>
              ) : (
                <AuthLink mode="register" className="inline-flex h-12 items-center gap-2 rounded-full bg-brand-400 px-6 font-semibold text-nav shadow-[var(--shadow-soft)] transition hover:bg-brand-300">
                  {t("Create free account")}{" "}<ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </AuthLink>
              )}
              <Link href="/explore" className="inline-flex h-12 items-center rounded-full border border-white/50 px-6 font-semibold hover:bg-white/10">
                {t("Browse courses")}
              </Link>
            </div>
          </div>
          <div className="relative mx-auto hidden w-52 md:block">
            <div className="aspect-[4/5] w-full overflow-hidden rounded-t-full rounded-b-[2rem] border-4 border-white/30 shadow-xl">
              <Scene name="campus" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
