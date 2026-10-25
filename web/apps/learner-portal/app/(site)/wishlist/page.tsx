import Link from "next/link";
import { Heart } from "lucide-react";
import { EmptyState, MarginNote, Stagger, StaggerItem, buttonClass } from "@educloud/ui";
import { getT } from "@educloud/ui/locale";
import { AuthRequired } from "@/components/site/auth-required";
import { MarketCourseCard } from "@/components/site/market-card";
import { WishlistButton } from "@/components/site/wishlist-button";
import { getViewer } from "@/lib/viewer";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Wishlist") };
}

export default async function WishlistPage() {
  const t = await getT();
  const { api, me } = await getViewer();
  if (!me) return <AuthRequired title={t("Sign in to see your wishlist")} description={t("Save courses you like and come back to them on any device.")} />;

  const courses = await api.wishlist();

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">{t("Wishlist")}</h1>
          <p className="mt-1 text-ink-muted">{t("{count} saved courses", { count: courses.length })}</p>
        </div>
        {courses.length > 0 && <MarginNote className="hidden md:inline-flex">{t("Prices can change, so don't wait too long!")}</MarginNote>}
      </div>

      {courses.length === 0 ? (
        <div className="mt-10">
        <EmptyState
          icon={<Heart className="h-6 w-6" />}
          title={t("Nothing saved yet")}
          description={t("Tap the heart on any course to keep it here for later.")}
          action={<Link href="/explore" className={buttonClass("primary")}>{t("Explore courses")}</Link>}
        />
        </div>
      ) : (
        <Stagger className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <StaggerItem key={course.id} className="relative">
              <MarketCourseCard course={course} />
              <WishlistButton courseId={course.id} saved signedIn className="absolute end-3 top-3 z-10 shadow-[var(--shadow-soft)]" />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}
