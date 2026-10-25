import Link from "next/link";
import { Logo } from "@educloud/ui";
import { getT } from "@educloud/ui/locale";

/**
 * Learning, family and help links. This portal is for students, learners and
 * parents only, so nothing here leads to the educator apps.
 */
const COLUMNS = [
  { title: "Learn", links: [["Explore courses", "/explore"], ["Free courses", "/explore?price=free"], ["Teachers & doctors", "/instructors"], ["Institutions", "/institutions"], ["My learning", "/my-learning"]] },
  { title: "Help", links: [["Help center", "/help"], ["For parents & families", "/help#parents"], ["Security & privacy", "/security"], ["Contact", "mailto:hello@manara.app"]] },
  { title: "For parents & families", links: [["Overview", "/dashboard"], ["Live lessons", "/live"], ["Calendar", "/calendar"], ["Messages", "/messages"]] },
] as const;

/** The site footer (dark, like the product website). */
export async function SiteFooter() {
  const t = await getT();
  return (
    <footer className="mt-24 bg-nav text-white">
      <div className="mx-auto grid grid-cols-1 max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-8">
        <div>
          <Logo className="text-lg [&_.text-heading]:!text-white [&_[lang=ar]]:!text-brand-300" />
          <p className="mt-4 max-w-xs text-sm text-white/70">{t("Online courses from teachers, doctors and lecturers, plus everything schools and universities need to teach, in one place.")}</p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="mb-3 text-sm font-semibold">{t(col.title)}</p>
            <ul className="space-y-2 text-sm text-white/70">
              {col.links.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="inline-flex items-center gap-1 transition hover:text-white">
                    {t(label)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-white/50 sm:px-6 lg:px-8">© {new Date().getFullYear()} {t("Manara. Learn anything, from anyone, anywhere.")}</p>
      </div>
    </footer>
  );
}
