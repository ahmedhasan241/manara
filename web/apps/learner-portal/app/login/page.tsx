import { redirect } from "next/navigation";
import { ApiError } from "@educloud/api-client";
import { hasSession, serverClient } from "@educloud/api-client/server";
import { getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Sign in") };
}

/**
 * Sign-in happens in the website's dialog. Old links (and portal redirects)
 * land here and are sent to the home page with the dialog open. A portal sends
 * people here when the API answers 401, so a session cookie that no longer
 * works means it expired: the dialog says so.
 */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ switch?: string; suspended?: string; next?: string; expired?: string }> }) {
  const { switch: switched, suspended, next, expired } = await searchParams;
  const t = await getT();
  const target = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  let stale = !!expired;
  if (!stale && !switched && !suspended && (await hasSession())) {
    let signedIn = false;
    try {
      await (await serverClient()).me();
      signedIn = true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) stale = true;
    }
    // Still signed in: nothing to do here.
    if (signedIn) redirect(target);
  }

  const notice = suspended
    ? t("This account has been suspended. Contact your school or Manara support.")
    : switched
      ? t("Please sign in again with the account for this school.")
      : stale
        ? t("Your session has expired. Please sign in again.")
        : undefined;
  const query = new URLSearchParams({ auth: "login", next: target, ...(notice ? { notice } : {}) });
  redirect(`/?${query}`);
}
