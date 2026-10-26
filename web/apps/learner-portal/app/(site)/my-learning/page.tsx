import Link from "next/link";
import { Award, BookOpen, CheckCircle2, PartyPopper, PlayCircle, Receipt } from "lucide-react";
import { Badge, Character, ContinueCard, EmptyState, FadeIn, ProgressBar, Stagger, Tabs, StaggerItem, asKey, buttonClass, firstName } from "@educloud/ui";
import { AuthRequired } from "@/components/site/auth-required";
import { LearningGoal } from "@/components/site/learning-goal";
import { getViewer } from "@/lib/viewer";
import { getFormat, getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("My learning") };
}

const TABS = [
  ["all", "All courses"],
  ["progress", "In progress"],
  ["completed", "Completed"],
  ["certificates", "Certificates"],
  ["orders", "Purchase history"],
] as const;

export default async function MyLearningPage({ searchParams }: { searchParams: Promise<{ tab?: string; purchased?: string; added?: string }> }) {
  const fmt = await getFormat();
  const t = await getT();
  const { tab = "all", purchased, added } = await searchParams;
  const { api, me } = await getViewer();
  if (!me) return <AuthRequired title={t("Your learning, in one place")} description={t("Sign in to see your courses, pick up where you left off and find your receipts.")} />;

  const [courses, orders, certificates, stats] = await Promise.all([
    api.myLearning(),
    tab === "orders" ? api.orders() : Promise.resolve([]),
    tab === "certificates" ? api.myCertificates() : Promise.resolve([]),
    api.learningStats().catch(() => null),
  ]);
  const percent = (c: (typeof courses)[number]) => (c.progress.total ? Math.round((c.progress.done / c.progress.total) * 100) : 0);
  const shown = courses.filter((c) => (tab === "progress" ? percent(c) > 0 && percent(c) < 100 : tab === "completed" ? percent(c) === 100 : true));
  const resume = courses.find((c) => percent(c) < 100);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <FadeIn className="banner-brand relative mb-8 grid grid-cols-1 items-center gap-6 overflow-hidden rounded-[2rem] p-6 text-white sm:p-10 md:grid-cols-[1fr_11rem]">
        <div aria-hidden className="absolute -end-16 -top-20 h-64 w-64 rounded-full border-[28px] border-white/10" />
        <div className="relative">
          <p className="text-sm font-semibold text-white/80">{t("My learning")}</p>
          <h1 className="mt-1 font-display text-3xl font-bold !text-white sm:text-4xl">{t("Welcome back, {name}", { name: firstName(me.name) })}</h1>
          <p className="mt-2 text-white/85">
            {t("{count} courses", { count: courses.length })} · {t("{count} completed", { count: courses.filter((c) => percent(c) === 100).length })}
          </p>
          {resume && (
            <Link href={`/learn/${resume.slug}`} className="mt-5 inline-flex h-11 max-w-full items-center gap-2 rounded-full bg-brand-400 px-5 font-semibold text-nav shadow-[var(--shadow-soft)] transition hover:bg-brand-300">
              <PlayCircle className="h-5 w-5 shrink-0" /> <span className="truncate">{t("Continue “{title}”", { title: resume.title })}</span>
            </Link>
          )}
        </div>
        <div className="relative hidden md:block">
          <Character variant="laptop" tone={1} hair={1} hairStyle="bun" backdrop="none" />
        </div>
      </FadeIn>

      {stats && courses.length > 0 && <LearningGoal stats={stats} />}

      {(purchased || added) && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-mint px-5 py-4 text-brand-700 dark:text-brand-300">
          <PartyPopper className="h-6 w-6 shrink-0" />
          <p className="font-semibold">{purchased ? t("Payment received. Your new courses are ready below!") : t("Added to your learning. Enjoy!")}</p>
        </div>
      )}

      <Tabs id="my-learning" active={tab} tabs={TABS.map(([key, label]) => ({ key, label: t(label), href: key === "all" ? "/my-learning" : `/my-learning?tab=${key}` }))} />

      {tab === "certificates" ? (
        certificates.length === 0 ? (
          <EmptyState icon={<Award className="h-6 w-6" />} title={t("No certificates yet")} description={t("Finish every lecture of a course to earn its certificate.")} />
        ) : (
          <Stagger className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {certificates.map((c) => (
              <StaggerItem key={c.code}>
                <Link href={`/certificate/${c.code}`} className="group flex h-full flex-col rounded-[1.25rem] border-2 border-[#132544]/70 bg-[#fffdf7] p-5 text-[#132544] shadow-[4px_4px_0_0_var(--brand-700)] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_var(--brand-700)]">
                  <Award className="h-7 w-7 text-brand-600" />
                  <p className="mt-3 font-display text-lg font-bold leading-snug">{c.course_title}</p>
                  <p className="mt-1 text-sm text-[#132544]/65">{fmt.date(c.issued_at, { dateStyle: "long" })}</p>
                  <p className="mt-auto pt-4 font-mono text-xs text-[#132544]/60" dir="ltr">{c.code}</p>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        )
      ) : tab === "orders" ? (
        orders.length === 0 ? (
          <EmptyState icon={<Receipt className="h-6 w-6" />} title={t("No purchases yet")} />
        ) : (
          <div className="overflow-hidden rounded-[1.25rem] border border-line bg-surface shadow-[var(--shadow-soft)]">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-start text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-4 py-3 text-start">{t("Order")}</th>
                  <th className="px-4 py-3 text-start">{t("Courses")}</th>
                  <th className="hidden px-4 py-3 text-start sm:table-cell">{t("Date")}</th>
                  <th className="px-4 py-3 text-end">{t("Total")}</th>
                  <th className="px-4 py-3 text-end">{t("Status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="px-4 py-3 font-mono text-xs">{o.number}</td>
                    <td className="px-4 py-3">{o.items.map((i) => i.title).join(", ")}</td>
                    <td className="hidden px-4 py-3 text-ink-muted sm:table-cell">{fmt.date(o.paid_at ?? o.created_at)}</td>
                    <td className="px-4 py-3 text-end font-semibold">{fmt.exactMoney(o.total_cents, o.currency)}</td>
                    <td className="px-4 py-3 text-end">
                      {o.status === "pending" ? (
                        <Link href={`/checkout/${o.id}`} className="font-semibold text-brand-600 hover:underline dark:text-brand-300">
                          {t("Pay now")}
                        </Link>
                      ) : (
                        <Badge tone={o.status === "paid" ? "success" : "neutral"}>{t(asKey(o.status))}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : shown.length === 0 ? (
        <EmptyState
          icon={tab === "completed" ? <CheckCircle2 className="h-6 w-6" /> : <BookOpen className="h-6 w-6" />}
          title={tab === "completed" ? t("Nothing finished yet") : tab === "progress" ? t("No courses in progress") : t("You haven't started any courses yet")}
          description={t("Find something you love in the catalog: many courses are free.")}
          action={
            <Link href="/explore" className={buttonClass("primary")}>
              {t("Explore courses")}
            </Link>
          }
        />
      ) : (
        <Stagger className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((c) => (
            <StaggerItem key={c.id}>
              <div className="relative">
                <ContinueCard
                  href={`/learn/${c.slug}`}
                  title={c.title}
                  category={c.category}
                  teacher={c.instructor?.name ?? c.organization?.name}
                  done={c.progress.done}
                  total={c.progress.total}
                  progressLabel={percent(c) === 100 ? t("Completed") : t("{percent}% complete · {done}/{total} lectures", { percent: percent(c), done: c.progress.done, total: c.progress.total })}
                />
                {c.source === "enrollment" && <Badge className="absolute start-5 top-5 bg-white/90 text-brand-700">{t("From your school")}</Badge>}
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {tab !== "orders" && courses.length > 0 && (
        <div className="mt-10 rounded-[1.5rem] bg-sky/70 p-6">
          <p className="font-semibold text-heading">{t("Overall progress")}</p>
          <ProgressBar
            value={courses.reduce((s, c) => s + c.progress.done, 0)}
            max={Math.max(1, courses.reduce((s, c) => s + c.progress.total, 0))}
            className="mt-3 h-3"
          />
          <p className="mt-2 text-sm text-ink-muted">
            {t("{done} of {total} lectures done across all your courses.", { done: courses.reduce((s, c) => s + c.progress.done, 0), total: courses.reduce((s, c) => s + c.progress.total, 0) })}
          </p>
        </div>
      )}
    </div>
  );
}
