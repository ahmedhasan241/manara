import { Suspense } from "react";
import { MotionProvider } from "@educloud/ui";
import { AuthDialog } from "@/components/site/auth-dialog";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getViewer } from "@/lib/viewer";

/**
 * The public learning website: anyone can browse; buying, watching and
 * "My learning" open the sign-in dialog first.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { me, cart, dashboardUrl } = await getViewer();

  return (
    <MotionProvider>
      <div className="flex min-h-dvh flex-col bg-surface-2">
        <Suspense>
          <SiteHeader user={me ? { name: me.name, email: me.email, country: me.country, city: me.city, area: me.area } : null} cartCount={cart.length} dashboardUrl={dashboardUrl} />
        </Suspense>
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <Suspense>
          <AuthDialog />
        </Suspense>
      </div>
    </MotionProvider>
  );
}
